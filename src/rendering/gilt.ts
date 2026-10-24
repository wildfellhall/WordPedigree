import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type Surface = (u: number, v: number) => THREE.Vector3;
const point = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function surface(columns: number, rows: number, sample: Surface, tone?: (u: number, v: number) => number) {
  const positions: number[] = [], uv: number[] = [], colors: number[] = [], indices: number[] = [];
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const u = col / columns, v = row / rows;
    const p = sample(u, v);
    positions.push(p.x, p.y, p.z); uv.push(u, v);
    const shade = tone?.(u, v) ?? 1;
    colors.push(shade, shade, shade);
    if (row < rows && col < columns) {
      const a = row * (columns + 1) + col, b = a + columns + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function metalTexture() {
  const size = 256, data = new Uint8Array(size * size * 4);
  let seed = 1871;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < size * size; i++) {
    const grain = 205 + random() * 38;
    const pitted = random() > .991 ? 115 : grain;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = pitted;
    data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

export function makeMaterials(texture: THREE.Texture) {
  const common = { metalness: .79, roughness: .66, bumpMap: texture, bumpScale: .12, roughnessMap: texture, envMapIntensity: .38, side: THREE.DoubleSide };
  return {
    brass: new THREE.MeshStandardMaterial({ ...common, color: '#a68a5e', vertexColors: true }),
    carved: new THREE.MeshStandardMaterial({ ...common, color: '#9f875e', vertexColors: true, roughness: .86, metalness: .67, envMapIntensity: .23 }),
    raised: new THREE.MeshStandardMaterial({ ...common, color: '#b49b70', roughness: .69, envMapIntensity: .27 }),
    recess: new THREE.MeshStandardMaterial({ ...common, color: '#514632', roughness: .78, metalness: .6 }),
  };
}
type Materials = ReturnType<typeof makeMaterials>;

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, group: THREE.Group) {
  const item = new THREE.Mesh(geometry, material);
  item.castShadow = true; item.receiveShadow = true; group.add(item);
  return item;
}
function thread(points: THREE.Vector3[], radius: number, material: THREE.Material, group: THREE.Group, segments = 28) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 5, false), material, group);
}
function ellipsoid(x: number, y: number, z: number, sx: number, sy: number, sz: number, material: THREE.Material, group: THREE.Group) {
  const item = mesh(new THREE.SphereGeometry(1, 20, 14), material, group);
  item.position.set(x, y, z); item.scale.set(sx, sy, sz); return item;
}

function rail(width: number, height: number, scale: number, materials: Materials, group: THREE.Group) {
  const profile = [[0, .7], [1, 2.5], [2, 4.1], [3, 4.5], [4, 3.7], [5, 2.4], [7, 1.7], [8, 2.8], [10, 4.2], [12, 4.8], [14, 4.5], [18, 2.5], [21, .9], [22, 1.1], [23, 2.8], [24.5, 5.2], [26, 5.5], [27, 4], [29, 1.2], [30, .3]];
  const parts: THREE.BufferGeometry[] = [];
  for (let side = 0; side < 4; side++) {
    parts.push(surface(1, profile.length - 1, (u, v) => {
      const [distance, relief] = profile[Math.round(v * (profile.length - 1))];
      const d = distance * scale, z = relief * scale;
      if (side === 0) return point(d + (width - 2 * d) * u, d, z);
      if (side === 1) return point(width - d, d + (height - 2 * d) * u, z);
      if (side === 2) return point(width - d - (width - 2 * d) * u, height - d, z);
      return point(d, height - d - (height - 2 * d) * u, z);
    }, (_, v) => .72 + .28 * Math.min(1, profile[Math.round(v * (profile.length - 1))][1] / 4)));
  }
  mesh(mergeGeometries(parts), materials.brass, group);
  parts.forEach(part => part.dispose());

  const offset = 6.5 * scale, step = 7.8 * scale;
  const horizontalCount = Math.floor((width - 2 * offset) / step);
  const verticalCount = Math.floor((height - 2 * offset) / step);
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), materials.raised, 2 * (horizontalCount + verticalCount));
  const dummy = new THREE.Object3D(); let index = 0;
  const bead = (x: number, y: number) => {
    dummy.position.set(x, y, 2.5 * scale); dummy.scale.set(1.1 * scale, 1.1 * scale, .85 * scale); dummy.updateMatrix();
    beads.setMatrixAt(index++, dummy.matrix);
  };
  for (let i = 0; i < horizontalCount; i++) { bead(offset + i * step, offset); bead(offset + i * step, height - offset); }
  for (let i = 0; i < verticalCount; i++) { bead(offset, offset + i * step); bead(width - offset, offset + i * step); }
  beads.castShadow = true; beads.receiveShadow = true; group.add(beads);
}

function acanthus(length: number, breadth: number, bend: number, materials: Materials) {
  const group = new THREE.Group();
  const outline = [[0, .06], [.1, .35], [.18, .7], [.24, 1], [.31, .42], [.38, .87], [.44, 1.06], [.51, .4], [.58, .8], [.65, .85], [.72, .3], [.8, .55], [.87, .42], [.94, .15], [1, 0]];
  const sample = (u: number, t: number) => {
    const s = u * 2 - 1;
    const index = Math.min(outline.length - 2, Math.max(0, outline.findIndex((_, i) => i < outline.length - 1 && t <= outline[i + 1][0])));
    const a = outline[index], b = outline[index + 1];
    const f = (t - a[0]) / (b[0] - a[0]), smooth = f * f * (3 - 2 * f);
    const width = breadth * (a[1] + (b[1] - a[1]) * smooth) * (.94 + .06 * Math.cos(t * Math.PI * 42));
    const tip = Math.max(0, (t - .84) / .16);
    const z = 3 + 3.4 * Math.pow(1 - Math.abs(s), .7) * Math.sqrt(Math.max(0, Math.sin(Math.PI * t))) + .55 * Math.sin(t * Math.PI * 8) * s * s + Math.sin(tip * Math.PI) * 3 + tip * tip * 2;
    return point(s * width + bend * t * t, -length * t + tip * tip * length * .075, z);
  };
  mesh(surface(20, 100, sample, (u, v) => .74 + .22 * Math.sin(Math.PI * u) + .04 * Math.sin(v * 13)), materials.carved, group);
  // A solid edge makes the leaf a relief carving rather than a folded sheet.
  for (const edge of [0, 1]) {
    mesh(surface(1, 100, (u, v) => sample(edge, v).add(point(0, 0, -u * 1.1)), () => .64), materials.carved, group);
  }
  const spine = Array.from({ length: 24 }, (_, i) => sample(.5, i / 23).add(point(0, 0, .27)));
  thread(spine, .27, materials.raised, group, 40);
  for (const t of [.24, .44, .65, .82]) for (const side of [-1, 1]) {
    const vein = Array.from({ length: 8 }, (_, j) => sample(.5 + side * j / 7 * .44, t - .11 + j / 7 * .11).add(point(0, 0, .13)));
    thread(vein, .13, materials.recess, group, 12);
    const lip = Array.from({ length: 8 }, (_, j) => sample(.5 + side * j / 7 * .42, t - .12 + j / 7 * .11).add(point(0, 0, .2)));
    thread(lip, .12, materials.raised, group, 12);
    for (const branch of [.35, .66]) {
      const incision = Array.from({ length: 5 }, (_, j) => sample(.5 + side * (branch * .4 + j / 4 * .1), t - .11 + branch * .11 - j / 4 * .035).add(point(0, 0, .16)));
      thread(incision, .075, materials.recess, group, 7);
    }
  }
  return group;
}

function volute(radius: number, materials: Materials) {
  const group = new THREE.Group();
  const sample = (u: number, t: number) => {
    const angle = t * Math.PI * 1.9, r = radius * (1 - .91 * t);
    const width = (.35 + 2.2 * Math.pow(Math.sin(Math.PI * t), .7)) * (u * 2 - 1);
    return point(Math.cos(angle) * (r + width), Math.sin(angle) * (r + width), 4 + t * 2 + Math.sin(u * Math.PI) * 2.1);
  };
  mesh(surface(10, 85, sample, (u) => .66 + Math.sin(u * Math.PI) * .3), materials.brass, group);
  for (const edge of [0, 1]) {
    mesh(surface(1, 85, (u, v) => sample(edge, v).add(point(0, 0, -u * 1.2)), () => .63), materials.brass, group);
    thread(Array.from({ length: 70 }, (_, i) => sample(edge, i / 69).add(point(0, 0, .1))), .22, materials.raised, group, 90);
  }
  thread(Array.from({ length: 70 }, (_, i) => sample(.52, i / 69).add(point(0, 0, .1))), .12, materials.recess, group, 90);
  return group;
}

function shell(length: number, materials: Materials) {
  const group = new THREE.Group(), flutes = 11;
  const sample = (u: number, t: number) => {
    const angle = (u - .5) * 2.6;
    const rib = .5 + .5 * Math.cos(u * Math.PI * 2 * flutes);
    const r = length * t * (.94 + .06 * rib);
    const z = 4 + Math.sin(t * Math.PI * .9) * 4 + rib * Math.sin(Math.PI * t * .7) * 2.4;
    return point(Math.sin(angle) * r, -Math.cos(angle) * r, z);
  };
  mesh(surface(99, 32, sample, (u, v) => .68 + .25 * (.5 + .5 * Math.cos(u * Math.PI * 2 * flutes)) + .07 * v), materials.brass, group);
  thread(Array.from({ length: 100 }, (_, i) => sample(i / 99, 1)), .48, materials.raised, group, 110);
  for (let i = 0; i <= flutes; i++) {
    thread(Array.from({ length: 24 }, (_, j) => sample(i / flutes, .13 + j / 23 * .84).add(point(0, 0, .2))), .18, materials.raised, group, 26);
  }
  ellipsoid(0, -2, 7, 4.1, 2.3, 2.3, materials.raised, group);
  for (const side of [-1, 1]) {
    mesh(surface(8, 18, (u, v) => point(side * length * (.055 + .25 * u * (1 - v * .5)), -length * (.035 + .27 * v), 3.8 + Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 1.5), () => .8), materials.brass, group);
  }
  return group;
}

function carvedBorder(width: number, height: number, scale: number, materials: Materials, group: THREE.Group) {
  const placements: { x: number; y: number; angle: number }[] = [];
  const step = 18 * scale, inset = 15.5 * scale, end = 44 * scale;
  for (let x = end; x < width - end; x += step) {
    placements.push({ x, y: inset, angle: 0 }, { x: width - x, y: height - inset, angle: Math.PI });
  }
  for (let y = end; y < height - end; y += step) {
    placements.push({ x: width - inset, y, angle: Math.PI / 2 }, { x: inset, y: height - y, angle: -Math.PI / 2 });
  }
  const egg = new THREE.SphereGeometry(1, 12, 8);
  egg.scale(2.1, 3.4, 1.3); egg.translate(0, 0, 4.9);
  const eggPositions = egg.getAttribute('position');
  for (let i = 0; i < eggPositions.count; i++) eggPositions.setX(i, eggPositions.getX(i) * (1 - .17 * eggPositions.getY(i) / 3.4));
  egg.computeVertexNormals();
  const cup = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([point(-3.3, -3.8, 4.5), point(-3.6, 0, 4.6), point(-2.5, 3.4, 4.5), point(0, 4.5, 4.4), point(2.5, 3.4, 4.5), point(3.6, 0, 4.6), point(3.3, -3.8, 4.5)]), 22, .42, 5, false);
  const dart = new THREE.ConeGeometry(1.4, 6.5, 4);
  dart.scale(1, 1, .45); dart.translate(9, 0, 4.5);
  for (const geometry of [egg, dart]) {
    // Instanced brass shares the cavity-colour shader used by the carvings.
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3).fill(.92), 3));
  }
  for (const [geometry, material] of [[egg, materials.brass], [cup, materials.raised], [dart, materials.brass]] as const) {
    const carving = new THREE.InstancedMesh(geometry, material, placements.length);
    const dummy = new THREE.Object3D();
    placements.forEach(({ x, y, angle }, index) => {
      dummy.position.set(x, y, 0); dummy.rotation.z = angle; dummy.scale.setScalar(scale); dummy.updateMatrix();
      carving.setMatrixAt(index, dummy.matrix);
    });
    carving.castShadow = true; carving.receiveShadow = true; group.add(carving);
  }
}

function sideCartouche(materials: Materials) {
  const group = new THREE.Group();
  const fan = shell(30, materials); fan.rotation.z = Math.PI / 2; fan.position.set(9, 0, 2); group.add(fan);
  for (const side of [-1, 1]) {
    const curl = volute(14, materials); curl.position.set(22, side * 37, 1); curl.scale.y = side; curl.rotation.z = -Math.PI / 2; group.add(curl);
    const leaf = acanthus(39, 6.2, 4, materials); leaf.position.set(16, side * 39, 0); leaf.scale.y = side; group.add(leaf);
  }
  return group;
}

function roseBloom(radius: number, materials: Materials) {
  const group = new THREE.Group();
  for (let layer = 0; layer < 3; layer++) {
    const petals = 8 - layer * 2, extent = radius * (1 - layer * .27);
    for (let petal = 0; petal < petals; petal++) {
      const angle = petal / petals * Math.PI * 2 + layer * .6;
      const sample = (u: number, v: number) => {
        const arc = angle + (u - .5) * 1.35 * Math.pow(Math.sin(Math.PI * v), .35);
        const r = extent * (.16 + .84 * v);
        const curl = Math.pow(Math.abs(u - .5) * 2, 3) * v * 1.4;
        return point(Math.cos(arc) * r, Math.sin(arc) * r, 5 + layer * 2.2 + Math.sin(v * Math.PI) * 3.2 - v * 1.6 + curl);
      };
      mesh(surface(12, 17, sample, (u, v) => .65 + .3 * Math.sin(v * Math.PI) + .05 * Math.sin(u * Math.PI)), materials.brass, group);
      thread(Array.from({ length: 22 }, (_, i) => sample(i / 21, .92)), .14, materials.raised, group, 24);
    }
  }
  ellipsoid(0, 0, 10.6, 1.5, 1.5, 1.8, materials.raised, group);
  return group;
}

function laurelLeaf(length: number, materials: Materials) {
  const group = new THREE.Group();
  const sample = (u: number, v: number) => {
    const s = u * 2 - 1, width = length * .22 * Math.pow(Math.sin(Math.PI * v), .9);
    return point(s * width + v * v * 2, -length * v, 1 + Math.sin(v * Math.PI) * (1.7 - Math.abs(s) * 1.3) + v * v);
  };
  mesh(surface(8, 22, sample, (u) => .72 + .26 * Math.sin(u * Math.PI)), materials.brass, group);
  thread(Array.from({ length: 16 }, (_, i) => sample(.5, i / 15)), .18, materials.raised, group, 18);
  for (let i = 2; i < 7; i++) for (const side of [-1, 1]) {
    thread([sample(.5, i / 9), sample(.5 + side * .25, i / 9 + .08), sample(.5 + side * .43, i / 9 + .14)], .07, materials.recess, group, 5);
  }
  return group;
}

function ribbonBow(materials: Materials) {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([point(0, 0, 5), point(side * 12, -7, 7), point(side * 20, -3, 8), point(side * 13, 5, 6), point(0, 0, 5)]);
    mesh(surface(8, 40, (u, v) => {
      const p = curve.getPoint(v), tangent = curve.getTangent(v);
      p.addScaledVector(point(-tangent.y, tangent.x, 0).normalize(), (u - .5) * 4.8);
      p.z += Math.sin(u * Math.PI) * .9;
      return p;
    }, (u) => .7 + .3 * Math.sin(u * Math.PI)), materials.brass, group);
    mesh(surface(8, 20, (u, v) => point(side * (3 + v * 10 + (u - .5) * 5), v * 18, 4 + Math.sin(v * Math.PI * 2) * 1.5 + Math.sin(u * Math.PI)), (u) => .7 + .3 * Math.sin(u * Math.PI)), materials.brass, group);
  }
  ellipsoid(0, 0, 6.5, 2.5, 3, 2, materials.raised, group); return group;
}

function garland(span: number, materials: Materials) {
  const group = new THREE.Group();
  const curve = new THREE.CubicBezierCurve3(point(0, 0, 4), point(span * .3, 32, 4), point(span * .7, 32, 4), point(span, 0, 4));
  thread(curve.getPoints(55), .65, materials.raised, group, 65);
  const count = Math.floor(span / 22);
  for (let i = 1; i < count; i++) {
    const t = i / count, center = curve.getPoint(t), tangent = curve.getTangent(t);
    for (const side of [-1, 1]) {
      const leaf = laurelLeaf(17 + Math.sin(i * 2.1) * 2, materials);
      leaf.position.copy(center); leaf.rotation.z = Math.atan2(tangent.y, tangent.x) + Math.PI / 2 + side * .75;
      group.add(leaf);
    }
    if (i % 3 === 0) for (const side of [-1, 1]) ellipsoid(center.x + side * 2.2, center.y + 2.5, 6.2, 1.2, 1.4, 1.1, materials.raised, group);
  }
  for (const t of [0, 1]) {
    const bow = ribbonBow(materials); bow.scale.setScalar(.6); bow.position.copy(curve.getPoint(t)); bow.position.z += 3; group.add(bow);
  }
  return group;
}

/** A continuous, pierced running scroll along the inner moulding. Each wire
 * has a round section; small leaf terminals sit above it and cast real shadows. */
function filigreeRun(length: number, materials: Materials) {
  const group = new THREE.Group();
  const count = Math.max(1, Math.round(length / 66)), pitch = length / count;
  for (let i = 0; i < count; i++) {
    const unit = new THREE.Group(); unit.position.x = i * pitch; unit.scale.x = pitch / 66;
    const stem = new THREE.CatmullRomCurve3([
      point(0, 7, 2), point(12, 7, 2), point(23, 1.4, 2.5),
      point(33, 7, 3), point(43, 12.6, 2.5), point(54, 7, 2), point(66, 7, 2),
    ]);
    thread(stem.getPoints(44), .43, materials.raised, unit, 48);
    // A second, finer strand rolls around the first rather than sitting flat.
    thread(Array.from({ length: 89 }, (_, j) => {
      const t = j / 88, p = stem.getPoint(t), tangent = stem.getTangent(t);
      const phase = t * Math.PI * 18;
      p.addScaledVector(point(-tangent.y, tangent.x, 0).normalize(), Math.sin(phase) * .39);
      p.z += Math.cos(phase) * .39;
      return p;
    }), .12, materials.raised, unit, 96);
    for (const flip of [false, true]) {
      const scroll = [point(10, 7, 2.3), point(18, 4, 2.8), point(26, 5, 3.2), point(29, 10, 3.4), point(26, 14, 3.5), point(20, 13, 3.4), point(19, 9, 3.1), point(22, 8, 3), point(24, 10, 3.2)];
      const transform = (p: THREE.Vector3) => flip ? point(66 - p.x, 14 - p.y, p.z) : p;
      thread(scroll.map(transform), .37, materials.raised, unit, 54);
      const terminal = transform(point(24, 10, 3.2));
      ellipsoid(terminal.x, terminal.y, terminal.z, .68, .8, .55, materials.raised, unit);
      const leaf = laurelLeaf(7.8, materials);
      leaf.position.copy(transform(point(32, 7, 2.7)));
      leaf.rotation.z = flip ? Math.PI * 1.25 : Math.PI * .25;
      unit.add(leaf);
    }
    group.add(unit);
  }
  return group;
}

function innerFiligree(width: number, height: number, scale: number, materials: Materials, group: THREE.Group) {
  const margin = width < 650 ? 92 : 160, inset = 32 * scale;
  // Reserve the corner carvings and side cartouches instead of crossing them.
  for (const side of [-1, 1]) {
    for (const [start, end] of [[margin, height / 2 - 76 * scale], [height / 2 + 76 * scale, height - margin]]) {
      if (end - start < 35) continue;
      const run = filigreeRun((end - start) / scale, materials);
      run.rotation.z = Math.PI / 2;
      run.scale.set(scale, side * scale, scale);
      run.position.set(side === 1 ? width - inset : inset, start, 0);
      group.add(run);
    }
  }
  for (const [start, end] of [[margin, width / 2 - 92 * scale], [width / 2 + 92 * scale, width - margin]]) {
    if (end - start < 35) continue;
    const run = filigreeRun((end - start) / scale, materials);
    run.position.set(start, height - inset, 0); run.scale.set(scale, -scale, scale); group.add(run);
  }
}

function corner(materials: Materials) {
  const group = new THREE.Group();
  for (const [length, breadth, rotation, bend] of [[108, 13, 90, 3], [108, 13, 180, -3], [111, 19, 135, 1]]) {
    const leaf = acanthus(length, breadth, bend, materials); leaf.position.set(29, 29, 3); leaf.rotation.z = rotation * Math.PI / 180; group.add(leaf);
  }
  // Curled stems have a physical circular section and cast narrow contact shadows.
  for (const flip of [false, true]) {
    const points = [[30, 31, 4], [60, 34, 4], [91, 25, 4], [110, 11, 4], [120, 8, 4], [129, 15, 4], [126, 24, 4], [118, 25, 4], [116, 19, 4]].map(([x, y, z]) => flip ? point(y, x, z) : point(x, y, z));
    thread(points, .8, materials.raised, group, 70);
  }
  const bloom = roseBloom(12, materials); bloom.position.set(27, 27, 5); group.add(bloom);
  for (const [x, y, rotation] of [[87, 51, Math.PI / 2], [51, 87, 0]]) {
    const scroll = volute(21, materials); scroll.position.set(x, y, 2); scroll.rotation.z = rotation; group.add(scroll);
  }
  for (const flip of [false, true]) {
    const stem = [point(36, 36, 5), point(62, 42, 5), point(88, 53, 5), point(87, 72, 6)].map(p => flip ? point(p.y, p.x, p.z) : p);
    thread(stem, .68, materials.raised, group, 40);
  }
  const fan = shell(34, materials); fan.position.set(32, 32, 4); fan.rotation.z = Math.PI * .75; group.add(fan);
  // Fine outward sprays continue the larger leaves into the running border.
  for (const flip of [false, true]) {
    const points = [[102, 31, 3], [118, 37, 3.3], [137, 37, 3.5], [147, 31, 3.7], [148, 24, 3.8], [143, 20, 3.7], [137, 23, 3.5], [138, 28, 3.7], [142, 28, 3.9]].map(([x, y, z]) => flip ? point(y, x, z) : point(x, y, z));
    thread(points, .5, materials.raised, group, 60);
    for (const [x, y, angle] of [[123, 37, 1.2], [131, 36, 1.8]]) {
      const leaf = laurelLeaf(10, materials);
      leaf.position.set(flip ? y : x, flip ? x : y, 3.8);
      leaf.rotation.z = flip ? Math.PI / 2 - angle : angle; group.add(leaf);
    }
  }
  return group;
}

const gaussian = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) => Math.exp(-.5 * (((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
function faceHeight(x: number, y: number) {
  let z = 6 * Math.sqrt(Math.max(.015, 1 - (x / 18) ** 2 - (y / 25) ** 2));
  z += 1.1 * gaussian(x, y, 0, -12, 10, 6);
  for (const side of [-1, 1]) {
    z += .6 * gaussian(x, y, side * 6.2, -5.5, 2.8, 1.2);
    z -= 1.05 * gaussian(x, y, side * 6.2, -2, 3.2, 1.9);
    z += 2.1 * gaussian(x, y, side * 8, 5.7, 4.1, 3.8);
    z -= .4 * gaussian(x, y, side * 2.2, 5.9, .6, .45);
    z += .6 * gaussian(x, y, side * 1.4, 10, 1.7, .7);
  }
  z += 1.25 * gaussian(x, y, 0, -.3, 1.5, 5.2);
  z += 1.9 * gaussian(x, y, 0, 4.5, 2.3, 1.9);
  z -= .45 * gaussian(x, y, 0, 8, .6, 1.3);
  z -= .6 * gaussian(x, y, 0, 11, 3.2, .3);
  z += .7 * gaussian(x, y, 0, 12, 3.1, .8);
  z += 1.2 * gaussian(x, y, 0, 16.8, 4.1, 2.3);
  return z + 10;
}

function feather(start: THREE.Vector3, end: THREE.Vector3, breadth: number, lift: number, materials: Materials) {
  const group = new THREE.Group();
  const direction = end.clone().sub(start); const perpendicular = point(-direction.y, direction.x, 0).normalize();
  const sample = (u: number, t: number) => {
    const s = u * 2 - 1;
    const center = start.clone().lerp(end, t); center.y -= Math.sin(t * Math.PI) * 6;
    const width = breadth * Math.pow(Math.sin(t * Math.PI), .7) * (t > .7 ? .8 : 1);
    const p = center.addScaledVector(perpendicular, width * s);
    p.z += lift + (1 - Math.abs(s)) * 1.15 * Math.sin(t * Math.PI);
    return p;
  };
  mesh(surface(10, 28, sample, (u) => .81 + .19 * Math.sin(Math.PI * u)), materials.brass, group);
  thread(Array.from({ length: 14 }, (_, i) => sample(.5, i / 13).add(point(0, 0, .1))), .13, materials.raised, group, 22);
  for (let t = .22; t < .88; t += .1) for (const side of [-1, 1]) {
    thread([sample(.5, t), sample(.5 + side * .25, t + .04), sample(.5 + side * .43, t + .08)], .055, materials.recess, group, 5);
  }
  return group;
}

function cherub(materials: Materials) {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 11; i++) {
      const wing = feather(point(side * (12 + i * .8), 35 + i * .8, 3), point(side * (104 - i * 5.7), 2 + i * 4.5, 3), 4.5 + i * .17, i * .23, materials);
      group.add(wing);
    }
    for (let i = 0; i < 7; i++) {
      group.add(feather(point(side * 12, 33, 6), point(side * (55 - i * 4.5), 14 + i * 4, 7), 4, 2, materials));
    }
  }
  const face = new THREE.Group(); face.position.y = 34;
  mesh(surface(90, 110, (u, v) => {
    const y = -22 + v * 44;
    const x = (u * 2 - 1) * 16.2 * Math.sqrt(Math.max(.01, 1 - (y / 25) ** 2));
    return point(x, y, faceHeight(x, y));
  }, (u, v) => {
    const y = -22 + v * 44;
    const x = (u * 2 - 1) * 16.2 * Math.sqrt(Math.max(.01, 1 - (y / 25) ** 2));
    let occlusion = 0;
    for (const side of [-1, 1]) {
      occlusion += .35 * gaussian(x, y, side * 6.2, -2, 3.1, 1.7);
      occlusion += .2 * gaussian(x, y, side * 2.5, 5.9, .8, .7);
      occlusion += .12 * gaussian(x, y, side * 13, 0, 1.2, 7);
    }
    occlusion += .25 * gaussian(x, y, 0, 11, 3.2, .55);
    occlusion += .12 * gaussian(x, y, 0, 8, .7, 1.1);
    return Math.max(.45, .95 - occlusion);
  }), materials.brass, face);
  // Upper eyelids and the lip seam follow the sculpted surface; no painted features.
  for (const side of [-1, 1]) {
    const eyelid = Array.from({ length: 13 }, (_, i) => {
      const x = side * 6.2 + (i / 12 - .5) * 6.4;
      const y = -2.3 + Math.sin(i / 12 * Math.PI) * .55;
      return point(x, y, faceHeight(x, y) + .16);
    });
    thread(eyelid, .18, materials.raised, face, 18);
    thread(eyelid.map(p => point(p.x, p.y + .5, p.z - .1)), .13, materials.recess, face, 18);
    ellipsoid(side * 15.1, 1, 11, 2.4, 4, 1.8, materials.raised, face);
    thread([point(side * 16, -1, 12.5), point(side * 16.7, 1.4, 12.7), point(side * 15.5, 3, 12.2)], .3, materials.recess, face, 12);
  }
  const seam = Array.from({ length: 15 }, (_, i) => {
    const x = (i / 14 - .5) * 6.7, y = 10.9 + Math.abs(x) * .08;
    return point(x, y, faceHeight(x, y) + .08);
  });
  thread(seam, .12, materials.recess, face, 20);
  // Ringlets have two nested tapered spirals and separate highlight ridges.
  for (let i = 0; i < 11; i++) {
    const angle = Math.PI + i / 10 * Math.PI;
    const cx = Math.cos(angle) * 15.2, cy = Math.sin(angle) * 12 - 9;
    const points = Array.from({ length: 36 }, (_, j) => {
      const a = j / 35 * Math.PI * 2.05, r = 3.2 * (1 - j / 48);
      return point(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 17.5 + Math.sin(j / 35 * Math.PI) * 1.3);
    });
    thread(points, .9, materials.raised, face, 44);
    thread(points.map(p => point(p.x + .25, p.y - .3, p.z + .55)), .14, materials.raised, face, 44);
  }
  for (const [cx, cy, radius] of [[-10, -15, 3.1], [-4, -19, 3.6], [3, -18, 3.3], [10, -14, 2.9]]) {
    ellipsoid(cx, cy, 17.5, radius, radius * 1.1, 1.4, materials.raised, face);
    const ringlet = Array.from({ length: 28 }, (_, i) => {
      const a = i / 27 * Math.PI * 2.1, r = radius * (1 - i / 38);
      return point(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 18.9);
    });
    thread(ringlet, .25, materials.recess, face, 32);
  }
  face.scale.set(1.06, 1.06, 1);
  group.add(face);
  for (const side of [-1, 1]) {
    thread([point(side * 4, 57, 5), point(side * 14, 63, 4), point(side * 25, 59, 3), point(side * 22, 54, 3)], .65, materials.raised, group, 25);
  }
  return group;
}

export function buildGilt(width: number, height: number, materials: Materials) {
  const group = new THREE.Group();
  const mobile = width < 650, railScale = mobile ? .62 : 1;
  rail(width, height, railScale, materials, group);
  carvedBorder(width, height, railScale, materials, group);
  innerFiligree(width, height, railScale, materials, group);
  const cornerScale = mobile ? .64 : width < 1100 ? .9 : 1.12;
  for (const [x, y, sx, sy] of [[0, 0, 1, 1], [width, 0, -1, 1], [0, height, 1, -1], [width, height, -1, -1]]) {
    const carving = corner(materials); carving.position.set(x, y, 0); carving.scale.set(cornerScale * sx, cornerScale * sy, cornerScale); group.add(carving);
  }
  const crest = cherub(materials); const crestScale = mobile ? .78 : 1.1;
  crest.scale.setScalar(crestScale); crest.position.set(width / 2, 3, 2); group.add(crest);
  if (width > 850) {
    const span = Math.min(340, width / 2 - 285);
    for (const side of [-1, 1]) {
      const swag = garland(span, materials);
      swag.position.set(width / 2 + side * 132, 23, 1); swag.scale.x = side; group.add(swag);
    }
  }
  for (const side of [0, 1]) {
    const ornament = sideCartouche(materials);
    ornament.position.set(side ? width : 0, height / 2, 1);
    ornament.scale.set((side ? -1 : 1) * railScale, railScale, railScale); group.add(ornament);
  }
  const base = new THREE.Group(), fan = shell(36, materials);
  fan.position.set(0, -5, 2); base.add(fan);
  for (const side of [-1, 1]) {
    const scroll = volute(18, materials); scroll.position.set(side * 52, -16, 0); scroll.scale.x = side; base.add(scroll);
    const leaf = acanthus(69, 8, 2, materials); leaf.position.set(side * 14, -13, 0); leaf.rotation.z = side * Math.PI / 2; base.add(leaf);
  }
  base.scale.setScalar(railScale); base.position.set(width / 2, height - 4 * railScale, 1); group.add(base);
  // Bake carvings into one geometry per material. Their normals and depth remain
  // three-dimensional, while hundreds of small details require only a few draws.
  group.updateMatrixWorld(true);
  const mergedGroup = new THREE.Group();
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  group.traverse(object => {
    if (object instanceof THREE.InstancedMesh) {
      const beads = object.clone(); mergedGroup.add(beads);
    } else if (object instanceof THREE.Mesh) {
      const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
      if (object.matrixWorld.determinant() < 0 && geometry.index) {
        const index = geometry.index;
        for (let i = 0; i < index.count; i += 3) {
          const b = index.getX(i + 1); index.setX(i + 1, index.getX(i + 2)); index.setX(i + 2, b);
        }
      }
      const material = object.material as THREE.Material;
      const batch = batches.get(material) ?? []; batch.push(geometry); batches.set(material, batch);
    }
  });
  batches.forEach((parts, material) => {
    mesh(mergeGeometries(parts), material, mergedGroup);
    parts.forEach(part => part.dispose());
  });
  group.traverse(object => { if (object instanceof THREE.Mesh && !(object instanceof THREE.InstancedMesh)) object.geometry.dispose(); });
  return mergedGroup;
}

export function disposeGeometries(group: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  group.traverse(object => { if (object instanceof THREE.Mesh) geometries.add(object.geometry); });
  geometries.forEach(geometry => geometry.dispose());
}
