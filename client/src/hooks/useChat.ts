import { useState, useCallback, useEffect, useRef } from 'react';

export interface ChatMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'ai' | 'system';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: number;
  draft_id: number;
  title: string | null;
  created_at: string;
}

const POLL_INTERVAL = 2000;

export function useChat(draftId: number | null, onPoll?: () => void) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setConversation(null);
    setMessages([]);
  }, [draftId]);

  const ensureConversation = useCallback(async (): Promise<Conversation> => {
    if (conversation) return conversation;

    const res = await fetch('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setConversation(data.conversation);
    return data.conversation;
  }, [conversation]);

  const fetchMessages = useCallback(async (convoId: number) => {
    try {
      const res = await fetch(`/api/chat/conversations/${convoId}/messages`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      // ignore poll errors
    }
  }, []);

  const startPolling = useCallback((convoId: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchMessages(convoId);
      onPoll?.();
    }, POLL_INTERVAL);
  }, [fetchMessages, onPoll]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return stopPolling;
  }, [stopPolling]);

  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!draftId) return;

    const convo = await ensureConversation();
    setIsSending(true);

    setMessages(prev => [...prev, {
      id: -Date.now(),
      conversation_id: convo.id,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }]);

    startPolling(convo.id);

    try {
      const res = await fetch(`/api/chat/conversations/${convo.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } finally {
      stopPolling();
      await fetchMessages(convo.id);
      setIsSending(false);
    }
  }, [draftId, ensureConversation, startPolling, stopPolling, fetchMessages]);

  return { messages, sendMessage, isSending, conversation };
}
