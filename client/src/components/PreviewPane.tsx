import { useState, useEffect } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import type { Draft } from '@/hooks/useDrafts';
import type { UseDrawing } from '@/hooks/useDrawing';

interface PreviewPaneProps {
  activeDraft: Draft | null;
  previewPort: number;
  isLoading?: boolean;
  isWorking?: boolean;
  drawing: UseDrawing;
}

export function PreviewPane({ activeDraft, previewPort, isLoading, isWorking, drawing }: PreviewPaneProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const showSpinner = isLoading || (activeDraft && !iframeLoaded);

  useEffect(() => {
    setIframeLoaded(false);
  }, [activeDraft?.updated_at]);

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
    <div className={`flex-1 rounded-2xl p-[2px] ${isWorking ? 'card-neon-active' : 'bg-border/50'}`}>
      <div className="h-full rounded-2xl bg-card flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary/50 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-neon-red" />
            <span className="w-3 h-3 rounded-full bg-neon-yellow" />
            <span className="w-3 h-3 rounded-full bg-neon-green" />
          </div>
        </div>

        <div className="relative flex-1">
          {showSpinner && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-neon-pink animate-spin" />
                <span className="text-sm text-muted-foreground">Loading preview…</span>
              </div>
            </div>
          )}
          <iframe
            key={activeDraft.updated_at}
            src={previewUrl}
            className="absolute inset-0 w-full h-full border-0"
            title="Preview"
            onLoad={() => setIframeLoaded(true)}
          />
          <canvas
            {...drawing.canvasProps}
            className="absolute inset-0 w-full h-full z-20"
            style={{
              pointerEvents: drawing.drawMode ? 'auto' : 'none',
              cursor: drawing.drawMode ? 'crosshair' : 'default',
              touchAction: drawing.drawMode ? 'none' : 'auto',
            }}
          />
        </div>
      </div>
    </div>
  );
}
