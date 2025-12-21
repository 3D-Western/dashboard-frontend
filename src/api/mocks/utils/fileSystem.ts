import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// Project root is three levels up from src/api/mocks/utils/
const PROJECT_ROOT = path.join(__dirname, '../../../..');
const TMP_DIR = path.join(PROJECT_ROOT, 'tmp');

// Supported file extensions and their MIME types
const SUPPORTED_FILES = {
  '.stl': 'model/stl',
  '.obj': 'model/obj',
  '.3mf': 'application/3mf',
} as const;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

export class FileSystemUtils {
  /**
   * Initialize tmp directory - called when MSW server starts
   */
  static initTmpDirectory(): void {
    // Clean existing tmp/ directory
    if (fs.existsSync(TMP_DIR)) {
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
    }
    // Create fresh tmp/ directory
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }

  /**
   * Validate file type and size
   */
  static validateFile(
    filename: string,
    size: number,
  ): {
    valid: boolean;
    error?: { code: string; message: string; details?: unknown };
  } {
    // Check filename exists
    if (!filename || filename.trim() === '') {
      return {
        valid: false,
        error: {
          code: 'UNSUPPORTED_FILE_TYPE',
          message: 'File must have a valid name',
        },
      };
    }

    // Extract extension
    const ext = path.extname(filename).toLowerCase();
    if (!ext) {
      return {
        valid: false,
        error: {
          code: 'UNSUPPORTED_FILE_TYPE',
          message: 'File must have a valid extension',
        },
      };
    }

    // Check if extension is supported
    if (!(ext in SUPPORTED_FILES)) {
      return {
        valid: false,
        error: {
          code: 'UNSUPPORTED_FILE_TYPE',
          message: `File extension ${ext} is not supported`,
          details: {
            supportedTypes: Object.keys(SUPPORTED_FILES).map((e) => e.slice(1)), // Remove leading dot
          },
        },
      };
    }

    // Check file size
    if (size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: {
          code: 'FILE_SIZE_EXCEEDED',
          message: `File size ${size} bytes exceeds the maximum allowed size of ${MAX_FILE_SIZE} bytes`,
          details: {
            maxSizeBytes: MAX_FILE_SIZE,
          },
        },
      };
    }

    return { valid: true };
  }

  /**
   * Get MIME type from filename
   */
  static getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    return SUPPORTED_FILES[ext as keyof typeof SUPPORTED_FILES] || 'application/octet-stream';
  }

  /**
   * Save uploaded file to tmp/ directory
   * Returns the disk path where file was saved
   */
  static async saveFile(fileBuffer: ArrayBuffer, originalFilename: string): Promise<string> {
    const fileId = randomUUID();
    const ext = path.extname(originalFilename);
    const safeName = `${fileId}${ext}`; // Use UUID + extension to avoid collisions
    const diskPath = path.join(TMP_DIR, safeName);

    // Write file to disk
    await fs.promises.writeFile(diskPath, Buffer.from(fileBuffer));

    return diskPath;
  }

  /**
   * Read file from tmp/ directory
   */
  static async readFile(diskPath: string): Promise<Buffer> {
    if (!fs.existsSync(diskPath)) {
      throw new Error(`File not found at path: ${diskPath}`);
    }
    return await fs.promises.readFile(diskPath);
  }

  /**
   * Delete file from tmp/ directory
   */
  static async deleteFile(diskPath: string): Promise<void> {
    if (fs.existsSync(diskPath)) {
      await fs.promises.unlink(diskPath);
    }
  }

  /**
   * Check if file exists in tmp/
   */
  static fileExists(diskPath: string): boolean {
    return fs.existsSync(diskPath);
  }
}
