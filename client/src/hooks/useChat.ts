import { useState, useCallback, useEffect, useRef } from 'react';
import type { DrawingPayload } from './useDrawing';

export interface ChatMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'ai' | 'system';
  content: string;
  created_at: string;
}

export interface ToolEvent {
  toolName: string;
  args?: Record<string, unknown>;
  done: boolean;
}

export interface Conversation {
  id: number;
  draft_id: number;
  title: string | null;
  created_at: string;
}

const STREAMING_MSG_ID = -1;

export function useChat(draftId: number | null) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [wsReady, setWsReady] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const streamBuf = useRef('');

  useEffect(() => {
    setConversation(null);
    setMessages([]);
    setToolEvents([]);
  }, [draftId]);

  useEffect(() => {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}/ws`;
    console.log('[useChat] connecting to', url);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[useChat] WS open');
      setWsReady(true);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log('[useChat] WS message:', msg.type, msg);

      switch (msg.type) {
        case 'thinking': {
          setIsThinking(true);
          break;
        }
        case 'tool_start': {
          setIsThinking(false);
          setToolEvents((prev) => [...prev, {
            toolName: msg.toolName,
            args: msg.args,
            done: false,
          }]);
          break;
        }
        case 'tool_end': {
          setToolEvents((prev) =>
            prev.map((t) =>
              t.toolName === msg.toolName && !t.done ? { ...t, done: true } : t,
            ),
          );
          break;
        }
        case 'chunk': {
          setIsThinking(false);
          streamBuf.current += msg.content;
          const content = streamBuf.current;
          setIsStreaming(true);
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === STREAMING_MSG_ID);
            const streamMsg: ChatMessage = {
              id: STREAMING_MSG_ID,
              conversation_id: 0,
              role: 'ai',
              content,
              created_at: new Date().toISOString(),
            };
            if (idx === -1) return [...prev, streamMsg];
            const next = [...prev];
            next[idx] = streamMsg;
            return next;
          });
          break;
        }
        case 'ai_done': {
          streamBuf.current = '';
          setIsStreaming(false);
          setIsThinking(false);
          setToolEvents([]);
          setMessages((prev) =>
            prev.map((m) => (m.id === STREAMING_MSG_ID ? msg.message : m)),
          );
          break;
        }
        case 'rebuild_complete': {
          setIsSending(false);
          break;
        }
        case 'error': {
          streamBuf.current = '';
          setIsStreaming(false);
          setIsThinking(false);
          setIsSending(false);
          setToolEvents([]);
          break;
        }
      }
    };

    ws.onclose = (e) => {
      console.log('[useChat] WS close', e.code, e.reason);
      if (wsRef.current === ws) {
        wsRef.current = null;
        setWsReady(false);
      }
    };

    ws.onerror = (e) => {
      console.error('[useChat] WS error', e);
      if (wsRef.current === ws) setWsReady(false);
    };

    return () => {
      console.log('[useChat] cleanup, closing WS');
      ws.close();
    };
  }, []);

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

  const sendMessage = useCallback(async (content: string, drawing?: DrawingPayload): Promise<void> => {
    console.log('[useChat] sendMessage called', {
      content,
      hasDrawing: !!drawing,
      draftId,
      hasWs: !!wsRef.current,
      readyState: wsRef.current?.readyState,
      wsReady,
    });
    if (!draftId) {
      console.warn('[useChat] sendMessage aborted: no draftId');
      return;
    }
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[useChat] sendMessage aborted: WS not open', wsRef.current?.readyState);
      return;
    }

    setIsSending(true);
    setIsThinking(true);
    setToolEvents([]);
    streamBuf.current = '';

    let convo: Conversation;
    try {
      convo = await ensureConversation();
      console.log('[useChat] got conversation', convo);
    } catch (err) {
      console.error('[useChat] ensureConversation failed', err);
      setIsSending(false);
      setIsThinking(false);
      return;
    }

    setMessages((prev) => [...prev, {
      id: -(Date.now() + Math.random()),
      conversation_id: convo.id,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }]);

    const payload: Record<string, unknown> = { type: 'send_message', conversationId: convo.id, content };
    if (drawing) payload.drawing = drawing;
    console.log('[useChat] sending WS message', { ...payload, drawing: drawing ? '[png]' : undefined });
    wsRef.current.send(JSON.stringify(payload));
  }, [draftId, ensureConversation, wsReady]);

  return { messages, toolEvents, sendMessage, isSending, isStreaming, isThinking, wsReady, conversation };
}
