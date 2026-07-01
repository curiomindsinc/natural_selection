import { audioCtx, playBgMusic } from './audio.js';
import { applyEnvironmentToScene } from './scene.js';
import { addGenData, resetChart } from './chart.js';
import { SIM } from './simulation.js';

export const SPEED_MULT = [0, 0.5, 0.75, 1, 2, 3.5];

const SPEED_LABELS = ['', 'Slow', 'Slow+', 'Normal', 'Fast', 'Max'];
const PREDATION    = {
    grassland: { white: 80, brown: 20 },
    snow:      { white: 20, brown: 80 },
};

let _state           = null;
let _startSimulation = null;
let _stopSimulation  = null;
let _resetScene      = null;

// ── Tutorial modal ────────────────────────────────────────────
const tutModal   = document.getElementById('tutorial-modal');
const modalPages = document.getElementById('modal-pages');
const modalDots  = document.querySelectorAll('.modal-dot');
const modalPrev  = document.getElementById('modal-prev');
const modalNext  = document.getElementById('modal-next');
const modalClose = document.getElementById('modal-close');
const guideBtn   = document.getElementById('guide-btn');

let tutPage = 0;
const TOTAL_PAGES = 5;

const controlsArrow = document.getElementById('controls-arrow');

function goToPage(n) {
    tutPage = Math.max(0, Math.min(n, TOTAL_PAGES - 1));
    modalPages.style.transform = `translateX(-${tutPage * 100}%)`;
    modalDots.forEach((d, i) => d.classList.toggle('active', i === tutPage));
    modalPrev.style.display = tutPage === 0 ? 'none' : '';
    const isLast = tutPage === TOTAL_PAGES - 1;
    modalNext.textContent = isLast ? 'Start Exploring →' : 'Next →';
    modalNext.style.background = isLast ? 'var(--magenta)' : '';
    controlsArrow.classList.toggle('visible', isLast);
}

function openTutorial()  { tutModal.classList.remove('hidden'); goToPage(0); }
function closeTutorial() { tutModal.classList.add('hidden'); controlsArrow.classList.remove('visible'); }

modalPrev.addEventListener('click', () => goToPage(tutPage - 1));
modalNext.addEventListener('click', () => {
    if (tutPage < TOTAL_PAGES - 1) goToPage(tutPage + 1);
    else closeTutorial();
});
modalDots.forEach((d) => d.addEventListener('click', () => goToPage(+d.dataset.p)));
modalClose.addEventListener('click', closeTutorial);
guideBtn.addEventListener('click', openTutorial);

// ── Environment toggle ────────────────────────────────────────
const envCards      = document.querySelectorAll('.env-card');
const envHudDot     = document.getElementById('env-hud-dot');
const envHudName    = document.getElementById('env-hud-name');
const whiteRiskFill = document.getElementById('white-risk-fill');
const brownRiskFill = document.getElementById('brown-risk-fill');
const whiteRiskPct  = document.getElementById('white-risk-pct');
const brownRiskPct  = document.getElementById('brown-risk-pct');

function setEnvironment(env) {
    _state.env = env;
    SIM.habitat = env === 'grassland' ? 'grass' : 'snow';
    envCards.forEach(c => c.classList.toggle('active', c.dataset.env === env));

    envHudDot.className = `env-hud-dot ${env}`;
    envHudName.textContent = env === 'grassland' ? 'Grassland' : 'Snow';

    const { white, brown } = PREDATION[env];
    whiteRiskFill.style.width = `${white}%`;
    brownRiskFill.style.width = `${brown}%`;
    whiteRiskPct.textContent  = `${white}%`;
    brownRiskPct.textContent  = `${brown}%`;

    const whiteIsHigh = white > brown;
    whiteRiskFill.className = `risk-fill ${whiteIsHigh ? 'danger' : 'safe'}`;
    brownRiskFill.className = `risk-fill ${!whiteIsHigh ? 'danger' : 'safe'}`;
    whiteRiskPct.className  = `risk-pct ${whiteIsHigh ? 'danger' : 'safe'}`;
    brownRiskPct.className  = `risk-pct ${!whiteIsHigh ? 'danger' : 'safe'}`;

    if (_state.running) playBgMusic(env);
    applyEnvironmentToScene(env);
}

envCards.forEach(c => c.addEventListener('click', () => setEnvironment(c.dataset.env)));

// ── Sliders ───────────────────────────────────────────────────
const STARTING_POP   = 40;

const speedSlider    = document.getElementById('speed-slider');
const mixSlider      = document.getElementById('mix-slider');
const mutationSlider = document.getElementById('mutation-slider');
const lockables      = document.querySelectorAll('.lockable');

speedSlider.addEventListener('input', () => {
    _state.speed = +speedSlider.value;
    document.getElementById('speed-val').textContent = SPEED_LABELS[_state.speed];
    SIM.speed = SPEED_MULT[_state.speed];
});

function updateMixDisplay() {
    const brownPct = +mixSlider.value;
    document.getElementById('white-start').textContent = (100 - brownPct) + '%';
    document.getElementById('brown-start').textContent = brownPct + '%';
}

mixSlider.addEventListener('input', updateMixDisplay);

mutationSlider.addEventListener('input', () => {
    _state.mutationRate = +mutationSlider.value;
    document.getElementById('mutation-val').textContent = `${_state.mutationRate}%`;
});

// ── Start / Pause / Reset ─────────────────────────────────────
const startBtn   = document.getElementById('start-btn');
const resetBtn   = document.getElementById('reset-btn');
const statusPill = document.getElementById('status-pill');
const statusText = document.getElementById('status-text');

let firstStart = true;

export function setRunState(running) {
    _state.running = running;
    startBtn.innerHTML = running
        ? `<svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
             <rect x="1.5" y="1.5" width="3" height="8" rx="0.8"/>
             <rect x="6.5" y="1.5" width="3" height="8" rx="0.8"/>
           </svg> Pause`
        : `<svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
             <path d="M2 1.5L9.5 5.5L2 9.5V1.5Z"/>
           </svg> Resume`;
    statusPill.className = `status-pill ${running ? 'running' : 'paused'}`;
    statusText.textContent = running ? 'Running' : 'Paused';
    lockables.forEach(s => s.classList.toggle('locked', true));

    if (running) audioCtx.resume();
    else audioCtx.suspend();
}

startBtn.addEventListener('click', () => {
    if (firstStart) {
        firstStart = false;
        const total      = STARTING_POP;
        const brownPct   = +mixSlider.value;
        const brownCount = Math.round(total * brownPct / 100);
        _state.population = { white: total - brownCount, brown: brownCount };
        _startSimulation();
    } else {
        setRunState(!_state.running);
    }
});

resetBtn.addEventListener('click', () => {
    _stopSimulation();
    firstStart = true;
    _state.running = false;
    _state.generation = 0;
    _state.hawk = { attacks: 0, kills: 0 };
    SIM.gen = 0;

    startBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
        <path d="M2 1.5L9.5 5.5L2 9.5V1.5Z"/>
    </svg> Start`;
    statusPill.className = 'status-pill';
    statusText.textContent = 'Ready';
    lockables.forEach(s => s.classList.remove('locked'));

    updateGenDisplay(0);
    document.getElementById('white-count').textContent = (100 - +mixSlider.value) + '%';
    document.getElementById('brown-count').textContent = +mixSlider.value + '%';
    document.getElementById('hawk-attacks').textContent = '—';
    document.getElementById('hawk-kills').textContent = '0 kills';
    document.getElementById('hawk-hud').className = 'hawk-hud';
    document.getElementById('hawk-hud').textContent = 'Hawk patrolling';

    resetChart();
    _resetScene();
});

// ── Generation display ────────────────────────────────────────
function updateGenDisplay(n) {
    const s = String(n).padStart(3, '0');
    document.getElementById('gd2').textContent = s[0];
    document.getElementById('gd1').textContent = s[1];
    document.getElementById('gd0').textContent = s[2];
}

// ── Panel toggles ─────────────────────────────────────────────
const controlsToggle = document.getElementById('controls-toggle');
const controlsPanel  = document.getElementById('controls-panel');
const chartToggle    = document.getElementById('chart-toggle');
const chartPanel     = document.getElementById('chart-panel');
const chartOnoff     = document.getElementById('chart-onoff');

controlsToggle.addEventListener('click', () => {
    const open = controlsPanel.classList.toggle('open');
    controlsToggle.classList.toggle('open', open);
});

chartToggle.addEventListener('click', () => {
    const open = chartPanel.classList.toggle('open');
    chartOnoff.classList.toggle('on', open);
});

// ── Init & Public API ─────────────────────────────────────────
export function initUI({ state, startSimulation, stopSimulation, resetScene }) {
    _state           = state;
    _startSimulation = startSimulation;
    _stopSimulation  = stopSimulation;
    _resetScene      = resetScene;

    window.uiUpdateGeneration = (n) => { _state.generation = n; updateGenDisplay(n); };

    window.uiUpdatePopulation = (white, brown) => {
        _state.population = { white, brown };
        const _total = white + brown;
        document.getElementById('white-count').textContent = _total > 0 ? Math.round(white / _total * 100) + '%' : '0%';
        document.getElementById('brown-count').textContent = _total > 0 ? Math.round(brown / _total * 100) + '%' : '0%';
    };

    window.uiAddGenData    = addGenData;

    window.uiSetHawkStatus = (msg, attacking = false) => {
        const el = document.getElementById('hawk-hud');
        el.textContent = msg;
        el.className = `hawk-hud ${attacking ? 'attacking' : ''}`;
    };

    window.uiSetHawkStats = (attacks, kills) => {
        document.getElementById('hawk-attacks').textContent = attacks;
        document.getElementById('hawk-kills').textContent = `${kills} kill${kills !== 1 ? 's' : ''}`;
    };
}
