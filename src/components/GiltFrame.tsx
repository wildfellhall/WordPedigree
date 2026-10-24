import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildGilt, disposeGeometries, makeMaterials, metalTexture } from '../rendering/gilt';
import { frameScale } from '../rendering/engravedFrame';
import { makeFrameContact } from '../rendering/frameContact';

export default function GiltFrame() {
  const mount = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch { return; }
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .94;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'gilt-canvas';
    host.append(renderer.domElement);

    const scene = new THREE.Scene();
    // Convert the page's downward Y axis in the model transform. Reversing
    // the projection instead misidentifies the front face and its light normal.
    scene.scale.y = -1;
    const camera = new THREE.OrthographicCamera(0, 1, 0, -1, .1, 2500);
    camera.position.z = 1200;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, .06);
    scene.environment = environment.texture;
    room.dispose(); pmrem.dispose();
    const texture = metalTexture();
    const materials = makeMaterials(texture);
    const ambient = new THREE.HemisphereLight('#f7f0e5', '#69584a', .5);
    scene.add(ambient);
    const key = new THREE.DirectionalLight('#fff3df', 1.65);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    key.shadow.normalBias = .24; key.shadow.bias = -.0002; key.shadow.radius = 2;
    key.shadow.camera.near = 1; key.shadow.camera.far = 3000;
    scene.add(key); scene.add(key.target);
    const fill = new THREE.DirectionalLight('#e5e7f3', .35);
    scene.add(fill); scene.add(fill.target);
    let sculpture: THREE.Group | null = null;
    let contact: ReturnType<typeof makeFrameContact> | null = null;
    let width = 0, height = 0, frame = 0;
    let contextAvailable = true;

    const render = () => {
      frame = 0;
      if (!contextAvailable) return;
      renderer.render(scene, camera);
      host.dataset.rendered = 'true';
    };
    const resize = () => {
      if (!contextAvailable) return;
      const nextWidth = host.clientWidth, nextHeight = host.clientHeight;
      if (nextWidth <= 0 || nextHeight <= 0) return;
      if (nextWidth === width && nextHeight === height) return;
      width = nextWidth; height = nextHeight;
      host.parentElement?.style.setProperty('--frame-width', `${70 * frameScale(width)}px`);
      const pixelRatio = Math.min(window.devicePixelRatio, 2, renderer.capabilities.maxTextureSize / Math.max(width, height));
      renderer.setPixelRatio(pixelRatio); renderer.setSize(width, height);
      camera.right = width; camera.bottom = -height; camera.updateProjectionMatrix();
      if (sculpture) { scene.remove(sculpture); disposeGeometries(sculpture); }
      sculpture = buildGilt(width, height, materials, renderer); scene.add(sculpture);
      if (contact) { scene.remove(contact); contact.geometry.dispose(); contact.material.dispose(); }
      contact = makeFrameContact(width, height, frameScale(width)); scene.add(contact);
      key.position.set(width * .25 - 250, -350, 900); key.target.position.set(width / 2, height / 2, 0);
      const reach = Math.max(width, height) * .75;
      key.shadow.camera.left = -reach; key.shadow.camera.right = reach;
      key.shadow.camera.top = reach; key.shadow.camera.bottom = -reach; key.shadow.camera.updateProjectionMatrix();
      fill.position.set(width + 300, height * .3, 500); fill.target.position.set(width / 2, height / 2, 0);
      render();
    };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = (event: PointerEvent) => {
      key.position.x = width * .25 - 250 + (event.clientX / window.innerWidth - .5) * 90;
      if (!frame) frame = requestAnimationFrame(render);
    };
    const contextLost = (event: Event) => {
      event.preventDefault(); contextAvailable = false; delete host.dataset.rendered;
      host.parentElement?.style.removeProperty('--frame-width');
      // A merely invisible canvas retains its old desktop dimensions and can
      // overflow the page when the fallback is subsequently resized.
      renderer.domElement.style.display = 'none';
    };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    if (!reducedMotion) window.addEventListener('pointermove', pointer, { passive: true });
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', pointer);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      if (sculpture) disposeGeometries(sculpture);
      contact?.geometry.dispose(); contact?.material.dispose();
      Object.values(materials).forEach(material => material.dispose());
      texture.dispose(); environment.dispose(); key.shadow.dispose();
      renderer.dispose(); renderer.domElement.remove(); delete host.dataset.rendered;
      host.parentElement?.style.removeProperty('--frame-width');
    };
  }, []);
  return <div className="gilt-frame" ref={mount} aria-hidden="true">
    <div className="frame-fallback">
      <div className="frame-rail rail-top" /><div className="frame-rail rail-right" />
      <div className="frame-rail rail-bottom" /><div className="frame-rail rail-left" />
      <img className="corner top-left" src="/ornaments/corner.svg" alt="" />
      <img className="corner top-right" src="/ornaments/corner.svg" alt="" />
      <img className="corner bottom-left" src="/ornaments/corner.svg" alt="" />
      <img className="corner bottom-right" src="/ornaments/corner.svg" alt="" />
      <img className="frame-cameo" src="/ornaments/cartouche.svg" alt="" />
    </div>
    <div className="frame-inner" />
  </div>;
}
