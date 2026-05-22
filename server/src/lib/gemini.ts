import { config } from '../config.js';
import { createLogger } from './logger.js';

const log = createLogger('gemini');

const MODEL = 'gemini-3.1-flash-lite';

export async function generateBranchName(userMessage: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${config.geminiApiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `You are a branch name generator. Given a user's request for a code change, produce a short, descriptive git branch name (2-4 words, kebab-case, no prefix). Respond with ONLY the branch name, nothing else.

User request: "${userMessage}"`,
        }],
      }],
      generationConfig: {
        maxOutputTokens: 30,
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API ${response.status}: ${err}`);
  }

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!cleaned) throw new Error('Gemini returned empty branch name');

  log.info({ userMessage: userMessage.slice(0, 80), branchName: cleaned }, 'generated branch name');
  return cleaned;
}
