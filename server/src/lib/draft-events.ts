import { EventEmitter } from 'events';

interface DraftEventMap {
  'preview-started': [draftId: number, port: number];
}

class DraftEventBus extends EventEmitter<DraftEventMap> {}

export const draftEvents = new DraftEventBus();
