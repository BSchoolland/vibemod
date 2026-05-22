import { useEffect, useRef, useCallback, useState } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const streamBufferRef = useRef('');

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/chat`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'status':
          setIsAiThinking(true);
          streamBufferRef.current = '';
          break;

        case 'ai-stream':
          streamBufferRef.current += data.content;
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === 'ai' && last.id === 'streaming') {
              return [
                ...prev.slice(0, -1),
                { ...last, content: streamBufferRef.current },
              ];
            }
            return [
              ...prev,
              {
                id: 'streaming',
                role: 'ai',
                content: streamBufferRef.current,
                timestamp: Date.now(),
              },
            ];
          });
          break;

        case 'ai-done':
          setIsAiThinking(false);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.id === 'streaming') {
              return [
                ...prev.slice(0, -1),
                { ...last, id: `ai-${Date.now()}` },
              ];
            }
            return prev;
          });
          streamBufferRef.current = '';
          break;

        case 'error':
          setIsAiThinking(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: 'system',
              content: data.content,
              timestamp: Date.now(),
            },
          ]);
          break;
      }
    };

    return () => ws.close();
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      },
    ]);

    wsRef.current.send(JSON.stringify({ type: 'chat', content }));
  }, []);

  return { messages, sendMessage, isConnected, isAiThinking };
}
