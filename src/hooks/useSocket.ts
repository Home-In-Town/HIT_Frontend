'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/lib/authContext';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🟢 Socket connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔴 Socket disconnected');
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
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
  };
}
