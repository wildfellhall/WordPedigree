import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Surface detail is measured in CSS pixels, so pores and fibres retain their
// scale as the document grows. The material stays behind the ink and carvings.
export default function Parchment() {
  const mount = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: false, antialias: false, powerPreference: 'low-power' }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uLight: { value: new THREE.Vector2(0.3, 0.2) },
        uSize: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}',
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;
        uniform vec2 uSize;
        uniform vec2 uLight;
        float hash(vec2 p) {
          vec3 p3=fract(vec3(p.xyx)*.1031);
          p3+=dot(p3,p3.yzx+33.33);
          return fract((p3.x+p3.y)*p3.z);
        }
        float noise(vec2 p) {
          vec2 i=floor(p),f=fract(p); f=f*f*f*(f*(f*6.-15.)+10.);
          return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
        }
        float fbm(vec2 p) {
          float n=noise(p)*.53;
          p=mat2(.8,.6,-.6,.8)*p*2.03+17.; n+=noise(p)*.27;
          p=mat2(.6,-.8,.8,.6)*p*2.01-11.; n+=noise(p)*.13;
          return n;
        }
        float heightField(vec2 p) {
          // Cockling, compressed fibres and the fine tooth have separate scales.
          // These heights drive grazing-light shading, not just a noise overlay.
          float cockle=fbm(p*.014)*4.6;
          float tooth=fbm(p*.075)*.64+fbm(p*.30)*.13;
          float nap=noise(vec2(p.x*.71+p.y*.21,p.y*.12))*.055;
          return cockle+tooth+nap;
        }
        void main() {
          vec2 p=vec2(vUv.x,1.-vUv.y)*uSize;
          float broad=fbm(p*.009);
          float membrane=fbm(p*.08+vec2(broad*4.));
          float fine=noise(p*.85);
          float grain=hash(floor(p*1.7));
          vec3 paper=vec3(.925,.911,.881);
          paper+=(broad-.46)*vec3(.070,.063,.052);
          paper+=(membrane-.46)*.037+(fine-.5)*.018+(grain-.5)*.012;
          // Uneven sizing leaves bleached ivory patches and cooler grey-pink
          // hollows, without tinting the whole sheet yellow.
          float sizing=fbm(p*.025+vec2(81.,19.));
          paper+=(sizing-.46)*vec3(.026,.014,.021);
          // Fine irregular fibres; no regular cloth weave or large noise blotches.
          float fibre=noise(vec2(p.x*.92+p.y*.15,p.y*.09));
          paper-=smoothstep(.68,.94,fibre)*.022;
          float pores=smoothstep(.78,.97,noise(p*.57));
          paper-=pores*vec3(.039,.034,.028);
          float edge=min(min(p.x,uSize.x-p.x),min(p.y,uSize.y-p.y));
          float oxidation=exp(-max(0.,edge-24.)/62.)*(.35+broad*.8);
          paper-=oxidation*vec3(.069,.081,.097);
          // Diffuse, grey-brown handling marks concentrate near the edges.
          float marking=smoothstep(.62,.79,fbm(p*.012+42.));
          paper-=marking*oxidation*vec3(.056,.060,.064);
          // Sparse ferric freckles, with a diffuse halo rather than hard circles.
          vec2 cell=floor(p/25.); vec2 local=fract(p/25.);
          vec2 center=vec2(hash(cell+19.),hash(cell+71.));
          float freckle=exp(-dot(local-center,local-center)*190.);
          float sparse=step(.91,hash(cell+23.));
          paper-=freckle*sparse*(.1+oxidation)*vec3(.038,.045,.048);
          // A diffuse edge-tide and two faint compressions add local handling
          // history without a repeating stain tile or uniform yellow tint.
          float tidePosition=38.+noise(p*.014)*20.;
          float tide=exp(-pow((edge-tidePosition)/4.,2.));
          paper-=tide*marking*vec3(.016,.021,.026);
          float foldX=uSize.x*.43+sin(p.y*.004)*1.7;
          float fold=exp(-pow((p.x-foldX)/2.4,2.))*.004;
          paper-=fold;
          paper+=exp(-pow((p.x-foldX-2.)/2.8,2.))*.003;
          float h=heightField(p);
          vec3 normal=normalize(vec3((h-heightField(p+vec2(.6,0.)))/.6,(h-heightField(p+vec2(0.,.6)))/.6,1.));
          vec3 light=normalize(vec3(-.66+uLight.x*.10,-.72+uLight.y*.05,.73));
          float diffuse=dot(normal,light);
          paper+=(diffuse-light.z)*.31;
          // Broad, restrained reflection on compressed fibres; deeper pores
          // stay matte. The surface reads as paper even away from the margins.
          float sheen=pow(max(0.,dot(normal,normalize(light+vec3(0.,0.,1.)))),12.);
          paper+=sheen*(1.-pores)*.008;
          gl_FragColor=vec4(paper,1.);
        }`,
    });
    scene.add(new THREE.Mesh(geometry, material));
    host.appendChild(renderer.domElement);
    let raf = 0;
    const render = () => { raf = 0; renderer.render(scene, camera); };
    const resize = () => {
      // Cap the drawing buffer for unusually long dictionary entries.
      const maxDimension = renderer.capabilities.maxTextureSize;
      const ratio = Math.min(window.devicePixelRatio, 1.5, maxDimension / Math.max(host.clientWidth, host.clientHeight));
      renderer.setPixelRatio(ratio);
      renderer.setSize(host.clientWidth, host.clientHeight);
      material.uniforms.uSize.value.set(host.clientWidth, host.clientHeight);
      render();
    };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = (event: PointerEvent) => {
      const bounds = host.getBoundingClientRect();
      material.uniforms.uLight.value.set((event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height);
      if (!raf) raf = requestAnimationFrame(render);
    };
    const contextLost = (event: Event) => { event.preventDefault(); renderer.domElement.style.visibility = 'hidden'; };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    if (!reducedMotion) window.addEventListener('pointermove', pointer, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener('pointermove', pointer);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      geometry.dispose(); material.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div className="parchment-light" ref={mount} aria-hidden="true" />;
}
