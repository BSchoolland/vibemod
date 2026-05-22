import { useState, useCallback } from 'react';

export type PublishStage = 'idle' | 'committing' | 'building' | 'starting' | 'done' | 'error';

export interface PublishState {
  stage: PublishStage;
  error?: string;
}

const IDLE: PublishState = { stage: 'idle' };

export function usePublish(onDone: () => Promise<void>) {
  const [state, setState] = useState<PublishState>(IDLE);

  const publish = useCallback(async (draftName: string) => {
    setState({ stage: 'committing' });

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: draftName }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        setState({ stage: 'error', error: body.error });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.stage === 'error') {
              setState({ stage: 'error', error: event.error });
            } else {
              setState({ stage: event.stage });
            }
            if (event.stage === 'done') {
              await onDone();
            }
          } catch {
            // malformed event
          }
        }
      }
    } catch (err: any) {
      setState({ stage: 'error', error: err.message ?? 'Connection lost' });
    }
  }, [onDone]);

  const reset = useCallback(() => setState(IDLE), []);

  return { state, publish, reset };
}
