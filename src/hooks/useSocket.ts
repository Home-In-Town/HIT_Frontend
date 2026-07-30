'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/authContext';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';

/**
 * Helper to read a cookie value by name (for passing token explicitly to socket auth).
 */
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    const token = getCookie('token');

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      // Start with polling (reliably sends cookies), then upgrade to websocket
      transports: ['polling', 'websocket'],
      autoConnect: true,
      // Pass token explicitly so the server auth middleware can use it
      // even when cookies aren't forwarded on the WebSocket upgrade request
      auth: {
        token,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🟢 Socket connected');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('🔴 Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      // If auth failed, don't keep retrying with a bad/missing token
      if (err.message === 'Authentication required' || err.message === 'Invalid authentication token') {
        socket.disconnect();
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [user]);

  const joinChat = useCallback((sessionId: string) => {
    socketRef.current?.emit('join_chat', sessionId);
  }, []);

  const leaveChat = useCallback((sessionId: string) => {
    socketRef.current?.emit('leave_chat', sessionId);
  }, []);

  const sendMessage = useCallback((data: {
    sessionId: string;
    content: string;
    messageType?: string;
  }) => {
    socketRef.current?.emit('send_message', data);
  }, []);

  const sendTyping = useCallback((sessionId: string, isTyping: boolean) => {
    socketRef.current?.emit('typing', { sessionId, isTyping });
  }, []);

  const markRead = useCallback((sessionId: string) => {
    socketRef.current?.emit('mark_read', { sessionId });
  }, []);

  const onMessage = useCallback((handler: (msg: any) => void) => {
    socketRef.current?.on('receive_message', handler);
    return () => {
      socketRef.current?.off('receive_message', handler);
    };
  }, []);

  const onNotification = useCallback((handler: (notification: any) => void) => {
    socketRef.current?.on('notification', handler);
    return () => {
      socketRef.current?.off('notification', handler);
    };
  }, []);

  const onTyping = useCallback((handler: (data: { userId: string; name: string; isTyping: boolean }) => void) => {
    socketRef.current?.on('user_typing', handler);
    return () => {
      socketRef.current?.off('user_typing', handler);
    };
  }, []);

  const onMessagesRead = useCallback((handler: (data: { userId: string }) => void) => {
    socketRef.current?.on('messages_read', handler);
    return () => {
      socketRef.current?.off('messages_read', handler);
    };
  }, []);

  // ── Group Chat Socket Methods ──────────────────────────

  const joinGroup = useCallback((roomId: string) => {
    socketRef.current?.emit('join_group', roomId);
  }, []);

  const leaveGroup = useCallback((roomId: string) => {
    socketRef.current?.emit('leave_group', roomId);
  }, []);

  const sendGroupMessage = useCallback((data: {
    roomId: string;
    messageType: 'text' | 'inventory_card' | 'requirement_card';
    content?: string;
    inventoryCard?: any;
    requirementCard?: any;
  }) => {
    socketRef.current?.emit('group_send_message', data);
  }, []);

  const sendGroupTyping = useCallback((roomId: string, isTyping: boolean) => {
    socketRef.current?.emit('group_typing', { roomId, isTyping });
  }, []);

  const onGroupMessage = useCallback((handler: (msg: any) => void) => {
    socketRef.current?.on('group_message', handler);
    return () => {
      socketRef.current?.off('group_message', handler);
    };
  }, []);

  const onGroupTyping = useCallback((handler: (data: { userId: string; name: string; isTyping: boolean }) => void) => {
    socketRef.current?.on('group_user_typing', handler);
    return () => {
      socketRef.current?.off('group_user_typing', handler);
    };
  }, []);

  const onMatchResults = useCallback((handler: (data: { messageId: string; roomId: string; matches: any[] }) => void) => {
    socketRef.current?.on('match_results', handler);
    return () => {
      socketRef.current?.off('match_results', handler);
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    joinChat,
    leaveChat,
    sendMessage,
    sendTyping,
    markRead,
    onMessage,
    onNotification,
    onTyping,
    onMessagesRead,
    // Group chat
    joinGroup,
    leaveGroup,
    sendGroupMessage,
    sendGroupTyping,
    onGroupMessage,
    onGroupTyping,
    onMatchResults,
  };
}
