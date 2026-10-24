import * as THREE from 'three';
import { frameOpening } from './engravedFrame';

/** A thin contact shadow attached to the opening, independent of the resolution
 * of the frame's shadow map. It fades across the paper without a rectangular halo. */
export function makeFrameContact(width: number, height: number, scale: number) {
  const contour = frameOpening(width, height, scale), count = contour.length;
  const bands = [-.8, 0, .45, 1, 1.8, 3, 5, 8, 12];
  const positions: number[] = [], distances: number[] = [], directions: number[] = [], indices: number[] = [];
  for (const distance of bands) for (let i = 0; i <= count; i++) {
    const p = contour[i % count], before = contour[(i + count - 1) % count], after = contour[(i + 1) % count];
    const dx = after.x - before.x, dy = after.y - before.y, length = Math.hypot(dx, dy);
    const nx = -dy / length, ny = dx / length;
    positions.push(p.x + nx * distance * scale, p.y + ny * distance * scale, -.65);
    distances.push(distance); directions.push(nx, ny);
  }
  for (let band = 0; band < bands.length - 1; band++) for (let i = 0; i < count; i++) {
    const a = band * (count + 1) + i, b = a + count + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('contactDistance', new THREE.Float32BufferAttribute(distances, 1));
  geometry.setAttribute('contactDirection', new THREE.Float32BufferAttribute(directions, 2));
  geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    uniforms: { shadowColor: { value: new THREE.Color('#49382c') } },
    vertexShader: `
      attribute float contactDistance;
      attribute vec2 contactDirection;
      varying float vDistance;
      varying vec2 vDirection;
      void main() {
        vDistance = contactDistance; vDirection = contactDirection;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      uniform vec3 shadowColor;
      varying float vDistance;
      varying vec2 vDirection;
      void main() {
        float distance = max(0., vDistance);
        float direction = .82 + .22 * dot(normalize(vDirection), normalize(vec2(.48, .88)));
        float contact = (.27 * exp(-distance / .95) + .075 * exp(-distance / 3.8)) * direction;
        contact *= 1. - smoothstep(8., 12., distance);
        gl_FragColor = vec4(shadowColor, contact);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  return new THREE.Mesh(geometry, material);
}
