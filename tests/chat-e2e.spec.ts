import { test, expect } from '@playwright/test';
import path from 'path';

const CHAT_URL = `file://${path.resolve(import.meta.dirname, '..', 'chat.html')}`;

test('connects to WebSocket and shows connected status', async ({ page }) => {
  await page.goto(CHAT_URL);
  await expect(page.locator('#status-text')).toHaveText('Connected', { timeout: 5000 });
  await expect(page.locator('#dot')).toHaveClass(/connected/);
});

test('sends a message and receives streaming AI response with tool events', async ({ page }) => {
  await page.goto(CHAT_URL);
  await expect(page.locator('#status-text')).toHaveText('Connected', { timeout: 5000 });

  await page.fill('#input', 'Read the file package.json and tell me the project name');
  await page.click('#send');

  // User message should appear immediately
  await expect(page.locator('.msg.user')).toHaveCount(1);

  // Input should be disabled while sending
  await expect(page.locator('#input')).toBeDisabled();

  // Should see tool events (read) or activity indicator
  const toolOrActivity = page.locator('.tool-event, .activity');
  await expect(toolOrActivity.first()).toBeVisible({ timeout: 30000 });

  // AI response should stream in
  await expect(page.locator('.msg.ai')).toBeVisible({ timeout: 60000 });

  // Wait for rebuild to complete (input re-enabled)
  await expect(page.locator('#input')).toBeEnabled({ timeout: 60000 });

  // Final AI message should have content
  const aiText = await page.locator('.msg.ai').textContent();
  expect(aiText!.length).toBeGreaterThan(0);
});

test('send button is disabled when input is empty', async ({ page }) => {
  await page.goto(CHAT_URL);
  await expect(page.locator('#status-text')).toHaveText('Connected', { timeout: 5000 });

  await expect(page.locator('#send')).toBeDisabled();
  await page.fill('#input', 'hello');
  await expect(page.locator('#send')).toBeEnabled();
  await page.fill('#input', '');
  await expect(page.locator('#send')).toBeDisabled();
});
