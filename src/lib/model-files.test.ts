import { describe, expect, it } from 'vitest';
import {
  MAX_MODEL_BYTES,
  PRINT_MODEL_ACCEPT,
  PRINT_MODEL_INPUT_ACCEPT,
  extensionOf,
  isStepFile,
  validateModelFile,
} from './model-files';

const MB = 1024 * 1024;

describe('model files', () => {
  it('takes STL, 3MF and STEP/STP in any case', () => {
    for (const name of [
      'a.stl',
      'A.STL',
      'b.3mf',
      'c.step',
      'C.STEP',
      'd.stp',
      'D.Stp',
      'v2.final.step',
    ])
      expect(validateModelFile({ name, size: 1024 })).toBeNull();
  });

  it('has the same size limit for a STEP file as for a mesh: 50 MB, inclusive', () => {
    expect(MAX_MODEL_BYTES).toBe(50 * MB);
    for (const name of ['a.stl', 'a.step', 'a.stp', 'a.3mf']) {
      expect(validateModelFile({ name, size: 50 * MB })).toBeNull();
      expect(validateModelFile({ name, size: 50 * MB + 1 })).toBe(
        'That file is 51 MB; the limit is 50 MB.',
      );
    }
  });

  it('refuses other types and files with no type, saying what is taken', () => {
    expect(validateModelFile({ name: 'notes.pdf', size: 10 })).toBe(
      "A .pdf file can't be printed from here. Use STL, STEP or 3MF.",
    );
    expect(validateModelFile({ name: 'model.iges', size: 10 })).toMatch(/\.iges/);
    expect(validateModelFile({ name: 'model.stepx', size: 10 })).toMatch(/\.stepx/);
    expect(validateModelFile({ name: 'noextension', size: 10 })).toMatch(/no type/);
    expect(validateModelFile({ name: '.step', size: 10 })).toMatch(/no type/);
    expect(validateModelFile({ name: 'empty.stl', size: 0 })).toBe('That file is empty.');
  });

  it('knows a STEP file by its extension, whatever the browser calls it', () => {
    expect(extensionOf('Part.One.STEP')).toBe('.step');
    expect(isStepFile('x.stp')).toBe(true);
    expect(isStepFile('x.stl')).toBe(false);
  });

  it('offers the extensions to the picker, so a STEP file reported with no type still passes', () => {
    expect(PRINT_MODEL_INPUT_ACCEPT).toBe('.stl,.3mf,.step,.stp');
    expect(PRINT_MODEL_ACCEPT['application/octet-stream']).toEqual([
      '.stl',
      '.3mf',
      '.step',
      '.stp',
    ]);
    expect(PRINT_MODEL_ACCEPT['model/step']).toEqual(['.step', '.stp']);
  });
});
