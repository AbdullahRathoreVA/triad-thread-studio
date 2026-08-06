import * as THREE from "three";

/**
 * Procedural leather material maps, generated on a canvas at runtime.
 *
 * Why generate rather than ship images:
 *  - Zero photography and zero licensing risk. Nothing here is derived from
 *    anyone else's work.
 *  - ~40KB of code instead of ~6MB of 4K PBR textures.
 *  - The grain scale and hide colour are parameters, so every leather option
 *    in the configurator can render its own material with no new assets.
 *
 * The grain is Worley (cellular) noise — the same "pebbled cell" structure as
 * real full-grain hide — with a fine fibre noise layered over it. The normal
 * map is a Sobel derivative of that height field.
 */

export type LeatherParams = {
  /** Base hide colour, hex. */
  color: string;
  /** Cell size in pixels. Smaller = tighter pebble grain. */
  grain?: number;
  /** 0 = glassy patent, 1 = raw matte nubuck. */
  roughness?: number;
  /** Height relief strength for the normal map. */
  relief?: number;
  size?: number;
};

type CachedMaps = {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
};

const cache = new Map<string, CachedMaps>();

/** Deterministic PRNG so a given leather always looks identical across reloads. */
export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Worley noise height field, tiling seamlessly.
 * Feature points sit on a jittered grid; each pixel takes the distance to the
 * nearest point, wrapping at the edges so the texture repeats without a seam.
 */
function worleyHeight(size: number, cell: number, seed: number): Float32Array {
  const rand = mulberry32(seed);
  const cols = Math.max(2, Math.round(size / cell));
  const step = size / cols;

  const px = new Float32Array(cols * cols);
  const py = new Float32Array(cols * cols);
  for (let i = 0; i < cols * cols; i++) {
    const cx = (i % cols) * step;
    const cy = Math.floor(i / cols) * step;
    px[i] = cx + rand() * step;
    py[i] = cy + rand() * step;
  }

  const height = new Float32Array(size * size);
  let min = Infinity;
  let max = -Infinity;

  for (let y = 0; y < size; y++) {
    const gy = Math.floor(y / step);
    for (let x = 0; x < size; x++) {
      const gx = Math.floor(x / step);

      let d1 = Infinity;
      let d2 = Infinity;

      // 3×3 neighbourhood is sufficient given points are jittered within
      // a single cell. Distance is toroidal, which is what makes it tile.
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const nx = (gx + ox + cols) % cols;
          const ny = (gy + oy + cols) % cols;
          const idx = ny * cols + nx;

          let dx = px[idx] - x;
          let dy = py[idx] - y;
          // Wrap each delta into [-size/2, size/2] so the left edge is
          // adjacent to the right edge and the seam disappears.
          dx -= Math.round(dx / size) * size;
          dy -= Math.round(dy / size) * size;

          const d = dx * dx + dy * dy;
          if (d < d1) {
            d2 = d1;
            d1 = d;
          } else if (d < d2) {
            d2 = d;
          }
        }
      }

      // F2 - F1 gives crisp cell *walls* — the creases between pebbles —
      // rather than blobby domes.
      const v = Math.sqrt(d2) - Math.sqrt(d1);
      height[y * size + x] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  const range = max - min || 1;
  for (let i = 0; i < height.length; i++) {
    height[i] = (height[i] - min) / range;
  }
  return height;
}

/** Cheap value noise for the fine fibre layer. */
function fibreNoise(size: number, seed: number): Float32Array {
  const rand = mulberry32(seed);
  const out = new Float32Array(size * size);
  for (let i = 0; i < out.length; i++) out[i] = rand();
  return out;
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function createLeatherMaps({
  color,
  grain = 26,
  roughness = 0.62,
  relief = 2.4,
  size = 512,
}: LeatherParams): CachedMaps {
  const key = `${color}|${grain}|${roughness}|${relief}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const height = worleyHeight(size, grain, 1337);
  const fibre = fibreNoise(size, 4242);
  const base = hexToRgb(color);

  const makeCanvas = () => {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    return c;
  };

  // ---- Albedo -------------------------------------------------------------
  const albedoCanvas = makeCanvas();
  const actx = albedoCanvas.getContext("2d")!;
  const albedo = actx.createImageData(size, size);

  // ---- Roughness ----------------------------------------------------------
  const roughCanvas = makeCanvas();
  const rctx = roughCanvas.getContext("2d")!;
  const rough = rctx.createImageData(size, size);

  for (let i = 0; i < size * size; i++) {
    const h = height[i];
    const f = fibre[i];

    // Creases sit darker; raised pebbles catch light. Subtle — real hide is
    // maybe 12% swing, not 50%.
    const shade = 0.82 + h * 0.26 + (f - 0.5) * 0.05;
    const o = i * 4;
    albedo.data[o] = Math.min(255, base.r * shade);
    albedo.data[o + 1] = Math.min(255, base.g * shade);
    albedo.data[o + 2] = Math.min(255, base.b * shade);
    albedo.data[o + 3] = 255;

    // Recessed creases hold finish and read glossier than the raised grain.
    const r = Math.min(1, Math.max(0, roughness + (h - 0.5) * 0.3 + (f - 0.5) * 0.08));
    const rv = r * 255;
    rough.data[o] = rv;
    rough.data[o + 1] = rv;
    rough.data[o + 2] = rv;
    rough.data[o + 3] = 255;
  }

  actx.putImageData(albedo, 0, 0);
  rctx.putImageData(rough, 0, 0);

  // ---- Normal (Sobel over the height field) -------------------------------
  const normalCanvas = makeCanvas();
  const nctx = normalCanvas.getContext("2d")!;
  const normal = nctx.createImageData(size, size);

  const at = (x: number, y: number) =>
    height[((y + size) % size) * size + ((x + size) % size)];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));

      const nx = dx * relief;
      const ny = dy * relief;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;

      const o = (y * size + x) * 4;
      normal.data[o] = ((nx / len) * 0.5 + 0.5) * 255;
      normal.data[o + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      normal.data[o + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      normal.data[o + 3] = 255;
    }
  }
  nctx.putImageData(normal, 0, 0);

  const finish = (canvas: HTMLCanvasElement, srgb: boolean) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };

  const maps: CachedMaps = {
    map: finish(albedoCanvas, true),
    normalMap: finish(normalCanvas, false),
    roughnessMap: finish(roughCanvas, false),
  };

  cache.set(key, maps);
  return maps;
}

export function disposeLeatherCache() {
  for (const maps of cache.values()) {
    maps.map.dispose();
    maps.normalMap.dispose();
    maps.roughnessMap.dispose();
  }
  cache.clear();
}
