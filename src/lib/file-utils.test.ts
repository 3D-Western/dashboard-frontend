import { describe, it, expect } from 'vitest';
import { calculateFileChecksum } from './file-utils';

describe('calculateFileChecksum', () => {
  it('returns checksum in sha256:hex format', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });

    const checksum = await calculateFileChecksum(file);

    expect(checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('produces correct SHA-256 hash for known input', async () => {
    // "hello" has a known SHA-256 hash
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    const checksum = await calculateFileChecksum(file);

    // SHA-256 of "hello" is: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(checksum).toBe(
      'sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('produces same hash for identical content', async () => {
    const content = 'same content';
    const file1 = new File([content], 'file1.txt', { type: 'text/plain' });
    const file2 = new File([content], 'file2.txt', { type: 'text/plain' });

    const checksum1 = await calculateFileChecksum(file1);
    const checksum2 = await calculateFileChecksum(file2);

    expect(checksum1).toBe(checksum2);
  });

  it('produces different hash for different content', async () => {
    const file1 = new File(['content A'], 'file1.txt', { type: 'text/plain' });
    const file2 = new File(['content B'], 'file2.txt', { type: 'text/plain' });

    const checksum1 = await calculateFileChecksum(file1);
    const checksum2 = await calculateFileChecksum(file2);

    expect(checksum1).not.toBe(checksum2);
  });

  it('handles empty file', async () => {
    const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });

    const checksum = await calculateFileChecksum(emptyFile);

    // SHA-256 of empty string is: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(checksum).toBe(
      'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('handles binary file content', async () => {
    const binaryData = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
    const file = new File([binaryData], 'binary.bin', { type: 'application/octet-stream' });

    const checksum = await calculateFileChecksum(file);

    expect(checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('handles large content', async () => {
    // Create a 1MB file
    const largeContent = 'x'.repeat(1024 * 1024);
    const file = new File([largeContent], 'large.txt', { type: 'text/plain' });

    const checksum = await calculateFileChecksum(file);

    expect(checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('handles file with special characters in content', async () => {
    const content = '特殊文字 🎉 émojis & symbols <script>';
    const file = new File([content], 'special.txt', { type: 'text/plain' });

    const checksum = await calculateFileChecksum(file);

    expect(checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
