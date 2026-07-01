import * as THREE from 'three';
import { getRabbitTemplate, getRabbitScale } from './rabbit.js';

const HAWK_TARGET = 4;

let _scene    = null;
let _tplHawk  = null;
let _scaleHawk = 0;

export function initHawk(scene)       { _scene = scene; }
export function setHawkTemplate(gltf) { _tplHawk = gltf; }
export function isHawkReady()         { return _tplHawk !== null; }

function cloneHawk() {
    if (!_tplHawk) return null;
    const cloned = _tplHawk.scene.clone(true);
    cloned.traverse(n => { if (n.isMesh && n.material) n.material = n.material.clone(); });
    if (_scaleHawk === 0) {
        const sz = new THREE.Box3().setFromObject(cloned).getSize(new THREE.Vector3());
        const m  = Math.max(sz.x, sz.y, sz.z);
        _scaleHawk = m > 0 ? HAWK_TARGET / m : 1;
    }
    cloned.scale.setScalar(_scaleHawk);
    cloned.rotation.y = Math.PI;
    const pivot      = new THREE.Group();
    pivot.add(cloned);
    const mixer      = new THREE.AnimationMixer(cloned);
    const clips      = _tplHawk.animations;
    const flyClip    = THREE.AnimationClip.findByName(clips, 'animation.aguia.fly');
    const attackClip = THREE.AnimationClip.findByName(clips, 'animation.aguia.attack');
    return { pivot, scene: cloned, mixer, flyClip, attackClip };
}

export class HawkAttack {
    constructor(target, victimMesh = null) {
        this.tgt         = target;
        this.victimMesh  = victimMesh;
        this.state       = 'approach';
        this.t           = 0;
        this.done        = false;
        this._grabbed    = false;

        const h = cloneHawk();
        if (!h) { this.done = true; return; }
        this.pivot      = h.pivot;
        this.mesh       = h.scene;
        this.mixer      = h.mixer;
        this.flyClip    = h.flyClip;
        this.attackClip = h.attackClip;
        this.action     = null;

        const pts = new THREE.EllipseCurve(0, 0, 1.8, 0.6, 0, Math.PI * 2).getPoints(24);
        this.shadow = new THREE.Mesh(
            new THREE.ShapeGeometry(new THREE.Shape(pts)),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false })
        );
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.position.y = 0.05;
        _scene.add(this.shadow);

        const side    = Math.random() > 0.5 ? 1 : -1;
        this.startPos = new THREE.Vector3(target.pos.x + side * 22, 14, target.pos.z + side * 14);
        this.fleeEnd  = new THREE.Vector3(target.pos.x - side * 24, 14, target.pos.z - side * 16);
        this.diveStart = new THREE.Vector3();
        this.pivot.position.copy(this.startPos);
        _scene.add(this.pivot);
        this._playAnim(this.flyClip);
    }

    _playAnim(clip) {
        if (!this.mixer || !clip) return;
        if (this.action) this.action.fadeOut(0.15);
        this.action = this.mixer.clipAction(clip);
        this.action.reset().fadeIn(0.15).play();
    }

    update(dt) {
        if (this.done) return;
        this.t += dt;
        if (this.mixer) this.mixer.update(dt);

        const tx = this.tgt.pos.x, tz = this.tgt.pos.z;

        if (this.state === 'approach') {
            const p    = Math.min(this.t / 1.6, 1);
            const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
            this.pivot.position.set(
                THREE.MathUtils.lerp(this.startPos.x, tx + 2, ease),
                THREE.MathUtils.lerp(14, 7, ease),
                THREE.MathUtils.lerp(this.startPos.z, tz - 3, ease)
            );
            this.shadow.position.set(this.pivot.position.x, 0.05, this.pivot.position.z);
            this.pivot.lookAt(new THREE.Vector3(tx, this.pivot.position.y - 2, tz));
            if (p >= 1) {
                this.state = 'dive'; this.t = 0;
                this.diveStart.copy(this.pivot.position);
                this._playAnim(this.attackClip);
            }

        } else if (this.state === 'dive') {
            const p    = Math.min(this.t / 0.55, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            this.pivot.position.lerpVectors(this.diveStart, new THREE.Vector3(tx, 1.2, tz), ease);
            this.shadow.position.set(this.pivot.position.x, 0.05, this.pivot.position.z);
            this.pivot.lookAt(new THREE.Vector3(tx, 0, tz));
            if (p >= 1) { this.state = 'grab'; this.t = 0; }

        } else if (this.state === 'grab') {
            if (this.t > 0.08 && !this._grabbed) {
                this._grabbed = true;
                if (this.victimMesh && this.victimMesh.parent) {
                    this.victimMesh.parent.remove(this.victimMesh);
                    this.victimMesh = null;
                }
                const tpl = getRabbitTemplate(this.tgt.color);
                if (tpl && _scaleHawk > 0) {
                    const prop = tpl.clone(true);
                    const rabbitScale = getRabbitScale(this.tgt.color);
                    prop.scale.setScalar(rabbitScale / _scaleHawk);
                    prop.position.set(0, -1.1, 0.3);
                    prop.rotation.set(0.4, 0, 0.2);
                    this.mesh.add(prop);
                }
            }
            if (this.t >= 0.4) { this.state = 'flee'; this.t = 0; this._playAnim(this.flyClip); }

        } else if (this.state === 'flee') {
            const p    = Math.min(this.t / 1.5, 1);
            const ease = p * p;
            this.pivot.position.lerpVectors(new THREE.Vector3(tx, 1.2, tz), this.fleeEnd, ease);
            this.pivot.position.y = THREE.MathUtils.lerp(1.2, 14, ease);
            this.shadow.position.set(this.pivot.position.x, 0.05, this.pivot.position.z);
            this.pivot.lookAt(this.fleeEnd);
            if (p >= 1) {
                if (this.victimMesh && this.victimMesh.parent) this.victimMesh.parent.remove(this.victimMesh);
                _scene.remove(this.pivot);
                _scene.remove(this.shadow);
                this.done = true;
            }
        }
    }
}
