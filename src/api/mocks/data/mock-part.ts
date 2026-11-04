// Stand-ins for the pipeline's 3D viewer artifacts, so the print flow works without a backend:
// a small L-bracket as a binary glTF (`model_glb`) and the matching `highlights_json` documents
// (slicing-pipeline/schemas/dashboard-v1.0/Highlights.schema.json). Both are built here and
// served as data: links, like the mock preview image.
//
// The part follows the contract: millimetres, Z up, bed at z = 0. Triangles are numbered in the
// order the boxes are listed below, 12 per box, in the face order of BOX_FACES.

type Box = [number, number, number, number, number, number];

const BOXES: Record<'base' | 'wall' | 'fin', Box> = {
  base: [0, 0, 0, 60, 40, 4],
  wall: [0, 0, 4, 60, 4, 40],
  // Far too thin to print: the "can't print" example points at it.
  fin: [30, 20, 4, 30.3, 36, 26],
};

// Per box: bottom, top, front, back, left, right, two triangles each (counter-clockwise from outside).
const BOX_FACES = [
  [0, 3, 2, 0, 2, 1],
  [4, 5, 6, 4, 6, 7],
  [0, 1, 5, 0, 5, 4],
  [3, 7, 6, 3, 6, 2],
  [0, 4, 7, 0, 7, 3],
  [1, 2, 6, 1, 6, 5],
].flat();

/** Triangle indices of each box's faces in the mesh. */
export const MOCK_TRIANGLES = {
  baseTop: [2, 3],
  fin: Array.from({ length: 12 }, (_, i) => 24 + i),
};

function buildGeometry() {
  const positions: number[] = [];
  const indices: number[] = [];
  for (const [x0, y0, z0, x1, y1, z1] of Object.values(BOXES)) {
    const first = positions.length / 3;
    positions.push(x0, y0, z0, x1, y0, z0, x1, y1, z0, x0, y1, z0);
    positions.push(x0, y0, z1, x1, y0, z1, x1, y1, z1, x0, y1, z1);
    for (const corner of BOX_FACES) indices.push(first + corner);
  }
  return { positions: new Float32Array(positions), indices: new Uint16Array(indices) };
}

function buildGlb(): Uint8Array {
  const { positions, indices } = buildGeometry();
  const min = [0, 0, 0];
  const max = [60, 40, 40];
  const positionBytes = positions.byteLength;
  const indexBytes = indices.byteLength;
  const binLength = Math.ceil((positionBytes + indexBytes) / 4) * 4;

  const json = JSON.stringify({
    asset: { version: '2.0', generator: '3dw-dashboard mock' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'bracket' }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positionBytes, target: 34962 },
      { buffer: 0, byteOffset: positionBytes, byteLength: indexBytes, target: 34963 },
    ],
    buffers: [{ byteLength: binLength }],
  });
  const jsonBytes = new TextEncoder().encode(json);
  const jsonLength = Math.ceil(jsonBytes.length / 4) * 4;

  const total = 12 + 8 + jsonLength + 8 + binLength;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true); // "glTF"
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true); // "JSON"
  out.set(jsonBytes, 20);
  out.fill(0x20, 20 + jsonBytes.length, 20 + jsonLength); // pad JSON with spaces
  const binStart = 20 + jsonLength;
  view.setUint32(binStart, binLength, true);
  view.setUint32(binStart + 4, 0x004e4942, true); // "BIN\0"
  out.set(new Uint8Array(positions.buffer), binStart + 8);
  out.set(new Uint8Array(indices.buffer), binStart + 8 + positionBytes);
  return out;
}

const dataUrl = (type: string, bytes: Uint8Array | string) =>
  `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;

export const MOCK_MODEL_URL = dataUrl('model/gltf-binary', buildGlb());

const HIGHLIGHTS = {
  review: {
    version: 1,
    highlights: [
      {
        code: 'overhang.supports_added',
        severity: 'adjusted',
        label: 'Supports under the arm',
        bbox_mm: [10, 0, 5, 40, 12, 18],
      },
      {
        code: 'base.brim_added',
        severity: 'adjusted',
        label: 'Brim around the base',
        faces: MOCK_TRIANGLES.baseTop,
      },
    ],
  },
  cannot: {
    version: 1,
    highlights: [
      {
        code: 'walls.too_thin',
        severity: 'cannot_print',
        label: 'Wall only 0.3 mm thick',
        faces: MOCK_TRIANGLES.fin,
      },
    ],
  },
};

export const MOCK_HIGHLIGHTS_URL = {
  review: dataUrl('application/json', JSON.stringify(HIGHLIGHTS.review)),
  cannot: dataUrl('application/json', JSON.stringify(HIGHLIGHTS.cannot)),
};
