import { useEffect, useRef } from 'react';
import { Rocket, Check, ExternalLink } from 'lucide-react';
import type { PublishState, PublishStage } from '@/hooks/usePublish';

interface PushToLiveButtonProps {
  draftName: string | null;
  isLive: boolean;
  livePort: number;
  state: PublishState;
  onPublish: (name: string) => void;
  onReset: () => void;
}

const PIPELINE: Array<Exclude<PublishStage, 'idle' | 'done' | 'error'>> = [
  'committing',
  'building',
  'starting',
];

const STAGE_LABELS: Record<string, string> = {
  committing: 'Committing changes',
  building: 'Building app',
  starting: 'Starting server',
  done: 'Deployed!',
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
      className={`animate-spin h-3.5 w-3.5 ${className}`}
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
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-300 ${
        state === 'active' ? 'bg-neon-pink/10' : ''
      }`}
    >
      <span className="w-4 h-4 flex items-center justify-center shrink-0">
        {state === 'done' ? (
          <Check className="w-3.5 h-3.5 text-neon-green" />
        ) : state === 'active' ? (
          <Spinner className="text-neon-pink" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-border" />
        )}
      </span>
      <span
        className={`text-xs transition-all duration-200 ${
          state === 'active'
            ? 'text-foreground font-medium'
            : state === 'done'
              ? 'text-muted-foreground'
              : 'text-muted-foreground/50'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

export function PushToLiveButton({
  draftName,
  isLive,
  livePort,
  state,
  onPublish,
  onReset,
}: PushToLiveButtonProps) {
  const { stage, error } = state;
  const panelVisible = stage !== 'idle';
  const isRunning = stage !== 'idle' && stage !== 'done' && stage !== 'error';
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (stage === 'done') {
      timerRef.current = setTimeout(onReset, 2500);
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
        className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-xl bg-gradient-live text-black hover:opacity-90 transition-all glow-cyan"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        View Live
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
      <button
        onClick={handleClick}
        disabled={!draftName || isRunning}
        className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-xl bg-gradient-primary text-white hover:opacity-90 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-default glow-pink disabled:shadow-none"
      >
        {isRunning ? (
          <>
            <Spinner className="text-white" />
            Deploying...
          </>
        ) : (
          <>
            <Rocket className="w-3.5 h-3.5" />
            Go Live
          </>
        )}
      </button>

      <div
        className={`absolute right-0 top-11 z-50 w-56 rounded-xl border border-border/50 bg-card shadow-xl transition-all duration-200 origin-top-right ${
          panelVisible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'
        }`}
      >
        <div className="p-2">
          {stage === 'error' ? (
            <div className="p-2 space-y-2">
              <p className="text-xs font-semibold text-neon-red">Deploy failed</p>
              {error && (
                <p className="text-xs text-muted-foreground break-words">{error}</p>
              )}
              <button
                onClick={onReset}
                className="text-xs text-neon-pink font-medium hover:underline transition-colors"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {PIPELINE.map((s) => (
                <StageRow key={s} label={STAGE_LABELS[s]} state={stageState(s, stage)} />
              ))}
              {stage === 'done' && (
                <div className="px-3 py-2 text-xs font-bold text-neon-green flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
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
