import * as THREE from 'three';

/** Tarnish follows sheltered cuts; polishing follows the exposed mouldings.
 * Position-based marks stay the same size on every rail and across its joins. */
export function ageBrass(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `
      #include <common>
      attribute vec2 metalSurface;
      varying vec2 vMetalPosition;
      varying vec2 vMetalSurface;
    `).replace('#include <begin_vertex>', `
      #include <begin_vertex>
      vMetalPosition = position.xy;
      vMetalSurface = metalSurface;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      varying vec2 vMetalPosition;
      varying vec2 vMetalSurface;
      float metalHash(vec2 p) {
        vec3 q = fract(vec3(p.xyx) * .1031);
        q += dot(q, q.yzx + 33.33);
        return fract((q.x + q.y) * q.z);
      }
      float metalNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(metalHash(i), metalHash(i + vec2(1., 0.)), f.x),
          mix(metalHash(i + vec2(0., 1.)), metalHash(i + 1.), f.x), f.y);
      }
    `).replace('#include <color_fragment>', `
      #include <color_fragment>
      vec2 mp = vMetalPosition;
      float cloud = metalNoise(mp * .014) * .68 + metalNoise(mp * .051 + 29.) * .32;
      float cavity = clamp(vMetalSurface.x, 0., 1.);
      float metalWear = vMetalSurface.y * (.35 + .65 * metalNoise(mp * .09));
      float metalTarnish = smoothstep(.37, .76, cloud) * (.23 + cavity * .34) + cavity * .13;
      metalTarnish *= 1. - metalWear * .65;
      // Umber and quiet olive oxidation remain strongest inside the engraving.
      diffuseColor.rgb *= mix(vec3(1.), vec3(.51, .49, .43), metalTarnish);
      float pinpricks = smoothstep(.80, .95, metalNoise(mp * .84 + 81.));
      diffuseColor.rgb *= 1. - pinpricks * (.09 + cavity * .10);
      diffuseColor.rgb += metalWear * vec3(.011, .010, .008);
    `).replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor + metalTarnish * .28 - metalWear * .13, .34, .92);
    `).replace('#include <metalnessmap_fragment>', `
      #include <metalnessmap_fragment>
      metalnessFactor *= 1. - metalTarnish * .28;
    `);
  };
  material.customProgramCacheKey = () => 'recessed-brass-patina-v1';
  return material;
}
