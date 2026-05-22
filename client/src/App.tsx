import { ChatSidebar } from '@/components/ChatSidebar';
import { PreviewPane } from '@/components/PreviewPane';
import { PushToLiveButton } from '@/components/PushToLiveButton';
import { useChat } from '@/hooks/useChat';
import { useDrafts } from '@/hooks/useDrafts';
import { usePublish } from '@/hooks/usePublish';

const PREVIEW_PORT = 3002;

function App() {
  const { drafts, activeDraft, isLoading, createDraft, activate, rebuild, refetch } = useDrafts();
  const { messages, sendMessage, isSending } = useChat(activeDraft?.id ?? null);
  const { state: publishState, publish, reset: publishReset } = usePublish(refetch);

  const handleRebuild = async () => {
    await rebuild();
    await refetch();
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="h-12 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
        <h1 className="text-lg font-semibold">vibemod</h1>
        <PushToLiveButton
          draftName={activeDraft?.name ?? null}
          isLive={activeDraft?.status === 'live'}
          livePort={3001}
          state={publishState}
          onPublish={publish}
          onReset={publishReset}
        />
      </div>
      <div className="flex flex-1 min-h-0">
        <ChatSidebar
          messages={messages}
          onSend={async (msg) => { await sendMessage(msg); await refetch(); }}
          isSending={isSending}
          drafts={drafts}
          activeDraft={activeDraft}
          isLoading={isLoading}
          onCreateDraft={() => createDraft()}
          onActivate={(name) => activate(name)}
          onRebuild={handleRebuild}
        />
        <PreviewPane activeDraft={activeDraft} previewPort={PREVIEW_PORT} />
      </div>
    </div>
  );
}

export default App;
