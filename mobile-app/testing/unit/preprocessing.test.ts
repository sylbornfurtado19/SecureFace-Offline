import preprocessing from '../../src/utils/preprocessing';

describe('preprocessing utilities', () => {
  test('resizeFrame preserves pixel format and size (2x2 -> 4x4)', () => {
    const w = 2;
    const h = 2;
    const bpp = 3; // RGB
    const data = new Uint8Array(w * h * bpp);
    for (let i = 0; i < data.length; i++) data[i] = i % 256;

    const frame = { data: data.buffer, width: w, height: h, format: 'rgb' } as any;
    const out = preprocessing.resizeFrame(frame, 4, 4);
    expect(out.width).toBe(4);
    expect(out.height).toBe(4);
    const outBytes = new Uint8Array(out.data);
    expect(outBytes.length).toBe(4 * 4 * bpp);
  });

  test('cropFrame extracts subregion correctly', () => {
    const w = 4;
    const h = 4;
    const bpp = 3;
    const data = new Uint8Array(w * h * bpp);
    for (let i = 0; i < data.length; i++) data[i] = i % 256;
    const frame = { data: data.buffer, width: w, height: h, format: 'rgb' } as any;
    const out = preprocessing.cropFrame(frame, { x: 1, y: 1, width: 2, height: 2 });
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
    expect(new Uint8Array(out.data).length).toBe(2 * 2 * bpp);
  });

  test('frameToTensor outputs normalized floats', () => {
    const w = 2;
    const h = 1;
    const bpp = 3;
    const data = new Uint8Array([0, 127, 255, 255, 127, 0]); // two RGB pixels
    const frame = { data: data.buffer, width: w, height: h, format: 'rgb' } as any;
    const tensor = preprocessing.frameToTensor(frame);
    expect(tensor.length).toBe(6);
    // first pixel r=0 -> -1, g=127 -> ~-0.0078, b=255 -> 1
    expect(tensor[0]).toBeCloseTo(-1, 3);
    expect(tensor[2]).toBeCloseTo(1, 3);
  });
});
