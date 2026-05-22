import { ChatSidebar } from '@/components/ChatSidebar';
import { PreviewPane } from '@/components/PreviewPane';
import { useChat } from '@/hooks/useChat';
import { useDrafts } from '@/hooks/useDrafts';

const PREVIEW_PORT = 3002;

function App() {
  const { activeDraft, isLoading, createDraft, publish, rebuild, refetch } = useDrafts();
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
        activeDraft={activeDraft}
        isLoading={isLoading}
        onCreateDraft={() => createDraft()}
        onPublish={() => publish()}
        onRebuild={handleRebuild}
      />
      <PreviewPane activeDraft={activeDraft} previewPort={PREVIEW_PORT} />
    </div>
  );
}

export default App;
