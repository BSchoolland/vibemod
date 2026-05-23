import { useEffect, useRef } from 'react';
import { ChatSidebar } from '@/components/ChatSidebar';
import { PreviewPane } from '@/components/PreviewPane';
import { PushToLiveButton } from '@/components/PushToLiveButton';
import { DraftSelector } from '@/components/DraftSelector';
import { useChat } from '@/hooks/useChat';
import { useDrafts } from '@/hooks/useDrafts';
import { usePublish } from '@/hooks/usePublish';

const PREVIEW_PORT = 3002;

function Logo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle className="logo-dot" cx="7" cy="7" r="5.5" fill="#FF1493" />
      <circle className="logo-dot" cx="17" cy="7" r="5.5" fill="#00FFFF" />
      <circle className="logo-dot" cx="7" cy="17" r="5.5" fill="#39FF14" />
      <circle className="logo-dot" cx="17" cy="17" r="5.5" fill="#FFFF00" />
    </svg>
  );
}

function App() {
  const { drafts, activeDraft, isLoading, createDraft, activate, rebuild, refetch } = useDrafts();
  const { messages, toolEvents, sendMessage, isSending, isStreaming, isThinking, wsReady } = useChat(activeDraft?.id ?? null);
  const { state: publishState, publish, reset: publishReset } = usePublish(refetch);

  const wasSending = useRef(false);
  useEffect(() => {
    if (wasSending.current && !isSending) refetch();
    wasSending.current = isSending;
  }, [isSending, refetch]);

  const handleRebuild = async () => {
    await rebuild();
    await refetch();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="neon-stripe shrink-0" />

      <header className="h-14 bg-card/80 backdrop-blur-md border-b border-border/50 flex items-center justify-between px-5 shrink-0 relative z-50">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-xl font-bold text-neon">vibemod</span>
        </div>

        <DraftSelector
          drafts={drafts}
          activeDraft={activeDraft}
          isLoading={isLoading}
          onCreateDraft={() => createDraft()}
          onActivate={(name) => activate(name)}
          onRebuild={handleRebuild}
        />

        <PushToLiveButton
          draftName={activeDraft?.name ?? null}
          isLive={activeDraft?.status === 'live'}
          livePort={3001}
          state={publishState}
          onPublish={publish}
          onReset={publishReset}
        />
      </header>

      <div className="flex flex-1 min-h-0 p-3 gap-3">
        <ChatSidebar
          messages={messages}
          toolEvents={toolEvents}
          onSend={sendMessage}
          isSending={isSending}
          isStreaming={isStreaming}
          isThinking={isThinking}
          wsReady={wsReady}
          activeDraft={activeDraft}
        />
        <PreviewPane activeDraft={activeDraft} previewPort={PREVIEW_PORT} isLoading={isLoading} isWorking={isSending} />
      </div>
    </div>
  );
}

export default App;
