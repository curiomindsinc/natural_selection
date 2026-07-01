import * as THREE from 'three';

const MAX_GRASS  = 10000;
const MUD_COUNT  = 28;
const ROCK_COUNT = 22;

// Tapered blade: 5 verts, 3 tris. Y=0 at base, Y=1 at tip (local space).
const BLADE_POS = new Float32Array([
    -0.06,  0.0, 0,
     0.06,  0.0, 0,
    -0.035, 0.5, 0,
     0.035, 0.5, 0,
     0.00,  1.0, 0,
]);
const BLADE_IDX = [0, 1, 3,  0, 3, 2,  2, 3, 4];

const COLORS = [
    new THREE.Color(0x3A8B2C),
    new THREE.Color(0x4A9B3F),
    new THREE.Color(0x56A845),
    new THREE.Color(0x2E7A28),
    new THREE.Color(0x62B548),
];

// Multi-frequency sine noise → natural density patches in [0, 1]
function density(x, z) {
    const n0 = Math.sin(x * 0.42 + 1.23) * Math.cos(z * 0.37 + 0.87);
    const n1 = Math.sin(x * 1.07 + z * 0.91 + 2.31) * 0.5;
    const n2 = Math.sin(x * 2.27 - z * 2.13 + 0.57) * 0.25;
    return Math.max(0, Math.min(1, (n0 + n1 + n2) / 1.75 * 0.5 + 0.5));
}

export class GrassRenderer {
    constructor(scene) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(BLADE_POS, 3));
        geo.setIndex(BLADE_IDX);

        this._shaderUniforms = null;

        // MeshLambertMaterial + onBeforeCompile is the reliable path for
        // instancing + custom sway: Three.js owns the instanceMatrix binding,
        // we just inject a time uniform and one sway line.
        const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });

        mat.onBeforeCompile = (shader) => {
            shader.uniforms.time = { value: 0 };
            this._shaderUniforms = shader.uniforms;

            // Inject uniform declaration
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
uniform float time;`,
            );

            // After begin_vertex, `transformed = position` (local, pre-instance).
            // Sway local X/Z by blade Y² so base stays planted, tip moves most.
            // Instance rotation Y randomises each blade's sway world-direction
            // automatically, creating natural non-uniform wind.
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
float _sw = transformed.y * transformed.y;
transformed.x += sin(transformed.y * 4.0 + time * 2.5) * 0.12 * _sw;
transformed.z += sin(transformed.y * 3.5 + time * 1.8) * 0.05 * _sw;`,
            );
        };

        this._mesh = new THREE.InstancedMesh(geo, mat, MAX_GRASS);
        this._mesh.castShadow    = false;
        this._mesh.receiveShadow = false;
        this._mesh.raycast       = () => {};

        this._place();
        scene.add(this._mesh);

        const dummy = new THREE.Object3D();

        // ── Mud patches ───────────────────────────────────────────
        const mudGeo = new THREE.CircleGeometry(1, 8);
        mudGeo.rotateX(-Math.PI / 2);
        this._mud = new THREE.InstancedMesh(
            mudGeo,
            new THREE.MeshLambertMaterial({ color: 0x8B6332 }),
            MUD_COUNT,
        );
        this._mud.castShadow    = false;
        this._mud.receiveShadow = false;
        this._mud.raycast       = () => {};

        for (let i = 0; i < MUD_COUNT; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 3 + Math.random() * 18;
            dummy.position.set(Math.cos(a) * r, 0.01, Math.sin(a) * r);
            dummy.rotation.y = Math.random() * Math.PI;
            dummy.scale.set(0.6 + Math.random() * 3.0, 1, 0.5 + Math.random() * 2.2);
            dummy.updateMatrix();
            this._mud.setMatrixAt(i, dummy.matrix);
        }
        this._mud.instanceMatrix.needsUpdate = true;
        scene.add(this._mud);

        // ── Rocks ─────────────────────────────────────────────────
        const rockGeo = new THREE.DodecahedronGeometry(0.4, 0);
        this._rocks = new THREE.InstancedMesh(
            rockGeo,
            new THREE.MeshLambertMaterial({ color: 0x8C8470 }),
            ROCK_COUNT,
        );
        this._rocks.castShadow    = false;
        this._rocks.receiveShadow = false;
        this._rocks.raycast       = () => {};

        for (let i = 0; i < ROCK_COUNT; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 5 + Math.random() * 16;
            const s = 0.2 + Math.random() * 0.55;
            dummy.position.set(Math.cos(a) * r, s * 0.35, Math.sin(a) * r);
            dummy.rotation.set(
                Math.random() * 0.4,
                Math.random() * Math.PI * 2,
                Math.random() * 0.3,
            );
            dummy.scale.set(s, s * (0.5 + Math.random() * 0.5), s);
            dummy.updateMatrix();
            this._rocks.setMatrixAt(i, dummy.matrix);
        }
        this._rocks.instanceMatrix.needsUpdate = true;
        scene.add(this._rocks);
    }

    _place() {
        const dummy = new THREE.Object3D();
        for (let i = 0; i < MAX_GRASS; i++) {
            const x = (Math.random() - 0.5) * 50;
            const z = (Math.random() - 0.5) * 50;
            const d = density(x, z);

            // Short and thin in sparse zones, tall and wide in dense zones
            const h = (0.3 + d * 0.7) * (0.5 + Math.random() * 0.5);
            const w = 0.5 + d * 0.5;

            dummy.position.set(x, 0.0, z);
            dummy.rotation.y = Math.random() * Math.PI * 2;
            dummy.scale.set(w, h, 1.0);
            dummy.updateMatrix();

            this._mesh.setMatrixAt(i, dummy.matrix);
            this._mesh.setColorAt(i, COLORS[Math.floor(Math.random() * COLORS.length)]);
        }
        this._mesh.instanceMatrix.needsUpdate = true;
        if (this._mesh.instanceColor) this._mesh.instanceColor.needsUpdate = true;
    }

    setVisible(v) {
        this._mesh.visible  = v;
        this._mud.visible   = v;
        this._rocks.visible = v;
    }

    update(timeMs) {
        if (this._shaderUniforms) this._shaderUniforms.time.value = timeMs / 1000;
    }
}
