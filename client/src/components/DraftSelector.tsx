import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, RefreshCw } from 'lucide-react';
import type { Draft } from '@/hooks/useDrafts';

interface DraftSelectorProps {
  drafts: Draft[];
  activeDraft: Draft | null;
  isLoading: boolean;
  onCreateDraft: () => void;
  onActivate: (name: string) => void;
  onRebuild: () => void;
}

export function DraftSelector({
  drafts,
  activeDraft,
  isLoading,
  onCreateDraft,
  onActivate,
  onRebuild,
}: DraftSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-secondary transition-colors text-sm font-medium disabled:opacity-50"
      >
        <span className="font-mono text-xs text-foreground">
          {activeDraft?.name ?? 'No draft selected'}
        </span>
        {activeDraft?.status === 'live' && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neon-green/15 text-neon-green border border-neon-green/20">
            LIVE
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-60 bg-card rounded-xl border border-border/50 shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {drafts.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">No drafts yet</p>
          )}
          {drafts.map((draft) => {
            const isActive = activeDraft?.id === draft.id;
            return (
              <button
                key={draft.id}
                onClick={() => {
                  if (!isActive) onActivate(draft.name);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-secondary text-foreground'
                }`}
              >
                <span className="flex-1 truncate font-mono text-xs">{draft.name}</span>
                {draft.status === 'live' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neon-green/15 text-neon-green border border-neon-green/20">
                    LIVE
                  </span>
                )}
              </button>
            );
          })}

          <div className="border-t border-border/50 my-1" />

          <button
            onClick={() => {
              onCreateDraft();
              setOpen(false);
            }}
            disabled={isLoading}
            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-secondary transition-colors text-neon-pink font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            New draft
          </button>

          {activeDraft && (
            <button
              onClick={() => {
                onRebuild();
                setOpen(false);
              }}
              disabled={isLoading}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-secondary transition-colors text-muted-foreground"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Rebuild
            </button>
          )}
        </div>
      )}
    </div>
  );
}
