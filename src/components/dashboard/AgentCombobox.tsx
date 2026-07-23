'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Agent } from '@/types/project';

interface AgentComboboxProps {
  agents: Agent[];
  isLoading: boolean;
  onSelect: (agent: Agent | null) => void;
  onClose: () => void;
  triggerEl: HTMLButtonElement | null;
}

export default function AgentCombobox({ agents, isLoading, onSelect, onClose, triggerEl }: AgentComboboxProps) {
  const [searchText, setSearchText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (triggerEl) {
      const rect = triggerEl.getBoundingClientRect();
      setPosition({
        top: rect.top + rect.height + 4,
        left: rect.left,
      });
    }
  }, [triggerEl]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        triggerEl &&
        !triggerEl.contains(event.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, triggerEl]);

  // Reposition on scroll/resize so it stays anchored to the trigger
  useEffect(() => {
    if (!triggerEl) return;

    function updatePosition() {
      if (triggerEl) {
        const rect = triggerEl.getBoundingClientRect();
        setPosition({
          top: rect.top + rect.height + 4,
          left: rect.left,
        });
      }
    }

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [triggerEl]);

  const filteredAgents = searchText.trim()
    ? agents.filter(a => a.name.toLowerCase().includes(searchText.toLowerCase()))
    : agents;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 w-56 bg-white border border-[#E7E5E4] rounded-2xl shadow-2xl overflow-hidden whitespace-normal flex flex-col"
      style={{ top: position.top, left: position.left }}
    >
      {/* Search input */}
      <div className="p-2">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search agent..."
          autoFocus
          className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl text-sm text-[#2A2A2A] placeholder-[#A8A29E] outline-none focus:border-[#B45309] transition-colors"
        />
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-[#E7E5E4] border-t-[#B45309] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto flex flex-col">
          {/* None option (unassign) */}
          <button
            onClick={() => onSelect(null)}
            className="block w-full px-4 py-2.5 text-sm font-medium text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309] text-left transition-colors border-b border-[#E7E5E4]"
          >
            None
          </button>

          {/* Agent list */}
          {filteredAgents.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#A8A29E] italic">No agents found</div>
          ) : (
            filteredAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onSelect(agent)}
                className="block w-full px-4 py-2.5 text-sm font-medium text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309] text-left transition-colors"
              >
                {agent.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
