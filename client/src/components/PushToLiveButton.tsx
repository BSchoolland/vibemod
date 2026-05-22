import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { PublishState, PublishStage } from '@/hooks/usePublish';

interface PushToLiveButtonProps {
  draftName: string | null;
  isLive: boolean;
  livePort: number;
  state: PublishState;
  onPublish: (name: string) => void;
  onReset: () => void;
}

const PIPELINE: Array<Exclude<PublishStage, 'idle' | 'done' | 'error'>> = ['committing', 'building', 'starting'];

const STAGE_LABELS: Record<string, string> = {
  committing: 'Committing changes',
  building: 'Building',
  starting: 'Starting server',
  done: 'Live!',
};

function stageState(
  row: (typeof PIPELINE)[number],
  current: PublishStage,
): 'pending' | 'active' | 'done' {
  if (current === 'done') return 'done';
  const rowIdx = PIPELINE.indexOf(row);
  const curIdx = PIPELINE.indexOf(current as (typeof PIPELINE)[number]);
  if (curIdx === -1) return 'pending';
  if (rowIdx < curIdx) return 'done';
  if (rowIdx === curIdx) return 'active';
  return 'pending';
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-3 w-3 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function StageRow({ label, state }: { label: string; state: 'pending' | 'active' | 'done' }) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-300 ${
        state === 'active' ? 'bg-primary/10 border border-primary/20' : ''
      } ${state === 'done' ? 'opacity-50' : ''} ${state === 'pending' ? 'opacity-30' : ''}`}
    >
      <span className="text-xs w-3 text-center">
        {state === 'done' ? '✓' : '○'}
      </span>
      <span
        className={`text-xs transition-all duration-200 ${
          state === 'active' ? 'text-foreground font-medium' : 'text-muted-foreground'
        } ${state === 'done' ? 'line-through' : ''}`}
      >
        {label}
      </span>
      {state === 'active' && (
        <span className="ml-auto">
          <Spinner className="text-primary" />
        </span>
      )}
    </div>
  );
}

export function PushToLiveButton({ draftName, isLive, livePort, state, onPublish, onReset }: PushToLiveButtonProps) {
  const { stage, error } = state;
  const panelVisible = stage !== 'idle';
  const isRunning = stage !== 'idle' && stage !== 'done' && stage !== 'error';
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (stage === 'done') {
      timerRef.current = setTimeout(onReset, 2000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [stage, onReset]);

  const liveUrl = `${window.location.protocol}//${window.location.hostname}:${livePort}`;

  if (isLive && stage === 'idle') {
    return (
      <a
        href={liveUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center h-7 px-3 text-xs font-semibold rounded-md bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
      >
        Live!
      </a>
    );
  }

  const handleClick = () => {
    if (!draftName || isRunning) return;
    if (stage === 'done' || stage === 'error') {
      onReset();
      return;
    }
    onPublish(draftName);
  };

  return (
    <div className="relative">
      <Button
        size="sm"
        onClick={handleClick}
        disabled={!draftName || isRunning}
        className="h-7 px-3 text-xs font-semibold"
      >
        {isRunning ? (
          <span className="flex items-center gap-1.5">
            <Spinner />
            Deploying...
          </span>
        ) : (
          'Push to Live'
        )}
      </Button>

      <div
        className={`absolute right-0 top-9 z-50 w-52 rounded-lg border border-border bg-card shadow-xl transition-all duration-200 origin-top-right ${
          panelVisible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
        }`}
      >
        <div className="p-3">
          {stage === 'error' ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-destructive">Deploy failed</p>
              {error && <p className="text-xs text-muted-foreground break-words">{error}</p>}
              <button
                onClick={onReset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {PIPELINE.map((s) => (
                <StageRow key={s} label={STAGE_LABELS[s]} state={stageState(s, stage)} />
              ))}
              {stage === 'done' && (
                <div className="px-2 py-1.5 text-xs font-medium text-green-400">
                  {STAGE_LABELS.done}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
