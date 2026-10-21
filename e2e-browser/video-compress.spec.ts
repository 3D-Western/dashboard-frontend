import path from 'node:path';
import { build } from 'esbuild';
import { test, expect, type Page } from '@playwright/test';

/**
 * The real thing: the real compression code and the real Mediabunny in a real browser, with a
 * small generated clip. Run with `pnpm run test:browser`. The unit tests mock the library; this
 * is what shows that the output really is a playable 720p H.264/AAC MP4 with the index in front.
 *
 * It needs a browser with a built-in H.264 encoder (Chromium has one) and skips itself otherwise.
 */

type Harness = {
  checkCompressionSupport(): Promise<{ supported: boolean; reason?: string }>;
  compressionAdvice(
    file: File,
    info: { durationSeconds: number; width: number; height: number },
  ): { mode: string; reasons: string[] };
  makeClip(seconds: number, width: number, height: number): Promise<File>;
  compressAndReport(clip: File): Promise<{
    name: string;
    type: string;
    size: number;
    progress: number[];
    boxes: string[];
    hasAac: boolean;
    hasAvc: boolean;
    playback: { duration: number; width: number; height: number };
  }>;
  compressThenCancel(clip: File): Promise<string>;
};

let bundle = '';

test.beforeAll(async () => {
  const result = await build({
    entryPoints: [path.join(__dirname, 'compress-harness.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    alias: { '@': path.join(__dirname, '../src') },
    logLevel: 'error',
  });
  bundle = result.outputFiles[0].text;
});

async function openHarness(page: Page) {
  // WebCodecs only exists in a secure context, which a blank page is not but localhost is.
  await page.route('http://localhost/harness', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>harness</title>' }),
  );
  await page.goto('http://localhost/harness');
  await page.addScriptTag({ content: bundle });
  const support = await page.evaluate(() =>
    (window as unknown as { harness: Harness }).harness.checkCompressionSupport(),
  );
  if (!support.supported) {
    // A skipped test must not look like a passed one: say so on the console, in the CI log as a
    // warning, and in the report as an annotation.
    const message = `NOT RUN: this browser cannot compress video (${support.reason ?? 'no reason given'}), so the real compression test did not run. Use Chrome (PLAYWRIGHT_CHANNEL=chrome).`;
    console.warn(`\n!!! ${message}\n`);
    if (process.env.CI) console.log(`::warning title=Video compression test skipped::${message}`);
    test.info().annotations.push({ type: 'skipped-no-h264', description: message });
    test.skip(true, message);
  }
}

test('compresses a 1080p WebM into a playable 720p H.264/AAC MP4 with the index first', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openHarness(page);

  const report = await page.evaluate(async () => {
    const h = (window as unknown as { harness: Harness }).harness;
    const clip = await h.makeClip(3, 1920, 1080);
    return {
      advice: h.compressionAdvice(clip, { durationSeconds: 3, width: 1920, height: 1080 }),
      clipSize: clip.size,
      result: await h.compressAndReport(clip),
    };
  });

  expect(report.advice).toEqual({ mode: 'required', reasons: ['format', 'resolution'] });
  const { result } = report;
  expect(result.name).toBe('generated-720p.mp4');
  expect(result.type).toBe('video/mp4');
  expect(result.size).toBeGreaterThan(0);
  expect(result.size).toBeLessThan(report.clipSize);
  // The index ("moov") comes before the media ("mdat"): the phone can start playing at once.
  expect(result.boxes.indexOf('moov')).toBeGreaterThan(-1);
  expect(result.boxes.indexOf('moov')).toBeLessThan(result.boxes.indexOf('mdat'));
  expect(result.hasAvc).toBe(true);
  expect(result.hasAac).toBe(true);
  expect(result.playback.width).toBe(1280);
  expect(result.playback.height).toBe(720);
  expect(result.playback.duration).toBeGreaterThan(2.5);
  expect(result.playback.duration).toBeLessThan(3.5);
  // Progress only ever goes forward, and ends at 1.
  expect(result.progress.length).toBeGreaterThan(1);
  expect([...result.progress].sort((a, b) => a - b)).toEqual(result.progress);
  expect(result.progress.at(-1)).toBe(1);
});

test('stops when cancelled', async ({ page }) => {
  test.setTimeout(120_000);
  await openHarness(page);

  const outcome = await page.evaluate(async () => {
    const h = (window as unknown as { harness: Harness }).harness;
    return h.compressThenCancel(await h.makeClip(3, 1920, 1080));
  });

  expect(outcome).toBe('aborted');
});
