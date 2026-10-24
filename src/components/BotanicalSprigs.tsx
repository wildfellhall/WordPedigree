import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildDriedSprig, SPRIG_HEIGHT, SPRIG_WIDTH, sprigPlan } from '../rendering/driedSprigs';

const placements = [
  { side: 'left', slot: 'upper', variant: 0 },
  { side: 'right', slot: 'upper', variant: 2 },
  { side: 'left', slot: 'middle', variant: 1 },
  { side: 'right', slot: 'middle', variant: 0 },
  { side: 'left', slot: 'lower', variant: 2 },
  { side: 'right', slot: 'lower', variant: 1 },
] as const;

function SprigFallback({ variant, mirrored }: { variant: number; mirrored: boolean }) {
  const plan = sprigPlan(variant);
  return <svg className="botanical-fallback" viewBox={`0 0 ${SPRIG_WIDTH} ${SPRIG_HEIGHT}`} aria-hidden="true">
    <g transform={mirrored ? `translate(${SPRIG_WIDTH} 0) scale(-1 1)` : undefined}>
      {plan.stems.map((p, i) => <g key={i}>
        <path d={`M${p[0][0]} ${p[0][1]}C${p[1][0]} ${p[1][1]} ${p[2][0]} ${p[2][1]} ${p[3][0]} ${p[3][1]}`} fill="none" stroke="#8d8166" strokeWidth={i ? 1.2 : 2.1} />
        <path d={`M${p[0][0] - .5} ${p[0][1]}C${p[1][0] - .5} ${p[1][1]} ${p[2][0] - .5} ${p[2][1]} ${p[3][0] - .5} ${p[3][1]}`} fill="none" stroke="#c6b393" strokeWidth=".4" />
      </g>)}
      {plan.tips.flatMap((tip, t) => Array.from({length:tip.count}, (_, i) => {
        const angle = i * 2.39996, spread = Math.sqrt((i + .3) / tip.count) * tip.radius;
        const x = tip.point[0] + Math.cos(angle) * spread, y = tip.point[1] + Math.sin(angle) * spread * .67 - 5;
        return <g key={`${t}-${i}`}>
          <path d={`M${tip.point[0]} ${tip.point[1]}L${x} ${y}`} stroke="#8d8166" strokeWidth=".6" />
          <g transform={`translate(${x} ${y}) rotate(${i * 49})`}>
            <path d="M0-4.6L1.4-2.9 4.3-1.3 3 1.2 2.6 3.7 0 3-2.6 3.7-3 1.2-4.3-1.3-1.4-2.9Z" fill={i % 3 ? '#c39aa2' : '#b78692'} stroke="#9b7480" strokeWidth=".35" />
            <path d="M0-3.8L0 0 3.3-1.2M0 0L2.2 3M0 0L-2.2 3M0 0L-3.3-1.2" fill="none" stroke="#e4c7c3" strokeWidth=".4" />
            <circle r=".8" fill="#d8c1a0" />
          </g>
        </g>;
      }))}
    </g>
  </svg>;
}

export default function BotanicalSprigs() {
  const mount = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({alpha:true, antialias:true, powerPreference:'low-power'}); }
    catch { return; }
    renderer.setPixelRatio(Math.min(3, window.devicePixelRatio * 1.5));
    renderer.setSize(SPRIG_WIDTH, SPRIG_HEIGHT, false);
    renderer.setClearColor(0, 0); renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(); scene.scale.y = -1;
    const camera = new THREE.OrthographicCamera(0, SPRIG_WIDTH, 0, -SPRIG_HEIGHT, .1, 1600); camera.position.z = 800;
    scene.add(new THREE.HemisphereLight('#fff7ee', '#736658', 1.75));
    const key = new THREE.DirectionalLight('#fff2e1', 2.1);
    key.position.set(-140, -180, 600); key.target.position.set(120, 210, 0);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -350; key.shadow.camera.right = 350;
    key.shadow.camera.top = 400; key.shadow.camera.bottom = -400;
    key.shadow.camera.near = 1; key.shadow.camera.far = 1600;
    key.shadow.bias = -.00015; key.shadow.normalBias = .06; key.shadow.radius = 3;
    scene.add(key, key.target);
    const fill = new THREE.DirectionalLight('#e9e4ed', .45); fill.position.set(350, 160, 450); scene.add(fill);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(SPRIG_WIDTH, SPRIG_HEIGHT), new THREE.ShadowMaterial({color:'#665042',opacity:.20,depthWrite:false}));
    ground.position.set(SPRIG_WIDTH / 2, SPRIG_HEIGHT / 2, -.1); ground.receiveShadow = true; scene.add(ground);
    try {
      // Build each botanical form once, lighting it separately from each side.
      // Six placements therefore need only three geometry builds.
      for (const variant of [0, 1, 2]) {
        const sprig = buildDriedSprig(variant); scene.add(sprig.group);
        try {
          host.querySelectorAll<HTMLCanvasElement>(`canvas[data-variant="${variant}"]`).forEach(canvas => {
            const mirrored = canvas.dataset.side === 'right';
            sprig.group.scale.x = mirrored ? -1 : 1;
            sprig.group.position.x = mirrored ? SPRIG_WIDTH : 0;
            renderer.render(scene, camera);
            canvas.width = renderer.domElement.width; canvas.height = renderer.domElement.height;
            const context = canvas.getContext('2d');
            if (context) {
              context.drawImage(renderer.domElement, 0, 0);
              canvas.parentElement!.dataset.rendered = 'true';
            }
          });
        } finally { scene.remove(sprig.group); sprig.dispose(); }
      }
    } catch {
      // Keep the vector sprigs if the device cannot finish the still-life render.
      host.querySelectorAll<HTMLElement>('.botanical-sprig').forEach(el => delete el.dataset.rendered);
    } finally {
      // The sprigs are still-life objects. Keep the rendered canvas, releasing
      // the temporary graphics context instead of adding another animation loop.
      ground.geometry.dispose(); ground.material.dispose(); key.shadow.dispose();
      renderer.dispose(); renderer.forceContextLoss();
    }
    return () => host.querySelectorAll<HTMLElement>('.botanical-sprig').forEach(el => delete el.dataset.rendered);
  }, []);
  return <div className="botanical-sprigs" ref={mount} aria-hidden="true">
    {placements.map(({side, slot, variant}) => <div className={`botanical-sprig botanical-sprig-${side} botanical-sprig-${slot}`} key={`${side}-${slot}`}>
      <SprigFallback variant={variant} mirrored={side === 'right'} /><canvas className="botanical-canvas" data-variant={variant} data-side={side} />
    </div>)}
  </div>;
}
