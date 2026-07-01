import * as THREE from 'three';
import { Rabbit } from './rabbit.js';
import { HawkAttack } from './hawk.js';
import { playSound } from './audio.js';

const POP_CAP         = 60;
const POP_TARGET_HIGH = 35;
const MAX_ANIM_HAWKS  = 3;
const EXPLORE_MS      = 12000;

export const SIM = {
    rabbits: [],
    hawks: [],
    gen: 0,
    phase: 'explore',
    pt: 0,
    habitat: 'grass',
    speed: 1,
    _pendingAnimTargets: [],
    _totalAnimQueued: 0,
};

let _state       = null;
let _setRunState = null;

export function initSimulation(state, setRunState) {
    _state       = state;
    _setRunState = setRunState;
}

function doPredation() {
    const alive = SIM.rabbits.filter(r => r.alive);
    const N     = alive.length;
    if (N === 0) return;

    let base;
    if (N > POP_CAP) {
        base = Math.min(0.80, 0.45 + (N - POP_TARGET_HIGH) / N);
    } else {
        base = 0.43 + Math.random() * 0.04;
    }

    const mult      = 3.5;
    const browns    = alive.filter(r => r.color === 'brown');
    const whites    = alive.filter(r => r.color === 'white');
    const nB = browns.length, nW = whites.length;
    const onlyBrown = nW === 0, onlyWhite = nB === 0;

    let pB, pW;
    if (SIM.habitat === 'grass') {
        pB = base;
        pW = onlyWhite ? base : Math.min(0.97, mult * base);
        if (nB < 6 && !onlyBrown) pB = 0;
        if (nW < 6 && !onlyWhite) pW = 0;
    } else {
        pW = base;
        pB = onlyBrown ? base : Math.min(0.97, mult * base);
        if (nW < 6 && !onlyWhite) pW = 0;
        if (nB < 6 && !onlyBrown) pB = 0;
    }

    const victimB    = [...browns].sort(() => Math.random() - 0.5).slice(0, Math.round(nB * pB));
    const victimW    = [...whites].sort(() => Math.random() - 0.5).slice(0, Math.round(nW * pW));
    const allVictims = [...victimB, ...victimW].sort(() => Math.random() - 0.5);

    if (allVictims.length === 0) { SIM._totalAnimQueued = 0; return; }

    allVictims.forEach(v => { v.alive = false; });
    // Non-animated victims removed immediately; animated ones removed by HawkAttack at grab phase
    allVictims.slice(MAX_ANIM_HAWKS).forEach(v => { if (v.mesh && v.mesh.parent) v.mesh.parent.remove(v.mesh); });

    const centroid = new THREE.Vector3();
    allVictims.forEach(v => centroid.add(v.pos));
    centroid.divideScalar(allVictims.length);
    alive.filter(r => r.alive).forEach(r => r.setPanic(centroid));

    _state.hawk.kills += allVictims.length;
    _state.hawk.attacks++;
    window.uiSetHawkStats(_state.hawk.attacks, _state.hawk.kills);
    window.uiSetHawkStatus(`Hawk struck! ${allVictims.length} caught`, true);
    playSound('hawk');

    const animated = allVictims.slice(0, MAX_ANIM_HAWKS);
    SIM._totalAnimQueued    = animated.length;
    SIM._pendingAnimTargets = animated.map((t, i) => ({ target: t, delay: i * 0.6 }));
    if (animated.length === 0) SIM._totalAnimQueued = 0;
}

function doReproduction() {
    SIM.rabbits.forEach(r => r.stopPanic());

    SIM.rabbits.forEach(r => {
        if (r.age >= 5) { r.alive = false; if (r.mesh && r.mesh.parent) r.mesh.parent.remove(r.mesh); }
    });
    SIM.rabbits = SIM.rabbits.filter(r => r.alive);

    SIM.rabbits.forEach(r => r.age++);

    const mutation = _state.mutationRate / 100;
    const parents  = [...SIM.rabbits];
    parents.forEach(p => {
        for (let i = 0; i < 2; i++) {
            const col  = Math.random() < mutation ? (p.color === 'brown' ? 'white' : 'brown') : p.color;
            const baby = new Rabbit(col, 0);
            if (baby.alive) SIM.rabbits.push(baby);
        }
    });

    SIM.rabbits = SIM.rabbits.filter(r => r.alive);
}

export function updateSimulation(dt) {
    if (!_state.running) return;

    const stillPending = [];
    for (const item of SIM._pendingAnimTargets) {
        item.delay -= dt;
        if (item.delay <= 0) SIM.hawks.push(new HawkAttack(item.target, item.target.mesh));
        else stillPending.push(item);
    }
    SIM._pendingAnimTargets = stillPending;

    SIM.hawks.forEach(h => h.update(dt));
    SIM.hawks = SIM.hawks.filter(h => !h.done);
    if (SIM._pendingAnimTargets.length === 0 && SIM.hawks.length === 0) {
        SIM._totalAnimQueued = 0;
    }

    if (SIM.phase === 'explore') {
        SIM.pt += dt * 1000 * SIM.speed;
        if (SIM.pt >= EXPLORE_MS) {
            SIM.pt = 0;
            doReproduction();
            doPredation();
            SIM.phase = 'hunt';
            const w = SIM.rabbits.filter(r => r.alive && r.color === 'white').length;
            const b = SIM.rabbits.filter(r => r.alive && r.color === 'brown').length;
            window.uiUpdatePopulation(w, b);
        }
    } else if (SIM.phase === 'hunt') {
        SIM.pt += dt * 1000 * SIM.speed;
        const noPending = SIM._pendingAnimTargets.length === 0;
        const allDone   = SIM.hawks.length > 0 ? SIM.hawks.every(h => h.done) : SIM._totalAnimQueued === 0;
        if (noPending && allDone && SIM.pt > 1000) {
            SIM.gen++;
            const w = SIM.rabbits.filter(r => r.alive && r.color === 'white').length;
            const b = SIM.rabbits.filter(r => r.alive && r.color === 'brown').length;
            window.uiUpdateGeneration(SIM.gen);
            window.uiAddGenData(SIM.gen, w, b);
            window.uiSetHawkStatus('Hawk patrolling', false);
            SIM.rabbits.forEach(r => r.stopPanic());
            SIM.phase = 'explore';
            SIM.pt = 0;
            if (SIM.rabbits.filter(r => r.alive).length === 0) {
                _setRunState(false);
                window.uiSetHawkStatus('All rabbits extinct', false);
            }
        }
    }

    const sdt = dt * SIM.speed;
    SIM.rabbits.forEach(r => r.update(sdt));
}
