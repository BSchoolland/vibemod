import puppeteer, { type Browser } from 'puppeteer-core';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { createLogger } from '../lib/logger.js';
import { draftEvents } from '../lib/draft-events.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', 'screenshots');
const CHROME_PATH = '/usr/bin/google-chrome';
const VIEWPORT = { width: 1280, height: 800 };

const log = createLogger('screenshot');

class ScreenshotService {
  private browser: Browser | null = null;

  listen(): void {
    draftEvents.on('preview-started', (draftId, port) => {
      this.capture(draftId, port).catch((err) => {
        log.error({ draftId, err }, 'screenshot capture failed');
      });
    });
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) return this.browser;

    this.browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    this.browser.on('disconnected', () => {
      this.browser = null;
    });

    return this.browser;
  }

  private async capture(draftId: number, port: number): Promise<void> {
    await this.ensureDir();

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport(VIEWPORT);
      await page.goto(`http://localhost:${port}`, {
        waitUntil: 'networkidle2',
        timeout: 15000,
      });

      const outputPath = path.join(SCREENSHOTS_DIR, `${draftId}.png`);
      await page.screenshot({ path: outputPath, type: 'png' });
      log.info({ draftId, path: outputPath }, 'screenshot captured');
    } finally {
      await page.close();
    }
  }

  screenshotPath(draftId: number): string {
    return path.join(SCREENSHOTS_DIR, `${draftId}.png`);
  }

  async exists(draftId: number): Promise<boolean> {
    try {
      await fs.access(this.screenshotPath(draftId));
      return true;
    } catch {
      return false;
    }
  }

  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const screenshotService = new ScreenshotService();
