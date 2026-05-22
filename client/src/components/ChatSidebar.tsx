import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import type { ChatMessage } from '@/hooks/useChat';
import type { Draft } from '@/hooks/useDrafts';

interface ChatSidebarProps {
  messages: ChatMessage[];
  onSend: (content: string) => void;
  isSending: boolean;
  activeDraft: Draft | null;
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md px-5 py-3.5 bg-secondary">
        <div className="flex gap-1.5">
          <span className="thinking-dot w-2.5 h-2.5 rounded-full bg-neon-pink inline-block" />
          <span className="thinking-dot w-2.5 h-2.5 rounded-full bg-neon-magenta inline-block" />
          <span className="thinking-dot w-2.5 h-2.5 rounded-full bg-neon-cyan inline-block" />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'system') {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 rounded-full bg-neon-yellow/10 text-xs text-neon-yellow font-medium border border-neon-yellow/20">
          {message.content}
        </div>
      </div>
    );
  }

  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
          isUser
            ? 'rounded-2xl rounded-br-md bg-gradient-primary text-white'
            : 'rounded-2xl rounded-bl-md bg-secondary text-secondary-foreground border border-border/50'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

export function ChatSidebar({ messages, onSend, isSending, activeDraft }: ChatSidebarProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col w-[420px] shrink-0 bg-card rounded-2xl border border-border/50 overflow-hidden card-neon">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center glow-pink">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                {activeDraft ? 'What feature are you missing?' : 'No draft selected'}
              </p>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {activeDraft
                  ? 'Describe the feature you always wanted and watch it appear.'
                  : 'Pick a draft from the menu above to get started.'}
              </p>
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isSending && <ThinkingIndicator />}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border/50">
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-1 border border-border/30">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={activeDraft ? 'Describe what you want...' : 'Select a draft first'}
            disabled={!activeDraft || isSending}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-2 text-foreground"
          />
          <button
            type="submit"
            disabled={!activeDraft || isSending || !input.trim()}
            className="w-9 h-9 rounded-xl bg-gradient-send text-white flex items-center justify-center disabled:opacity-20 hover:opacity-90 transition-all shrink-0 cursor-pointer disabled:cursor-default glow-send disabled:shadow-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
