import * as THREE from 'three';

const FLAKE_COUNT = 800;
const PATCH_COUNT = 60;
const ROCK_COUNT  = 25;

// Soft circular snowflake rendered as a gl_PointSize sprite
const FLAKE_VERT = /* glsl */`
void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 180.0 / -mv.z;   // perspective scale: ~6-12 px at typical distances
    gl_Position  = projectionMatrix * mv;
}
`;
const FLAKE_FRAG = /* glsl */`
void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.2, d) * 0.75;
    gl_FragColor = vec4(1.0, 1.0, 1.0, a);
}
`;

export class SnowRenderer {
    constructor(scene) {
        // ── Falling flakes ────────────────────────────────────────
        this._pos    = new Float32Array(FLAKE_COUNT * 3);
        this._speeds = new Float32Array(FLAKE_COUNT);
        this._drifts = new Float32Array(FLAKE_COUNT);

        for (let i = 0; i < FLAKE_COUNT; i++) {
            this._pos[i*3]   = (Math.random() - 0.5) * 52;
            this._pos[i*3+1] = Math.random() * 15;
            this._pos[i*3+2] = (Math.random() - 0.5) * 52;
            this._speeds[i]  = 0.8 + Math.random() * 1.5;   // units/second
            this._drifts[i]  = (Math.random() - 0.5) * 0.25;
        }

        const flakeGeo = new THREE.BufferGeometry();
        this._posAttr  = new THREE.BufferAttribute(this._pos, 3);
        flakeGeo.setAttribute('position', this._posAttr);

        this._flakes = new THREE.Points(flakeGeo, new THREE.ShaderMaterial({
            vertexShader:   FLAKE_VERT,
            fragmentShader: FLAKE_FRAG,
            transparent: true,
            depthWrite:  false,
        }));
        this._flakes.frustumCulled = false;
        this._flakes.raycast = () => {};
        scene.add(this._flakes);

        // ── Snow patches (flat ellipses on ground) ────────────────
        const patchGeo = new THREE.CircleGeometry(1, 8);
        patchGeo.rotateX(-Math.PI / 2);
        this._patches = new THREE.InstancedMesh(
            patchGeo,
            new THREE.MeshLambertMaterial({ color: 0xE0EAF8 }),
            PATCH_COUNT,
        );
        this._patches.castShadow    = false;
        this._patches.receiveShadow = false;
        this._patches.raycast       = () => {};

        const dummy = new THREE.Object3D();
        for (let i = 0; i < PATCH_COUNT; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 7 + Math.random() * 17;
            dummy.position.set(Math.cos(a) * r, 0.01, Math.sin(a) * r);
            dummy.rotation.y = Math.random() * Math.PI;
            dummy.scale.set(0.5 + Math.random() * 2.5, 1, 0.4 + Math.random() * 1.8);
            dummy.updateMatrix();
            this._patches.setMatrixAt(i, dummy.matrix);
        }
        this._patches.instanceMatrix.needsUpdate = true;
        scene.add(this._patches);

        // ── Snow-covered rocks ────────────────────────────────────
        const rockGeo = new THREE.DodecahedronGeometry(0.4, 0);
        this._rocks = new THREE.InstancedMesh(
            rockGeo,
            new THREE.MeshLambertMaterial({ color: 0xBCC0C8 }),
            ROCK_COUNT,
        );
        this._rocks.castShadow    = false;
        this._rocks.receiveShadow = false;
        this._rocks.raycast       = () => {};

        for (let i = 0; i < ROCK_COUNT; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 9 + Math.random() * 14;
            const s = 0.3 + Math.random() * 0.7;
            dummy.position.set(Math.cos(a) * r, s * 0.35, Math.sin(a) * r);
            dummy.rotation.set(
                Math.random() * 0.4,
                Math.random() * Math.PI * 2,
                Math.random() * 0.3,
            );
            dummy.scale.set(s, s * (0.55 + Math.random() * 0.5), s);
            dummy.updateMatrix();
            this._rocks.setMatrixAt(i, dummy.matrix);
        }
        this._rocks.instanceMatrix.needsUpdate = true;
        scene.add(this._rocks);
    }

    setVisible(v) {
        this._flakes.visible  = v;
        this._patches.visible = v;
        this._rocks.visible   = v;
    }

    // dt in seconds
    update(dt) {
        const pos = this._pos;
        for (let i = 0; i < FLAKE_COUNT; i++) {
            pos[i*3+1] -= this._speeds[i] * dt;
            pos[i*3]   += this._drifts[i] * dt;
            if (pos[i*3+1] < -1.0) {
                pos[i*3]   = (Math.random() - 0.5) * 52;
                pos[i*3+1] = 13 + Math.random() * 3;
                pos[i*3+2] = (Math.random() - 0.5) * 52;
            }
        }
        this._posAttr.needsUpdate = true;
    }
}
