import type { Draft } from '@/hooks/useDrafts';

interface PreviewPaneProps {
  activeDraft: Draft | null;
  previewPort: number;
  reloadKey: number;
}

export function PreviewPane({ activeDraft, previewPort, reloadKey }: PreviewPaneProps) {
  if (!activeDraft) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">No active draft</p>
          <p className="text-sm mt-1">Create a draft to start previewing changes</p>
        </div>
      </div>
    );
  }

  const previewUrl = `${window.location.protocol}//${window.location.hostname}:${previewPort}`;

  return (
    <div className="flex-1 flex flex-col">
      <div className="h-10 border-b border-border flex items-center px-4 bg-muted/30">
        <span className="text-xs text-muted-foreground font-mono">{previewUrl}</span>
      </div>
      <iframe
        key={reloadKey}
        src={previewUrl}
        className="flex-1 w-full border-0"
        title="Preview"
      />
    </div>
  );
}
