import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById('three-canvas');

export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

export const scene = new THREE.Scene();
scene.fog        = new THREE.Fog(0x87CEEB, 25, 65);
scene.background = new THREE.Color(0x87CEEB);

export const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
camera.position.set(0, 18, 22);
camera.lookAt(0, 0, 0);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI / 2.1;
controls.minDistance = 10;
controls.maxDistance = 50;
controls.target.set(0, 0, 0);

const ambientLight = new THREE.AmbientLight(0xffeedd, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xFFE8C0, 1.4);
sunLight.position.set(15, 25, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.near   = 0.5;
sunLight.shadow.camera.far    = 80;
sunLight.shadow.camera.left   = -25;
sunLight.shadow.camera.right  = 25;
sunLight.shadow.camera.top    = 25;
sunLight.shadow.camera.bottom = -25;
scene.add(sunLight);

const groundGeo = new THREE.PlaneGeometry(400, 400, 8, 8);
const groundMat = new THREE.MeshLambertMaterial({ color: 0x4A9B3F });
export const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// ── Sun visual ─────────────────────────────────────────────────
const SUN_POS = new THREE.Vector3(22, 32, 14);

const sunSphereMat = new THREE.MeshBasicMaterial({ color: 0xFFFDE0 });
const sunSphere = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 16), sunSphereMat);
sunSphere.position.copy(SUN_POS);
scene.add(sunSphere);

const sunHaloMat = new THREE.MeshBasicMaterial({ color: 0xFFEE88, transparent: true, opacity: 0.14, depthWrite: false });
const sunHalo = new THREE.Mesh(new THREE.SphereGeometry(3.4, 16, 16), sunHaloMat);
sunHalo.position.copy(SUN_POS);
scene.add(sunHalo);

// Light ray shafts — thin planes from sun to ground targets
const RAY_TARGETS = [
    new THREE.Vector3(-14, 0, -4),
    new THREE.Vector3(-9,  0,  1),
    new THREE.Vector3(-4,  0,  4),
    new THREE.Vector3( 1,  0,  6),
    new THREE.Vector3( 6,  0,  2),
    new THREE.Vector3(-11, 0, -10),
    new THREE.Vector3( 3,  0, -6),
];
const RAY_WIDTHS  = [0.55, 0.35, 0.70, 0.40, 0.55, 0.30, 0.45];
const RAY_OPACITY = [0.055, 0.040, 0.065, 0.042, 0.050, 0.035, 0.048];

const sunRayMats = [];
const sunRaysGroup = new THREE.Group();

RAY_TARGETS.forEach((target, i) => {
    const dir = target.clone().sub(SUN_POS);
    const len = dir.length();
    const mid = SUN_POS.clone().add(dir.clone().multiplyScalar(0.5));
    dir.normalize();

    const mat = new THREE.MeshBasicMaterial({
        color: 0xFFEE99, transparent: true,
        opacity: RAY_OPACITY[i], side: THREE.DoubleSide, depthWrite: false,
    });
    sunRayMats.push(mat);

    // Two planes crossing at 90° for volumetric shaft look
    for (let r = 0; r < 2; r++) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(RAY_WIDTHS[i], len), mat);
        mesh.position.copy(mid);
        const q = new THREE.Quaternion();
        q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        mesh.quaternion.copy(q);
        mesh.rotateOnAxis(dir, r * Math.PI / 2);
        sunRaysGroup.add(mesh);
    }
});
scene.add(sunRaysGroup);

// ── Environment config ─────────────────────────────────────────
const ENV_CONFIG = {
    grassland: {
        skyColor: 0x87CEEB, fogColor: 0x87CEEB, groundColor: 0x4A9B3F,
        ambientColor: 0xffeedd, sunColor: 0xFFE8C0,
        sunSphere: 0xFFFDE0, sunHalo: 0xFFEE88, sunRay: 0xFFEE99,
    },
    snow: {
        skyColor: 0xC8D8F0, fogColor: 0xC8D8F0, groundColor: 0xEEF4FA,
        ambientColor: 0xDDEEFF, sunColor: 0xCCDDFF,
        sunSphere: 0xF0F8FF, sunHalo: 0xCCDDFF, sunRay: 0xDDEEFF,
    },
};

export function applyEnvironmentToScene(env) {
    const cfg = ENV_CONFIG[env];
    scene.background.setHex(cfg.skyColor);
    scene.fog.color.setHex(cfg.fogColor);
    groundMat.color.setHex(cfg.groundColor);
    ambientLight.color.setHex(cfg.ambientColor);
    sunLight.color.setHex(cfg.sunColor);
    sunSphereMat.color.setHex(cfg.sunSphere);
    sunHaloMat.color.setHex(cfg.sunHalo);
    sunRayMats.forEach(m => m.color.setHex(cfg.sunRay));
    _currentStyle?.onEnvironment?.(env, scene);
}

// ── Style system ───────────────────────────────────────────────
let _activeCamera = camera;
let _currentStyle = null;

export const getActiveCamera = () => _activeCamera;

export function applyStyle(preset, env = 'grassland') {
    if (_currentStyle) removeStyle();
    _currentStyle = preset;
    if (preset.setup)          preset.setup(scene, env);
    if (preset.setupRenderer)  preset.setupRenderer(renderer);
    if (preset.setupCamera)    _activeCamera = preset.setupCamera(camera, controls, renderer);
}

export function removeStyle() {
    if (!_currentStyle) return;
    const p = _currentStyle;
    _currentStyle = null;
    if (p.teardown)        p.teardown(scene);
    if (p.restoreRenderer) p.restoreRenderer(renderer);
    if (p.restoreCamera)   _activeCamera = p.restoreCamera(camera, controls);
}

function onResize() {
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // keep ortho camera in sync if a style swapped it
    if (_activeCamera !== camera && _activeCamera.isOrthographicCamera) {
        const aspect = w / h;
        const f = _activeCamera._frustumHalf;
        _activeCamera.left   = -f * aspect;
        _activeCamera.right  =  f * aspect;
        _activeCamera.updateProjectionMatrix();
    }
}
window.addEventListener('resize', onResize);
onResize();
