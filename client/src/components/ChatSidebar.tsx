import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { ChatMessage } from '@/hooks/useWebSocket';
import type { Draft } from '@/hooks/useDrafts';

interface ChatSidebarProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  isConnected: boolean;
  isAiThinking: boolean;
  activeDraft: Draft | null;
  isLoading: boolean;
  onCreateDraft: () => void;
  onPublish: () => void;
  onRebuild: () => void;
}

export function ChatSidebar({
  messages,
  onSend,
  isConnected,
  isAiThinking,
  activeDraft,
  isLoading,
  onCreateDraft,
  onPublish,
  onRebuild,
}: ChatSidebarProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAiThinking) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen w-[400px] border-r border-border bg-card">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-semibold">vibemod</h1>
        <div className="flex items-center gap-2 mt-2">
          <div
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="p-3 border-b border-border space-y-2">
        {activeDraft ? (
          <>
            <div className="text-sm">
              <span className="text-muted-foreground">Draft: </span>
              <span className="font-mono text-xs">{activeDraft.branch}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onRebuild} disabled={isLoading}>
                Rebuild
              </Button>
              <Button size="sm" onClick={onPublish} disabled={isLoading}>
                Publish
              </Button>
            </div>
          </>
        ) : (
          <Button size="sm" onClick={onCreateDraft} disabled={isLoading}>
            {isLoading ? 'Creating...' : 'New Draft'}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-8">
              Create a draft and start describing changes.
            </p>
          )}
          {messages.map((msg) => (
            <div key={msg.id}>
              <div
                className={`text-sm ${
                  msg.role === 'user'
                    ? 'text-foreground'
                    : msg.role === 'system'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                }`}
              >
                <span className="font-semibold">
                  {msg.role === 'user' ? 'You' : msg.role === 'ai' ? 'AI' : 'System'}:{' '}
                </span>
                <span className="whitespace-pre-wrap">{msg.content}</span>
              </div>
              <Separator className="mt-4" />
            </div>
          ))}
          {isAiThinking && messages[messages.length - 1]?.id !== 'streaming' && (
            <p className="text-sm text-muted-foreground animate-pulse">AI is thinking...</p>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={activeDraft ? 'Describe a change...' : 'Create a draft first'}
          disabled={!activeDraft || isAiThinking}
        />
        <Button type="submit" disabled={!activeDraft || isAiThinking || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
