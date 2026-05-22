import { ChatSidebar } from '@/components/ChatSidebar';
import { PreviewPane } from '@/components/PreviewPane';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useDrafts } from '@/hooks/useDrafts';

const PREVIEW_PORT = 3002;

function App() {
  const { messages, sendMessage, isConnected, isAiThinking } = useWebSocket();
  const { activeDraft, isLoading, createDraft, publish, rebuild } = useDrafts();

  return (
    <div className="flex h-screen">
      <ChatSidebar
        messages={messages}
        onSend={sendMessage}
        isConnected={isConnected}
        isAiThinking={isAiThinking}
        activeDraft={activeDraft}
        isLoading={isLoading}
        onCreateDraft={() => createDraft()}
        onPublish={() => publish()}
        onRebuild={() => rebuild()}
      />
      <PreviewPane activeDraft={activeDraft} previewPort={PREVIEW_PORT} />
    </div>
  );
}

export default App;
