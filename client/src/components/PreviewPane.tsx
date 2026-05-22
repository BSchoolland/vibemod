import { Globe } from 'lucide-react';
import type { Draft } from '@/hooks/useDrafts';

interface PreviewPaneProps {
  activeDraft: Draft | null;
  previewPort: number;
}

export function PreviewPane({ activeDraft, previewPort }: PreviewPaneProps) {
  if (!activeDraft) {
    return (
      <div className="flex-1 rounded-2xl bg-card border border-border/50 flex items-center justify-center card-neon">
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-neon-pink/10 via-neon-magenta/10 to-neon-cyan/10 flex items-center justify-center mx-auto mb-5 border border-neon-pink/10">
            <Globe className="w-10 h-10 text-neon-pink/40" />
          </div>
          <p className="text-lg font-semibold text-foreground">Your app preview shows up here</p>
          <p className="text-sm mt-1.5 text-muted-foreground">Add that feature you always wanted to the tool you use every day</p>
        </div>
      </div>
    );
  }

  const previewUrl = `${window.location.protocol}//${window.location.hostname}:${previewPort}`;

  return (
    <div className="flex-1 rounded-2xl bg-card border border-border/50 flex flex-col overflow-hidden card-neon">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary/50 border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-neon-red" />
          <span className="w-3 h-3 rounded-full bg-neon-yellow" />
          <span className="w-3 h-3 rounded-full bg-neon-green" />
        </div>
      </div>

      <iframe
        key={activeDraft.updated_at}
        src={previewUrl}
        className="flex-1 w-full border-0"
        title="Preview"
      />
    </div>
  );
}
