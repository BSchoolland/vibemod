import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, RefreshCw, Check } from 'lucide-react';
import type { Draft } from '@/hooks/useDrafts';

interface DraftSelectorProps {
  drafts: Draft[];
  activeDraft: Draft | null;
  isLoading: boolean;
  onCreateDraft: () => void;
  onActivate: (name: string) => void;
  onRebuild: () => void;
}

function ScreenshotThumb({ draftName }: { draftName: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSrc(`/api/drafts/${draftName}/screenshot?t=${Date.now()}`);
    setFailed(false);
  }, [draftName]);

  if (failed || !src) {
    return (
      <div className="w-full aspect-video bg-muted/50 rounded-lg flex items-center justify-center">
        <span className="text-xs text-muted-foreground">No preview</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Preview of ${draftName}`}
      className="w-full aspect-video object-cover object-top rounded-lg"
      onError={() => setFailed(true)}
    />
  );
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

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 bg-secondary/60 hover:bg-secondary hover:border-neon-pink/30 transition-all text-sm font-medium disabled:opacity-50"
      >
        <span className="font-mono text-sm text-foreground">
          {activeDraft?.display_name ?? activeDraft?.name ?? 'No draft selected'}
        </span>
        {activeDraft?.status === 'live' && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neon-green/15 text-neon-green border border-neon-green/20">
            LIVE
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          <div className="relative w-full max-w-2xl max-h-[80vh] bg-card rounded-2xl border border-border/50 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <h2 className="text-lg font-semibold text-foreground">Versions</h2>
              <div className="flex items-center gap-2">
                {activeDraft && (
                  <button
                    onClick={() => {
                      onRebuild();
                      close();
                    }}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Rebuild
                  </button>
                )}
                <button
                  onClick={() => {
                    onCreateDraft();
                    close();
                  }}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neon-pink/10 hover:bg-neon-pink/20 text-neon-pink border border-neon-pink/20 transition-colors disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New draft
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {drafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">No drafts yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a new draft to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {drafts.map((draft) => {
                    const isActive = activeDraft?.id === draft.id;
                    return (
                      <button
                        key={draft.id}
                        onClick={() => {
                          if (!isActive) onActivate(draft.name);
                          close();
                        }}
                        className={`group relative text-left rounded-xl border transition-all overflow-hidden ${
                          isActive
                            ? 'border-neon-pink/40 bg-neon-pink/5'
                            : 'border-border/50 hover:border-border bg-secondary/30 hover:bg-secondary/50'
                        }`}
                      >
                        <div className="p-2.5">
                          <ScreenshotThumb draftName={draft.name} />
                        </div>

                        <div className="flex items-center gap-2 px-3 pb-3">
                          {isActive && (
                            <Check className="w-3.5 h-3.5 text-neon-pink shrink-0" />
                          )}
                          <span className="flex-1 truncate font-mono text-xs text-foreground">
                            {draft.display_name ?? draft.name}
                          </span>
                          {draft.status === 'live' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neon-green/15 text-neon-green border border-neon-green/20">
                              LIVE
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
