import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { ChatMessage } from '@/hooks/useChat';
import type { Draft } from '@/hooks/useDrafts';

interface ChatSidebarProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  isSending: boolean;
  drafts: Draft[];
  activeDraft: Draft | null;
  isLoading: boolean;
  onCreateDraft: () => void;
  onActivate: (name: string) => void;
  onRebuild: () => void;
}

function StatusBadge({ status }: { status: Draft['status'] }) {
  if (status === 'live') {
    return <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">live</span>;
  }
  return null;
}

function VersionList({
  drafts,
  activeDraft,
  isLoading,
  onActivate,
  onCreateDraft,
}: {
  drafts: Draft[];
  activeDraft: Draft | null;
  isLoading: boolean;
  onActivate: (name: string) => void;
  onCreateDraft: () => void;
}) {
  return (
    <div className="p-3 border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Versions</span>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onCreateDraft} disabled={isLoading}>
          + New
        </Button>
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {drafts.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">No versions yet</p>
        )}
        {drafts.map((draft) => {
          const isActive = activeDraft?.id === draft.id;
          return (
            <button
              key={draft.id}
              onClick={() => !isActive && onActivate(draft.name)}
              disabled={isLoading || isActive}
              className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted/50 text-foreground'
              }`}
            >
              <span className="flex-1 truncate font-mono text-xs">{draft.name}</span>
              <StatusBadge status={draft.status} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ChatSidebar({
  messages,
  onSend,
  isSending,
  drafts,
  activeDraft,
  isLoading,
  onCreateDraft,
  onActivate,
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
    if (!input.trim() || isSending) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full w-[400px] border-r border-border bg-card">

      <VersionList
        drafts={drafts}
        activeDraft={activeDraft}
        isLoading={isLoading}
        onActivate={onActivate}
        onCreateDraft={onCreateDraft}
      />

      {activeDraft && (
        <div className="px-3 py-2 border-b border-border">
          <Button size="sm" variant="outline" onClick={onRebuild} disabled={isLoading}>
            Rebuild
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-8">
              {activeDraft
                ? 'Start describing changes.'
                : 'Select or create a version to start.'}
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
          {isSending && (
            <p className="text-sm text-muted-foreground animate-pulse">AI is thinking...</p>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={activeDraft ? 'Describe a change...' : 'Select a version first'}
          disabled={!activeDraft || isSending}
        />
        <Button type="submit" disabled={!activeDraft || isSending || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
