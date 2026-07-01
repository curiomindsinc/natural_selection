import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { audioCtx, playSound, playBgMusic, stopBgMusic } from './audio.js';
import { scene, camera, renderer, controls, applyEnvironmentToScene, getActiveCamera, applyStyle, removeStyle } from './scene.js';
import isoPreset    from './styles/isometric.js';
import voxelPreset  from './styles/voxel.js';
import { Rabbit, initRabbit, setRabbitTemplates, getRabbitTemplate } from './rabbit.js';
import { initHawk, setHawkTemplate, isHawkReady } from './hawk.js';
import { SIM, initSimulation, updateSimulation } from './simulation.js';
import { initUI, setRunState, SPEED_MULT } from './ui.js';
import { initDecorations, updateDecorations } from './EnvironmentDecorationSystem.js';

const state = {
    env: 'grassland',
    running: false,
    generation: 0,
    mutationRate: 10,
    speed: 3,
    population: { white: 20, brown: 0 },
    hawk: { attacks: 0, kills: 0 },
};

// ── Lifecycle ─────────────────────────────────────────────────
function spawnRabbits() {
    SIM.rabbits.forEach(r => r.remove());
    SIM.rabbits = [];
    let idx = 0;
    for (let i = 0; i < state.population.white; i++, idx++) {
        const r = new Rabbit('white', idx % 5);
        if (r.alive) SIM.rabbits.push(r);
    }
    for (let i = 0; i < state.population.brown; i++, idx++) {
        const r = new Rabbit('brown', idx % 5);
        if (r.alive) SIM.rabbits.push(r);
    }
    const w = SIM.rabbits.filter(r => r.color === 'white').length;
    const b = SIM.rabbits.filter(r => r.color === 'brown').length;
    window.uiUpdatePopulation(w, b);
}

function startSimulation() {
    if (!getRabbitTemplate('white') || !getRabbitTemplate('brown') || !isHawkReady()) { console.warn('Models not yet loaded'); return; }
    SIM.phase = 'explore'; SIM.pt = 0; SIM.gen = 0;
    SIM.hawks = []; SIM._pendingAnimTargets = []; SIM._totalAnimQueued = 0;
    SIM.speed   = SPEED_MULT[state.speed];
    SIM.habitat = state.env === 'grassland' ? 'grass' : 'snow';
    spawnRabbits();
    window.uiAddGenData(0, state.population.white, state.population.brown);
    setRunState(true);
    audioCtx.resume().then(() => playBgMusic(state.env));
}

function stopSimulation() {
    stopBgMusic();
}

function resetScene() {
    SIM.rabbits.forEach(r => r.remove());
    SIM.rabbits = [];
    SIM.hawks.forEach(h => {
        if (h.pivot && h.pivot.parent)  scene.remove(h.pivot);
        if (h.shadow && h.shadow.parent) scene.remove(h.shadow);
    });
    SIM.hawks = [];
    SIM._pendingAnimTargets = [];
    SIM._totalAnimQueued = 0;
    SIM.phase = 'explore';
    SIM.pt = 0;
    applyEnvironmentToScene(state.env);
}

// ── Init ──────────────────────────────────────────────────────
initRabbit(scene);
initHawk(scene);
initSimulation(state, setRunState);
initUI({ state, startSimulation, stopSimulation, resetScene });
initDecorations(scene);

// ── GLTF model loading ────────────────────────────────────────
const loader = new GLTFLoader();
Promise.all([
    new Promise((res, rej) => loader.load('models/white rabbit/Rabbit_white.gltf', res, undefined, rej)),
    new Promise((res, rej) => loader.load('models/brown rabbit/Rabbit.gltf',       res, undefined, rej)),
    new Promise((res, rej) => loader.load('models/hawk/scene.gltf',                res, undefined, rej)),
]).then(([wGltf, bGltf, hGltf]) => {
    setRabbitTemplates(wGltf.scene, bGltf.scene);
    setHawkTemplate(hGltf);
    console.log('All models loaded');
}).catch(err => console.error('Model load error:', err));

// ── Render loop ───────────────────────────────────────────────
let lastTime = 0;
function renderLoop(time = 0) {
    requestAnimationFrame(renderLoop);
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;
    controls.update();
    updateSimulation(dt);
    updateDecorations(dt, time);
    renderer.render(scene, getActiveCamera());
}
renderLoop();

window.simScene     = scene;
window.simPlaySound = playSound;

// Style switching — use in browser console to try styles
const STYLES = { isometric: isoPreset, voxel: voxelPreset };
window.setStyle   = (name) => applyStyle(STYLES[name], state.env);
window.clearStyle = () => removeStyle();
