import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const SPRIG_WIDTH = 240;
export const SPRIG_HEIGHT = 420;
type Point = [number, number, number];
type Tip = { point: Point; radius: number; count: number };
export type SprigPlan = { stems: Point[][]; tips: Tip[] };
const vector = (p: Point) => new THREE.Vector3(...p);

export function sprigPlan(variant: number): SprigPlan {
  // Sparse, unequal forks rather than a symmetrical bouquet. The cut ends
  // disappear beneath the rail; the flowering ends lie on the outer linen.
  if (variant === 2) {
    const original = sprigPlan(0);
    const bend = ([x, y, z]: Point): Point => [
      x + Math.sin(y * .021 + .7) * 6 * (1 - y / SPRIG_HEIGHT),
      24 + (y - 24) * .91,
      z * .88,
    ];
    return {
      stems: original.stems.map(stem => stem.map(bend)),
      tips: original.tips.map(tip => ({ point: bend(tip.point), radius: tip.radius * .88, count: tip.count - 2 })),
    };
  }
  if (variant === 0) return {
    stems: [
      [[207, 408, 4], [158, 307, 6], [106, 194, 7], [58, 66, 8]],
      [[176, 344, 5], [138, 268, 6], [81, 225, 8], [28, 170, 10]],
      [[132, 252, 7], [119, 207, 7], [112, 150, 9], [96, 112, 11]],
      [[100, 181, 7], [73, 155, 9], [40, 139, 10], [22, 114, 11]],
      [[157, 307, 6], [129, 289, 7], [71, 278, 8], [43, 254, 9]],
      [[74, 105, 8], [84, 77, 9], [82, 51, 10], [71, 37, 11]],
    ],
    tips: [
      {point:[58,66,8],radius:16,count:13}, {point:[28,170,10],radius:15,count:11},
      {point:[96,112,11],radius:14,count:12}, {point:[22,114,11],radius:12,count:9},
      {point:[43,254,9],radius:15,count:10}, {point:[71,37,11],radius:11,count:8},
    ],
  };
  return {
    stems: [
      [[211,408,4],[161,310,6],[101,203,8],[41,80,10]],
      [[167,321,6],[129,278,8],[73,256,9],[32,221,10]],
      [[116,228,7],[115,183,8],[99,124,11],[79,80,12]],
      [[91,183,8],[61,169,9],[30,148,10],[20,123,12]],
      [[63,125,9],[66,84,10],[55,56,11],[43,43,12]],
    ],
    tips: [
      {point:[41,80,10],radius:14,count:12}, {point:[32,221,10],radius:16,count:13},
      {point:[79,80,12],radius:16,count:13}, {point:[20,123,12],radius:12,count:9},
      {point:[43,43,12],radius:12,count:10},
    ],
  };
}

function randomSource(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function surface(columns: number, rows: number, sample: (u: number, v: number) => THREE.Vector3, color: (u: number, v: number) => THREE.Color) {
  const positions: number[] = [], colors: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) {
    const u = x / columns, v = y / rows, p = sample(u, v), c = color(u, v);
    positions.push(p.x, p.y, p.z); colors.push(c.r, c.g, c.b); uv.push(u, v);
    if (y < rows && x < columns) {
      const a = y * (columns + 1) + x, b = a + columns + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function fibreTexture() {
  const size = 256, data = new Uint8Array(size * size * 4), random = randomSource(1852);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const grain = random(), ridge = Math.sin(x * .31 + Math.sin(y * .045) * 1.8);
    const value = 185 + ridge * 16 + grain * 34;
    const i = (y * size + x) * 4;
    data[i] = grain > .992 ? value - 40 : value;
    data[i + 1] = 225 + grain * 30; data[i + 2] = value; data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

/** Original statice geometry: papery, five-fold calyces, faded corollas,
 * angular winged stems and curled dry leaves. No photographic texture assets. */
export function buildDriedSprig(variant: number, mirrored = false) {
  const random = randomSource(1837 + variant * 1597), plan = sprigPlan(variant);
  const texture = fibreTexture();
  const flowerMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: .91, metalness: 0, side: THREE.DoubleSide, bumpMap: texture, bumpScale: .09, roughnessMap: texture });
  const stemMaterial = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: .94, side: THREE.DoubleSide, bumpMap: texture, bumpScale: .12 });
  const flowers: THREE.BufferGeometry[] = [], stems: THREE.BufferGeometry[] = [];
  const brown = new THREE.Color('#887458'), pale = new THREE.Color('#d7bb98');
  const palette = ['#bd8892', '#c99da2', '#b67c89', '#d8b1b2', '#c394a1'];

  const twig = (points: Point[], radius: number) => {
    const curve = new THREE.CatmullRomCurve3(points.map(vector));
    const frames = curve.computeFrenetFrames(48, false), base = new THREE.Color('#8a8062');
    stems.push(surface(10, 48, (u, v) => {
      const i = Math.min(48, Math.round(v * 48)), angle = u * Math.PI * 2;
      const r = radius * (1 - v * .68) * (1 + Math.cos(angle * 3) * .22);
      return curve.getPoint(v).addScaledVector(frames.normals[i], Math.cos(angle) * r).addScaledVector(frames.binormals[i], Math.sin(angle) * r);
    }, (u, v) => base.clone().lerp(pale, .15 + Math.sin(u * Math.PI * 6 + v * 12) * .13)));
    return curve;
  };

  const dryLeaf = (origin: THREE.Vector3, angle: number, length: number) => {
    const geometry = surface(8, 24, (u, v) => {
      const across = (u - .5) * 2, width = Math.sin(Math.PI * v) * length * .10;
      return new THREE.Vector3(across * width + Math.sin(v * 3) * length * .09, -v * length, Math.abs(across) * 1.2 + v * v * 4 + Math.sin(v * 16 + across * 4) * .3);
    }, (u, v) => brown.clone().lerp(pale, .23 + Math.sin(v * 26) * .12 + Math.abs(u - .5) * .25));
    geometry.rotateZ(angle); geometry.translate(origin.x, origin.y, origin.z); stems.push(geometry);
  };

  plan.stems.forEach((points, index) => {
    const curve = twig(points, index === 0 ? 1.5 : .85);
    // Dried, irregular wings cling to the fluted stalk, especially at its forks.
    for (const side of [-1, 1]) {
      stems.push(surface(3, 32, (u, v) => {
        const p = curve.getPoint(.12 + v * .70), tangent = curve.getTangent(.12 + v * .70);
        const width = (1.3 + .8 * Math.sin(v * 24)) * Math.sin(Math.PI * v) * u;
        return p.add(new THREE.Vector3(-tangent.y * width * side, tangent.x * width * side, -.2 + Math.sin(v * 32) * .3 * u));
      }, (u, v) => brown.clone().lerp(pale, .18 + u * .2 + .10 * Math.sin(v * 17))));
    }
    for (const t of [.3, .54, .74]) if (random() > .25) dryLeaf(curve.getPoint(t), (random() - .5) * 2.2, 12 + random() * 14);
  });

  const floret = (point: THREE.Vector3, size: number) => {
    const rose = new THREE.Color(palette[Math.floor(random() * palette.length)]);
    const dry = new THREE.Color('#b7a085'), phase = random() * Math.PI * 2;
    const tilt = random() > .68 ? 2.9 : 1.5;
    const transform = new THREE.Matrix4().compose(point, new THREE.Quaternion().setFromEuler(new THREE.Euler((random() - .5) * tilt, (random() - .5) * tilt, phase)), new THREE.Vector3(size, size * (.85 + random() * .24), size));
    // A flared, hollow calyx, with five structural ribs and tiny dry creases.
    const cup = surface(70, 20, (u, v) => {
      const a = u * Math.PI * 2, rib = Math.cos(a * 5 + phase * .13);
      const wrinkle = Math.sin(a * 19 + v * 17 + phase) * .13 + Math.sin(a * 31 - v * 11) * .06;
      const uneven = 1 + Math.sin(a * 3 + phase) * .09 * v + Math.cos(a * 2 - phase) * .07 * v;
      const radius = ((.42 + Math.pow(v, 1.65) * 4.3) * (1 + rib * (.08 + v * .045)) + wrinkle * v) * uneven;
      const edge = Math.pow(v, 5) * (.32 * Math.cos(a * 5) + .27 * Math.sin(a * 13 + phase) + .32 * Math.sin(a * 3 - phase));
      return new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, v * 5 + edge + Math.sin(a * 10 + v * 7) * v * .24);
    }, (u, v) => {
      const c = rose.clone().lerp(brown, Math.max(0, .6 - v * .9));
      const wrinkles = Math.sin(u * Math.PI * 38 + v * 17 + phase) * .045;
      c.multiplyScalar(.84 + v * .19 + wrinkles);
      return c.lerp(dry, Math.pow(v, 9) * (.25 + .20 * Math.sin(u * 49 + phase)));
    });
    cup.applyMatrix4(transform); flowers.push(cup);
    // The actual flower is a smaller, faded cream centre inside the coloured calyx.
    if (random() > .28) {
      const center = surface(40, 5, (u, v) => {
        const a = u * Math.PI * 2, radius = v * (1.05 + .3 * Math.cos(a * 5));
        return new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 2.4 + v * .65 + Math.sin(a * 5) * v * .13);
      }, (_, v) => new THREE.Color('#c8b18c').lerp(new THREE.Color('#e9d5b8'), v * .8));
      center.applyMatrix4(transform); flowers.push(center);
    }
    for (let i = 0; i < 3; i++) {
      const bract = surface(3, 10, (u, v) => {
        const a = i / 3 * Math.PI * 2, width = Math.sin(v * Math.PI) * .55 * (u * 2 - 1);
        return new THREE.Vector3(Math.cos(a) * (.4 + v) - Math.sin(a) * width, Math.sin(a) * (.4 + v) + Math.cos(a) * width, -.8 + v * 2.8);
      }, (_, v) => brown.clone().lerp(pale, v * .24));
      bract.applyMatrix4(transform); stems.push(bract);
    }
  };

  plan.tips.forEach(({point, radius, count}) => {
    const root = vector(point);
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996 + random() * .7, spread = Math.sqrt((i + .3) / count) * radius;
      const end = root.clone().add(new THREE.Vector3(Math.cos(angle) * spread, Math.sin(angle) * spread * .67 - 5, 1 + random() * 6));
      const middle = root.clone().lerp(end, .6); middle.z += 1.5;
      twig([point, [middle.x, middle.y, middle.z], [end.x, end.y, end.z]], .3 + random() * .17);
      floret(end, .78 + random() * .34);
    }
  });

  const group = new THREE.Group();
  for (const [parts, material] of [[stems, stemMaterial], [flowers, flowerMaterial]] as const) {
    const geometry = mergeGeometries(parts); parts.forEach(p => p.dispose());
    const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  }
  if (mirrored) { group.scale.x = -1; group.position.x = SPRIG_WIDTH; }
  return { group, dispose: () => {
    group.traverse(o => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    flowerMaterial.dispose(); stemMaterial.dispose(); texture.dispose();
  } };
}
