/**
 * Runs inside a real browser for `video-compress.spec.ts`: the real compression code and the real
 * Mediabunny, no mocks. Bundled by the spec with esbuild and exposed as `window.harness`.
 */
import {
  BufferTarget,
  CanvasSource,
  AudioBufferSource,
  Output,
  WebMOutputFormat,
} from 'mediabunny';
import {
  VideoCompressError,
  checkCompressionSupport,
  compressVideo,
  compressionAdvice,
} from '@/lib/video-compress';

/** A short synthetic clip (moving boxes and a tone) as WebM, so it is not an MP4. */
async function makeClip(seconds: number, width: number, height: number): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  const output = new Output({ format: new WebMOutputFormat(), target: new BufferTarget() });
  const video = new CanvasSource(canvas, { codec: 'vp9', bitrate: 8_000_000 });
  output.addVideoTrack(video, { frameRate: 30 });
  const audio = new AudioBufferSource({ codec: 'opus', bitrate: 96_000 });
  output.addAudioTrack(audio);
  await output.start();

  const sampleRate = 48_000;
  const offline = new OfflineAudioContext(2, sampleRate * seconds, sampleRate);
  const tone = offline.createOscillator();
  tone.connect(offline.destination);
  tone.start();
  await audio.add(await offline.startRendering());

  for (let frame = 0; frame < seconds * 30; frame++) {
    context.fillStyle = `hsl(${(frame * 3) % 360} 60% 30%)`;
    context.fillRect(0, 0, width, height);
    for (let box = 0; box < 40; box++) {
      context.fillStyle = `hsl(${(box * 40 + frame * 5) % 360} 80% 60%)`;
      context.fillRect((frame * 7 + box * 97) % width, (frame * 3 + box * 53) % height, 120, 80);
    }
    await video.add(frame / 30, 1 / 30);
  }
  await output.finalize();
  return new File([output.target.buffer!], 'generated.webm', { type: 'video/webm' });
}

/** The top-level boxes of an MP4, in file order: "moov" before "mdat" means faststart. */
async function topLevelBoxes(file: Blob): Promise<string[]> {
  const found: string[] = [];
  let position = 0;
  while (position < file.size) {
    const head = new DataView(await file.slice(position, position + 16).arrayBuffer());
    let size = head.getUint32(0);
    found.push(String.fromCharCode(...[4, 5, 6, 7].map((i) => head.getUint8(i))));
    if (size === 1) size = Number(head.getBigUint64(8));
    if (size < 8) break;
    position += size;
  }
  return found;
}

async function containsText(file: Blob, text: string): Promise<boolean> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const needle = Array.from(text, (c) => c.charCodeAt(0));
  outer: for (let i = 0; i + needle.length <= bytes.length; i++) {
    for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

/** What a <video> element makes of a file: proof that a browser can play it. */
async function playback(file: Blob) {
  const element = document.createElement('video');
  element.muted = true;
  element.src = URL.createObjectURL(file);
  await new Promise<void>((resolve, reject) => {
    element.onloadedmetadata = () => resolve();
    element.onerror = () => reject(new Error('The browser cannot play the file.'));
  });
  return { duration: element.duration, width: element.videoWidth, height: element.videoHeight };
}

async function compressAndReport(clip: File) {
  const progress: number[] = [];
  const result = await compressVideo(clip, { onProgress: (fraction) => progress.push(fraction) });
  return {
    name: result.name,
    type: result.type,
    size: result.size,
    progress,
    boxes: await topLevelBoxes(result),
    hasAac: await containsText(result, 'mp4a'),
    hasAvc: await containsText(result, 'avc1'),
    playback: await playback(result),
  };
}

/** Starts a compression and aborts it as soon as it reports any progress. */
async function compressThenCancel(clip: File): Promise<string> {
  const controller = new AbortController();
  try {
    await compressVideo(clip, { signal: controller.signal, onProgress: () => controller.abort() });
    return 'finished';
  } catch (error) {
    return error instanceof VideoCompressError ? error.kind : String(error);
  }
}

(window as unknown as { harness: unknown }).harness = {
  checkCompressionSupport,
  compressionAdvice,
  makeClip,
  compressAndReport,
  compressThenCancel,
};
