import * as THREE from 'three';

export const frameScale = (width: number) => width < 650 ? .48 : width < 1100 ? .82 : 1;

/** Read the original sculptures as a relief die. Their depth and fine incisions
 * become cuts in a continuous metal surface, rather than separate ornaments. */
function reliefDie(group: THREE.Group, width: number, height: number, recess: THREE.Material, renderer: THREE.WebGLRenderer) {
  // Bake only the narrow metal strips. A single page-sized image reduced the
  // sampling density on long entries, losing the leaf veins and feather cuts.
  const border = Math.min(Math.ceil(140 * frameScale(width)), width / 2, height / 2);
  const tiles: { x: number; y: number; width: number; height: number; w: number; h: number; pixels: Uint8Array }[] = [];
  const addStrip = (x: number, y: number, stripWidth: number, stripHeight: number) => {
    const limit = Math.min(2048, renderer.capabilities.maxTextureSize / 3);
    for (let ty = 0; ty < stripHeight; ty += limit) for (let tx = 0; tx < stripWidth; tx += limit) {
      const tileWidth = Math.min(limit, stripWidth - tx), tileHeight = Math.min(limit, stripHeight - ty);
      const w = Math.ceil(tileWidth * 3), h = Math.ceil(tileHeight * 3);
      tiles.push({ x: x + tx, y: y + ty, width: tileWidth, height: tileHeight, w, h, pixels: new Uint8Array(w * h * 4) });
    }
  };
  addStrip(0, 0, width, border);
  addStrip(0, height - border, width, border);
  addStrip(0, border, border, height - border * 2);
  addStrip(width - border, border, border, height - border * 2);
  const material = new THREE.ShaderMaterial({
    uniforms: { cavity: { value: 0 } },
    vertexShader: `varying float relief; void main(){vec4 p=vec4(position,1.);
      #ifdef USE_INSTANCING
        p=instanceMatrix*p;
      #endif
      p=modelMatrix*p; relief=p.z; gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: 'varying float relief; uniform float cavity; void main(){gl_FragColor=vec4(clamp(relief/40.,0.,1.),cavity,0.,1.);}',
    side: THREE.DoubleSide, toneMapped: false,
  });
  group.traverse(object => {
    if (object instanceof THREE.Mesh) object.onBeforeRender = () => {
      material.uniforms.cavity.value = object.material === recess ? 1 : 0;
      material.uniformsNeedUpdate = true;
    };
  });
  const scene = new THREE.Scene(); scene.add(group); scene.overrideMaterial = material;
  const previousTarget = renderer.getRenderTarget(), shadows = renderer.shadowMap.enabled;
  try {
    renderer.shadowMap.enabled = false;
    for (const tile of tiles) {
      const { x, y, width: tw, height: th, w, h, pixels } = tile;
      const target = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true, samples: 4 });
      const camera = new THREE.OrthographicCamera(x, x + tw, y, y + th, .1, 200); camera.position.z = 100;
      try {
        renderer.setRenderTarget(target); renderer.clear(); renderer.render(scene, camera);
        renderer.readRenderTargetPixels(target, 0, 0, w, h, pixels);
      } finally { renderer.setRenderTarget(previousTarget); target.dispose(); }
    }
  } finally {
    renderer.setRenderTarget(previousTarget); renderer.shadowMap.enabled = shadows;
    material.dispose(); scene.remove(group);
  }
  // Bilinear sampling keeps the fine feather and leaf cuts smooth on the grid.
  return (x: number, y: number) => {
    const tile = tiles.find(t => x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + t.height);
    if (!tile) return 0;
    const { w, h, pixels } = tile;
    const px = Math.max(0, Math.min(w - 1.001, (x - tile.x) / tile.width * w - .5));
    const py = Math.max(0, Math.min(h - 1.001, (1 - (y - tile.y) / tile.height) * h - .5));
    const ix = Math.floor(px), iy = Math.floor(py), fx = px - ix, fy = py - iy;
    let depth = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const i = ((iy + dy) * w + ix + dx) * 4;
      const alpha = pixels[i + 3] / 255, relief = pixels[i] / 255 * 40;
      // Raised portions of the die remain higher within a sunken carving;
      // even its highest point stays below the uncut face of the frame.
      depth += alpha * (Math.max(.35, 3.3 - relief * .13) + pixels[i + 1] / 255 * .8) * (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy);
    }
    return depth;
  };
}

const profile = [[0, .8], [1, 3], [3, 8.4], [5, 10], [7, 9], [9, 5], [11, 4], [12.5, 6], [14, 7], [18, 7], [20, 4], [22, 4.2], [24, 6.4], [26, 6.6], [54, 6.6], [56, 6.4], [58, 4], [60, 5], [62, 8], [64, 9.5], [66, 7.4], [67.5, 4.4], [68.6, 2.3], [69.1, 1.65], [69.55, 1.95], [70, .35]];
const profileSlopes = profile.map((p, i) => {
  const before = profile[Math.max(0, i - 1)], after = profile[Math.min(profile.length - 1, i + 1)];
  const left = (p[1] - before[1]) / (p[0] - before[0] || 1);
  const right = (after[1] - p[1]) / (after[0] - p[0] || 1);
  if (!i) return right;
  if (i === profile.length - 1) return left;
  return left * right > 0 ? 2 * left * right / (left + right) : 0;
});
const smooth = (a: number, b: number, value: number) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t); };

function roundedInset(u: number, length: number, distance: number, scale: number) {
  const radius = 170 * smooth(21, 70, distance) * scale, base = distance * scale;
  const t = Math.min(u, 1 - u);
  if (!radius || t >= radius / (length - 2 * base)) return base;
  // Intersect each mitred parameter line with the same circular corner.
  // Both adjoining rails therefore share a tangent at their join.
  const center = base + radius, a = 1 - 2 * t, b = t * length - center;
  const qa = a * a + 1, qb = 2 * (a * b - center), qc = b * b + center * center - radius * radius;
  return (-qb - Math.sqrt(Math.max(0, qb * qb - 4 * qa * qc))) / (2 * qa);
}

function frameInset(u: number, length: number, distance: number, scale: number, crest: boolean) {
  const crown = crest ? 26 * Math.exp(-Math.pow((u * length - length / 2) / (123 * scale), 4)) : 0;
  return roundedInset(u, length, distance, scale) + crown * smooth(21, 70, distance) * scale;
}

/** The actual paper opening, including the curved shoulders and crest. */
export function frameOpening(width: number, height: number, scale: number) {
  const points: THREE.Vector2[] = [];
  for (let side = 0; side < 4; side++) {
    const length = side % 2 ? height : width, steps = Math.ceil(length / 1.25);
    for (let i = 0; i < steps; i++) {
      const u = i / steps, inset = frameInset(u, length, 70, scale, side === 0);
      const along = inset + (length - 2 * inset) * u;
      points.push(new THREE.Vector2(
        side === 0 ? along : side === 1 ? width - inset : side === 2 ? width - along : inset,
        side === 0 ? inset : side === 1 ? along : side === 2 ? height - inset : height - along,
      ));
    }
  }
  return points;
}

export function carveFrame(die: THREE.Group, width: number, height: number, scale: number, material: THREE.Material, recess: THREE.Material, renderer: THREE.WebGLRenderer) {
  const cutAt = reliefDie(die, width, height, recess, renderer);
  const group = new THREE.Group();
  for (let side = 0; side < 4; side++) {
    const length = side % 2 ? height : width;
    const columns = Math.ceil(length / .72), baseRows = Math.round(112 + scale * 56);
    // Preserve the tiny rolled lip and its undercut instead of averaging them
    // away between uniform mesh rows.
    const distances = [...new Set([
      ...Array.from({ length: baseRows + 1 }, (_, i) => i / baseRows * 70),
      ...profile.map(p => p[0]), 68.85, 69.3, 69.75, 69.9,
      ...Array.from({ length: 17 }, (_, i) => 62.5 + i * .25),
    ])].sort((a, b) => a - b);
    const rows = distances.length - 1;
    const count = (columns + 1) * (rows + 1);
    const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), uv = new Float32Array(count * 2);
    const surface = new Float32Array(count * 2);
    const indices = new Uint32Array(columns * rows * 6); let index = 0;
    for (let row = 0; row <= rows; row++) {
      const d = distances[row];
      const segment = Math.min(profile.length - 2, Math.max(0, profile.findIndex((_, i) => i < profile.length - 1 && d <= profile[i + 1][0])));
      const a = profile[segment], b = profile[segment + 1];
      // Monotone cubic mouldings have continuous tangents, preserving the flat
      // engraving ground while removing faceted highlights on the rounded lips.
      const span = b[0] - a[0], t = (d - a[0]) / span, t2 = t * t, t3 = t2 * t;
      const z = (2 * t3 - 3 * t2 + 1) * a[1] + (t3 - 2 * t2 + t) * span * profileSlopes[segment]
        + (-2 * t3 + 3 * t2) * b[1] + (t3 - t2) * span * profileSlopes[segment + 1];
      for (let col = 0; col <= columns; col++) {
        const u = col / columns;
        // Widened corner shoulders and a continuous crest support the motifs.
        const distance = frameInset(u, length, d, scale, side === 0);
        const t = distance + (length - 2 * distance) * u;
        const x = side === 0 ? t : side === 1 ? width - distance : side === 2 ? width - t : distance;
        const y = side === 0 ? distance : side === 1 ? t : side === 2 ? height - distance : height - t;
        const field = smooth(10, 12, d) * (1 - smooth(18, 21, d)) + smooth(22, 25, d) * (1 - smooth(54, 58, d));
        // A restrained, chased leaf trail follows the convex inner moulding.
        // Complete repeats meet at each mitre; the rolled contact edge stays fine.
        const repeat = u * Math.max(1, Math.round(length / (18 * scale))) * 18;
        const phase = repeat % 18 - 9;
        const stalk = 64.55 + .27 * Math.sin(repeat / 18 * Math.PI * 2);
        const stemCut = Math.exp(-Math.pow((d - stalk) / .22, 2)) * .23;
        const leaf = (cx: number, cy: number, tilt: number) => {
          const dy = d - cy, dx = phase - cx + dy * tilt;
          const edge = Math.hypot(dx / 2.35, dy / .7);
          return Math.exp(-Math.pow((edge - 1) / .20, 2)) * .24;
        };
        const chasing = d > 62.4 && d < 66.6 ? stemCut + leaf(-3.6, 65.35, .95) + leaf(3.6, 63.75, .95) : 0;
        const cut = cutAt(x, y) * field + chasing;
        const p = row * (columns + 1) + col;
        positions[p * 3] = x; positions[p * 3 + 1] = y; positions[p * 3 + 2] = z * scale - cut * scale;
        uv[p * 2] = x / 160; uv[p * 2 + 1] = y / 160;
        surface[p * 2] = cut / 4;
        const lipPolish = smooth(68.8, 69.5, d) * (1 - smooth(69.55, 70, d)) * .55;
        surface[p * 2 + 1] = (smooth(6.7, 9.5, z) + lipPolish) * (1 - Math.min(1, cut));
        const patina = .94 - cut * .085 - (1 - smooth(3, 8, z)) * .12;
        colors[p * 3] = patina; colors[p * 3 + 1] = patina * .99; colors[p * 3 + 2] = patina * .965;
        if (row < rows && col < columns) {
          const q = p + columns + 1;
          indices.set([p, p + 1, q, p + 1, q + 1, q], index); index += 6;
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geometry.setAttribute('metalSurface', new THREE.BufferAttribute(surface, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1)); geometry.computeVertexNormals();
    const panel = new THREE.Mesh(geometry, material); panel.castShadow = true; panel.receiveShadow = true; group.add(panel);
  }
  return group;
}
