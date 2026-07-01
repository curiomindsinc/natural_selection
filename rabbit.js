import * as THREE from 'three';

const FIELD_RADIUS  = 18;
const RABBIT_TARGET = 1.2;

let _scene      = null;
let _tplWhite   = null;
let _tplBrown   = null;
let _scaleWhite = 0;
let _scaleBrown = 0;

export function initRabbit(scene) { _scene = scene; }

export function setRabbitTemplates(white, brown) {
    _tplWhite = white;
    _tplBrown = brown;
}

export function getRabbitTemplate(color) {
    return color === 'brown' ? _tplBrown : _tplWhite;
}

export function getRabbitScale(color) {
    return color === 'brown' ? _scaleBrown : _scaleWhite;
}

function randPos() {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * FIELD_RADIUS;
    return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
}

function clampPos(pos) {
    const d = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    if (d > FIELD_RADIUS) { pos.x *= FIELD_RADIUS / d; pos.z *= FIELD_RADIUS / d; }
}

function cloneRabbit(color) {
    const tpl = color === 'white' ? _tplWhite : _tplBrown;
    if (!tpl) return null;
    const mesh = tpl.clone(true);
    mesh.traverse(n => { if (n.isMesh && n.material) n.material = n.material.clone(); });
    if (color === 'white' && _scaleWhite === 0) {
        const sz = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
        const m  = Math.max(sz.x, sz.y, sz.z);
        _scaleWhite = m > 0 ? RABBIT_TARGET / m : 1;
    }
    if (color === 'brown' && _scaleBrown === 0) {
        const sz = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
        const m  = Math.max(sz.x, sz.y, sz.z);
        _scaleBrown = m > 0 ? RABBIT_TARGET / m : 1;
    }
    mesh.scale.setScalar(color === 'white' ? _scaleWhite : _scaleBrown);
    mesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return mesh;
}

export class Rabbit {
    constructor(color, age) {
        this.color    = color;
        this.age      = age || 0;
        this.alive    = true;
        this.pos      = randPos();
        this.vel      = new THREE.Vector3();
        this.tgt      = randPos();
        this.hopPhase = Math.random() * Math.PI * 2;
        this.hopTimer = Math.random() * 1.2;
        this.panicDir = null;
        this.mesh     = cloneRabbit(color);
        if (!this.mesh) { this.alive = false; return; }
        this.mesh.position.copy(this.pos);
        _scene.add(this.mesh);
    }

    update(dt) {
        if (!this.alive || !this.mesh) return;
        if (this.panicDir) {
            this.pos.addScaledVector(this.panicDir, dt * 8);
            clampPos(this.pos);
            this.mesh.position.copy(this.pos);
            this.mesh.position.y = 0;
            return;
        }
        if (this.tgt.distanceTo(this.pos) < 1.0) this.tgt = randPos();
        const dir = this.tgt.clone().sub(this.pos).setY(0).normalize();
        this.vel.lerp(dir.multiplyScalar(2.5), 0.05);
        this.pos.addScaledVector(this.vel, dt);
        clampPos(this.pos);
        this.mesh.position.copy(this.pos);
        if (this.vel.lengthSq() > 0.01) {
            const fwd = this.pos.clone().sub(this.vel); fwd.y = this.pos.y;
            this.mesh.lookAt(fwd);
        }
        this.hopTimer -= dt;
        if (this.hopTimer < 0) { this.hopTimer = 0.4 + Math.random() * 0.9; this.hopPhase = 0; }
        this.hopPhase += dt * 9;
        this.mesh.position.y = Math.max(0, Math.sin(this.hopPhase) * 0.22);
    }

    setPanic(fromPos) { this.panicDir = this.pos.clone().sub(fromPos).setY(0).normalize(); }
    stopPanic()       { this.panicDir = null; }

    remove() {
        if (this.mesh && this.mesh.parent) _scene.remove(this.mesh);
        this.alive = false;
    }
}
