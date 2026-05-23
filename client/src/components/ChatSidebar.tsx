import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, FileText, Terminal, Search, FolderOpen, Pencil, Loader2, Check, X } from 'lucide-react';
import type { ChatMessage, ToolEvent } from '@/hooks/useChat';
import type { Draft } from '@/hooks/useDrafts';
import type { UseDrawing, DrawingPayload } from '@/hooks/useDrawing';

interface ChatSidebarProps {
  messages: ChatMessage[];
  toolEvents: ToolEvent[];
  onSend: (content: string, drawing?: DrawingPayload) => void;
  isSending: boolean;
  isStreaming: boolean;
  isThinking: boolean;
  wsReady: boolean;
  activeDraft: Draft | null;
  drawing: UseDrawing;
}

const TOOL_CONFIG: Record<string, { icon: typeof FileText; color: string; label: string }> = {
  read:  { icon: FileText,   color: 'text-neon-cyan',   label: 'Reading' },
  write: { icon: Pencil,     color: 'text-neon-green',  label: 'Writing' },
  edit:  { icon: Pencil,     color: 'text-neon-green',  label: 'Editing' },
  bash:  { icon: Terminal,   color: 'text-neon-yellow', label: 'Running' },
  grep:  { icon: Search,     color: 'text-muted-foreground', label: 'Searching' },
  find:  { icon: Search,     color: 'text-muted-foreground', label: 'Finding' },
  ls:    { icon: FolderOpen, color: 'text-muted-foreground', label: 'Listing' },
};

function toolDetail(event: ToolEvent): string {
  const { toolName, args } = event;
  if ((toolName === 'read' || toolName === 'write' || toolName === 'edit') && args?.path) {
    return String(args.path);
  }
  if (toolName === 'bash' && args?.command) {
    const cmd = String(args.command);
    return cmd.length > 50 ? cmd.slice(0, 47) + '...' : cmd;
  }
  if ((toolName === 'grep' || toolName === 'find') && args) {
    return String(args.pattern || args.glob || args.path || '').slice(0, 50);
  }
  return toolName;
}

function ToolEventRow({ event }: { event: ToolEvent }) {
  const config = TOOL_CONFIG[event.toolName] ?? { icon: Terminal, color: 'text-muted-foreground', label: event.toolName };
  const Icon = config.icon;
  const detail = toolDetail(event);

  return (
    <div className="flex items-center gap-2 py-1 px-1">
      {event.done ? (
        <Check className="w-3.5 h-3.5 text-neon-green shrink-0" />
      ) : (
        <Loader2 className={`w-3.5 h-3.5 ${config.color} shrink-0 animate-spin`} />
      )}
      <Icon className={`w-3.5 h-3.5 ${config.color} shrink-0`} />
      <span className="text-xs text-muted-foreground font-mono truncate">{detail}</span>
    </div>
  );
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

function MessageBubble({ message, isStreamingMsg }: { message: ChatMessage; isStreamingMsg?: boolean }) {
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
        className={`max-w-[85%] px-4 py-2.5 text-sm whitespace-pre-wrap break-words overflow-hidden leading-relaxed ${
          isUser
            ? 'rounded-2xl rounded-br-md bg-gradient-primary text-white'
            : 'rounded-2xl rounded-bl-md bg-secondary text-secondary-foreground border border-border/50'
        }`}
      >
        {message.content}
        {isStreamingMsg && <span className="inline-block w-0.5 h-4 ml-0.5 bg-neon-cyan animate-pulse align-text-bottom" />}
      </div>
    </div>
  );
}

export function ChatSidebar({ messages, toolEvents, onSend, isSending, isStreaming, isThinking, wsReady, activeDraft, drawing }: ChatSidebarProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, toolEvents, isSending, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !drawing.hasDrawing) || isSending) return;
    const payload = drawing.getDrawing() ?? undefined;
    onSend(input.trim() || 'See annotated screenshot.', payload);
    setInput('');
    drawing.clear();
    drawing.setDrawMode(false);
  };

  const showThinking = isThinking && toolEvents.length === 0 && !isStreaming;
  const showTools = toolEvents.length > 0 && !isStreaming;

  return (
    <div className="flex flex-col w-[420px] shrink-0 bg-card rounded-2xl border border-border/50 overflow-hidden card-neon">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-3" ref={scrollRef}>
        {messages.length === 0 && !isSending && (
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
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreamingMsg={msg.id === -1}
          />
        ))}
        {showTools && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-secondary border border-border/50 px-3 py-2 space-y-0.5">
              {toolEvents.map((event, i) => (
                <ToolEventRow key={i} event={event} />
              ))}
            </div>
          </div>
        )}
        {showThinking && <ThinkingIndicator />}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border/50 space-y-2">
        {drawing.hasDrawing && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neon-pink/10 border border-neon-pink/30 text-xs">
            <Pencil className="w-3.5 h-3.5 text-neon-pink shrink-0" />
            <span className="text-neon-pink flex-1">Annotation attached — sent with screenshot</span>
            <button
              type="button"
              onClick={drawing.clear}
              className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              title="Clear drawing"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-1 border border-border/30">
          <button
            type="button"
            onClick={drawing.toggleDraw}
            disabled={!activeDraft}
            title={drawing.drawMode ? 'Stop drawing' : 'Draw on the preview to point things out'}
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-all disabled:opacity-20 disabled:cursor-default ${
              drawing.drawMode
                ? 'bg-neon-pink/20 text-neon-pink ring-1 ring-neon-pink/50'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
            }`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={activeDraft ? 'Describe what you want...' : 'Select a draft first'}
            disabled={!activeDraft || !wsReady || isSending}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground py-2 text-foreground"
          />
          <button
            type="submit"
            disabled={!activeDraft || !wsReady || isSending || (!input.trim() && !drawing.hasDrawing)}
            className="w-9 h-9 rounded-xl bg-gradient-send text-white flex items-center justify-center disabled:opacity-20 hover:opacity-90 transition-all shrink-0 cursor-pointer disabled:cursor-default glow-send disabled:shadow-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
