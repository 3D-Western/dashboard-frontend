import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeConversion {
  isValid: boolean;
  onProgress?: (fraction: number) => void;
  cancel: () => Promise<void>;
  canceled: boolean;
  execute: () => Promise<void>;
}
/** What our code hands to Conversion.init, as far as these tests look. */
interface InitOptions {
  tracks: string;
  output: { format: { options: unknown } };
  video: {
    codec: string;
    width?: number;
    height?: number;
    fit?: string;
    forceTranscode: boolean;
    quality: { options: { bitrate: number; bitrateMode: string } };
  };
  audio: {
    codec: string;
    numberOfChannels?: number;
    quality: { options: { bitrate: number } };
  };
}
// Mediabunny is mocked: these tests are about our decisions and wiring, not the encoder.
const lib = vi.hoisted(() => {
  class ConversionCanceledError extends Error {}
  const state = {
    canEncodeVideo: true,
    canEncodeAudioFirst: true,
    canEncodeAudioAfterRegister: true,
    registered: false,
    videoTrack: { displayWidth: 1920, displayHeight: 1080 } as {
      displayWidth: number;
      displayHeight: number;
    } | null,
    audioTrack: { numberOfChannels: 2 } as { numberOfChannels: number } | null,
    isValid: true,
    buffer: new ArrayBuffer(1000) as ArrayBuffer | null,
    execute: async (_conversion: FakeConversion) => {},
    initOptions: undefined as InitOptions | undefined,
    conversion: undefined as FakeConversion | undefined,
    disposed: 0,
    inputs: 0,
  };
  return { ConversionCanceledError, state };
});

vi.mock('mediabunny', () => {
  const { state, ConversionCanceledError } = lib;
  class Input {
    constructor() {
      state.inputs++;
    }
    getPrimaryVideoTrack = async () => state.videoTrack;
    getPrimaryAudioTrack = async () => state.audioTrack;
    dispose = () => {
      state.disposed++;
    };
  }
  class Output {
    target: { buffer: ArrayBuffer | null };
    format: { options: unknown };
    constructor(options: { format: { options: unknown }; target: { buffer: ArrayBuffer | null } }) {
      this.format = options.format;
      this.target = options.target;
      this.target.buffer = state.buffer;
    }
  }
  return {
    ALL_FORMATS: [],
    BlobSource: class {},
    BufferTarget: class {
      buffer: ArrayBuffer | null = null;
    },
    Mp4OutputFormat: class {
      constructor(public options: unknown) {}
    },
    Quality: class {
      constructor(public options: unknown) {}
    },
    Input,
    Output,
    ConversionCanceledError,
    canEncodeVideo: async () => state.canEncodeVideo,
    canEncodeAudio: async () =>
      state.registered ? state.canEncodeAudioAfterRegister : state.canEncodeAudioFirst,
    Conversion: {
      init: async (options: InitOptions) => {
        state.initOptions = options;
        const conversion: FakeConversion = {
          isValid: state.isValid,
          cancel: vi.fn(async () => {
            conversion.canceled = true;
          }),
          canceled: false,
          execute: () => state.execute(conversion),
        };
        state.conversion = conversion;
        return conversion;
      },
    },
  };
});

vi.mock('@mediabunny/aac-encoder', () => ({
  registerAacEncoder: () => {
    lib.state.registered = true;
  },
}));

import {
  MAX_COMPRESS_SECONDS,
  VideoCompressError,
  checkCompressionSupport,
  compressVideo,
  compressedName,
  compressionAdvice,
  resetCompressionSupportCheck,
  targetBitrate,
  unsupported,
} from './video-compress';

const MB = 1_000_000;
const file = (name: string, type: string, size: number) => ({ name, type, size });
const info = (durationSeconds: number | null, width: number | null, height: number | null) => ({
  durationSeconds,
  width,
  height,
});

describe('compressionAdvice', () => {
  it('requires it for a file that is not an MP4', () => {
    expect(compressionAdvice(file('a.mov', 'video/quicktime', MB), info(60, 1280, 720))).toEqual({
      mode: 'required',
      reasons: ['format'],
    });
    expect(compressionAdvice(file('a.webm', 'video/webm', MB), info(60, 1280, 720)).mode).toBe(
      'required',
    );
  });

  it('uses the extension when the browser left the type empty', () => {
    expect(compressionAdvice(file('a.mov', '', MB), info(60, 1280, 720)).reasons).toEqual([
      'format',
    ]);
    expect(compressionAdvice(file('a.mp4', '', MB), info(60, 1280, 720)).mode).toBe('unneeded');
  });

  it('requires it above 720p, but not at or below it', () => {
    expect(compressionAdvice(file('a.mp4', 'video/mp4', MB), info(60, 1920, 1080))).toEqual({
      mode: 'required',
      reasons: ['resolution'],
    });
    expect(compressionAdvice(file('a.mp4', 'video/mp4', MB), info(60, 1280, 721)).mode).toBe(
      'required',
    );
    expect(compressionAdvice(file('a.mp4', 'video/mp4', MB), info(60, 1280, 720)).mode).toBe(
      'unneeded',
    );
  });

  it('requires it above the 5 Mbps threshold', () => {
    // 50 MB over 60 s is 6.7 Mbps.
    expect(compressionAdvice(file('a.mp4', 'video/mp4', 50 * MB), info(60, 1280, 720))).toEqual({
      mode: 'required',
      reasons: ['bitrate'],
    });
    // 37 MB over 60 s is 4.9 Mbps.
    expect(
      compressionAdvice(file('a.mp4', 'video/mp4', 37 * MB), info(60, 1280, 720)).mode,
    ).not.toBe('required');
  });

  it('lists every reason', () => {
    expect(
      compressionAdvice(file('a.mov', 'video/quicktime', 500 * MB), info(60, 3840, 2160)).reasons,
    ).toEqual(['format', 'resolution', 'bitrate']);
  });

  it('only offers it for an MP4 between about 2.5 and 5 Mbps', () => {
    // 30 MB over 60 s is 4 Mbps.
    expect(compressionAdvice(file('a.mp4', 'video/mp4', 30 * MB), info(60, 1280, 720))).toEqual({
      mode: 'offered',
      reasons: ['bitrate'],
    });
    // 15 MB over 60 s is 2 Mbps: already light.
    expect(compressionAdvice(file('a.mp4', 'video/mp4', 15 * MB), info(60, 1280, 720)).mode).toBe(
      'unneeded',
    );
  });

  it('offers it, without a reason, when the browser could not read the video', () => {
    expect(compressionAdvice(file('a.mp4', 'video/mp4', MB), info(null, null, null))).toEqual({
      mode: 'offered',
      reasons: [],
    });
    expect(compressionAdvice(file('a.mp4', 'video/mp4', MB), info(60, null, null)).mode).toBe(
      'offered',
    );
  });

  it('still requires it for a format problem when nothing else could be read', () => {
    expect(compressionAdvice(file('a.mov', 'video/quicktime', MB), info(null, null, null))).toEqual(
      { mode: 'required', reasons: ['format'] },
    );
  });
});

describe('names and bitrates', () => {
  it('names the compressed copy after the original', () => {
    expect(compressedName('intro.mov')).toBe('intro-720p.mp4');
    expect(compressedName('my.clip.v2.MP4')).toBe('my.clip.v2-720p.mp4');
    expect(compressedName('noextension')).toBe('noextension-720p.mp4');
  });

  it('caps the bitrate at the script 2 Mbps, and gives small pictures less', () => {
    expect(targetBitrate(1280, 720)).toBe(2_000_000);
    expect(targetBitrate(854, 480)).toBeLessThan(2_000_000);
    expect(targetBitrate(160, 90)).toBe(400_000);
  });

  it('has a plain message for each reason it cannot compress, naming the script', () => {
    for (const reason of ['no-webcodecs', 'no-h264', 'no-aac', 'too-long', 'error'] as const) {
      const result = unsupported(reason);
      expect(result.supported).toBe(false);
      if (!result.supported) {
        expect(result.message).toContain('scripts/encode-training-video.sh');
        expect(result.message).toMatch(/upload the original/i);
      }
    }
    expect(MAX_COMPRESS_SECONDS).toBe(1800);
  });
});

describe('checkCompressionSupport', () => {
  beforeEach(() => {
    resetCompressionSupportCheck();
    lib.state.canEncodeVideo = true;
    lib.state.canEncodeAudioFirst = true;
    lib.state.canEncodeAudioAfterRegister = true;
    lib.state.registered = false;
    vi.stubGlobal('VideoEncoder', class {});
    vi.stubGlobal('VideoDecoder', class {});
  });
  afterEach(() => vi.unstubAllGlobals());

  it('is supported when the browser has WebCodecs and both encoders', async () => {
    expect(await checkCompressionSupport()).toEqual({ supported: true });
    expect(lib.state.registered).toBe(false);
  });

  it('says so, without loading anything, when there is no WebCodecs', async () => {
    vi.stubGlobal('VideoEncoder', undefined);

    const result = await checkCompressionSupport();

    expect(result).toMatchObject({ supported: false, reason: 'no-webcodecs' });
  });

  it('says so when the browser has no H.264 encoder', async () => {
    lib.state.canEncodeVideo = false;

    expect(await checkCompressionSupport()).toMatchObject({ supported: false, reason: 'no-h264' });
  });

  it('adds the WebAssembly AAC encoder when the browser has none of its own', async () => {
    lib.state.canEncodeAudioFirst = false;

    expect(await checkCompressionSupport()).toEqual({ supported: true });
    expect(lib.state.registered).toBe(true);
  });

  it('gives up with a message when even that does not give AAC', async () => {
    lib.state.canEncodeAudioFirst = false;
    lib.state.canEncodeAudioAfterRegister = false;

    expect(await checkCompressionSupport()).toMatchObject({ supported: false, reason: 'no-aac' });
  });

  it('asks the browser once per page', async () => {
    const first = checkCompressionSupport();
    expect(checkCompressionSupport()).toBe(first);
  });
});

describe('compressVideo', () => {
  const source = new File(['x'], 'lecture.mov', { type: 'video/quicktime' });

  beforeEach(() => {
    Object.assign(lib.state, {
      videoTrack: { displayWidth: 1920, displayHeight: 1080 },
      audioTrack: { numberOfChannels: 2 },
      isValid: true,
      buffer: new ArrayBuffer(1000),
      execute: async () => {},
      disposed: 0,
    });
  });

  it('makes an H.264 + AAC MP4 at 720p with the index in front, named after the original', async () => {
    const result = await compressVideo(source);

    expect(result.name).toBe('lecture-720p.mp4');
    expect(result.type).toBe('video/mp4');
    expect(result.size).toBe(1000);
    const options = lib.state.initOptions!;
    expect(options.video).toMatchObject({
      codec: 'avc',
      width: 1280,
      height: 720,
      fit: 'fill',
    });
    expect(options.video.forceTranscode).toBe(true);
    expect(options.video.quality.options).toEqual({ bitrate: 2_000_000, bitrateMode: 'variable' });
    expect(options.audio).toMatchObject({ codec: 'aac' });
    expect(options.audio.quality.options.bitrate).toBe(128_000);
    expect(options.output.format.options).toEqual({ fastStart: 'in-memory' });
    expect(options.tracks).toBe('primary');
    expect(lib.state.disposed).toBe(1);
  });

  it('keeps the shape of a portrait picture and makes the sides even', async () => {
    lib.state.videoTrack = { displayWidth: 1079, displayHeight: 1919 };

    await compressVideo(source);

    expect(lib.state.initOptions!.video).toMatchObject({ width: 404, height: 720 });
    expect((lib.state.initOptions!.video.width ?? 1) % 2).toBe(0);
  });

  it('never enlarges, and copies the pictures when only the container is wrong', async () => {
    lib.state.videoTrack = { displayWidth: 1280, displayHeight: 720 };

    await compressVideo(source);

    const video = lib.state.initOptions!.video;
    expect(video.width).toBeUndefined();
    expect(video.height).toBeUndefined();
    expect(video.forceTranscode).toBe(false);
  });

  it('re-encodes a picture that is small enough but heavy, when asked', async () => {
    lib.state.videoTrack = { displayWidth: 1280, displayHeight: 720 };

    await compressVideo(source, { forceReencode: true });

    expect(lib.state.initOptions!.video.forceTranscode).toBe(true);
  });

  it('mixes surround sound down to stereo', async () => {
    lib.state.audioTrack = { numberOfChannels: 6 };

    await compressVideo(source);

    expect(lib.state.initOptions!.audio.numberOfChannels).toBe(2);
  });

  it('reports progress between 0 and 1, ending at 1', async () => {
    const seen: number[] = [];
    lib.state.execute = async (conversion) => {
      conversion.onProgress?.(0.25);
      conversion.onProgress?.(1.5);
    };

    await compressVideo(source, { onProgress: (fraction) => seen.push(fraction) });

    expect(seen).toEqual([0.25, 1, 1]);
  });

  it('cancels the conversion when aborted, and says it was cancelled', async () => {
    const controller = new AbortController();
    lib.state.execute = (conversion) =>
      new Promise((_resolve, reject) => {
        // Like the real library: cancel() makes the running conversion throw.
        const original = conversion.cancel;
        conversion.cancel = async () => {
          await original();
          reject(new lib.ConversionCanceledError());
        };
        controller.abort();
      });

    await expect(compressVideo(source, { signal: controller.signal })).rejects.toMatchObject({
      name: 'VideoCompressError',
      kind: 'aborted',
    });

    expect(lib.state.conversion?.canceled).toBe(true);
    expect(lib.state.disposed).toBe(1);
  });

  it('does not start when already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    lib.state.inputs = 0;

    await expect(compressVideo(source, { signal: controller.signal })).rejects.toMatchObject({
      kind: 'aborted',
    });

    expect(lib.state.inputs).toBe(0);
  });

  it('fails clearly for a file with no readable video', async () => {
    lib.state.videoTrack = null;

    await expect(compressVideo(source)).rejects.toThrow(/no video that this browser can read/i);
    expect(lib.state.disposed).toBe(1);
  });

  it('fails clearly when the library cannot build the conversion', async () => {
    lib.state.isValid = false;

    await expect(compressVideo(source)).rejects.toBeInstanceOf(VideoCompressError);
  });

  it('wraps an encoder failure in a message people can read', async () => {
    lib.state.execute = async () => {
      throw new Error('Encoder error');
    };

    await expect(compressVideo(source)).rejects.toMatchObject({
      kind: 'failed',
      message: 'Compression failed: Encoder error',
    });
    expect(lib.state.disposed).toBe(1);
  });

  it('refuses an empty result', async () => {
    lib.state.buffer = new ArrayBuffer(0);

    await expect(compressVideo(source)).rejects.toThrow(/empty file/i);
  });
});
