import { ChatSidebar } from '@/components/ChatSidebar';
import { PreviewPane } from '@/components/PreviewPane';
import { useChat } from '@/hooks/useChat';
import { useDrafts } from '@/hooks/useDrafts';

const PREVIEW_PORT = 3002;

function App() {
  const { drafts, activeDraft, isLoading, createDraft, activate, publish, rebuild, refetch } = useDrafts();
  const { messages, sendMessage, isSending } = useChat(activeDraft?.id ?? null);

  const handleRebuild = async () => {
    await rebuild();
    await refetch();
  };

  return (
    <div className="flex h-screen">
      <ChatSidebar
        messages={messages}
        onSend={async (msg) => { await sendMessage(msg); await refetch(); }}
        isSending={isSending}
        drafts={drafts}
        activeDraft={activeDraft}
        isLoading={isLoading}
        onCreateDraft={() => createDraft()}
        onActivate={(name) => activate(name)}
        onPublish={() => publish()}
        onRebuild={handleRebuild}
      />
      <PreviewPane activeDraft={activeDraft} previewPort={PREVIEW_PORT} />
    </div>
  );
}

export default App;
