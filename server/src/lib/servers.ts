import { ManagedProcess } from './managed-process.js';
import { config } from '../config.js';
import { getEditButtonScript } from './edit-button.js';

export const previewServer = new ManagedProcess({ label: 'preview', port: config.previewPort });
export const liveServer = new ManagedProcess({
  label: 'live',
  port: config.livePort,
  injectHtml: getEditButtonScript(config.editorPort),
});
