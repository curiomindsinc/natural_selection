import * as THREE from 'three';
import { ground } from '../scene.js';

const CUBE_SIZE = 1.45;  // slight gap between cubes (grid step = 1.5)
const GRID_STEP = 1.5;
const GRID_HALF = 22;    // covers field radius 18 + margin

const PALETTES = {
    grassland: [0x2D5A1B, 0x355F22, 0x3D7228, 0x477A30, 0x52903A],
    snow:      [0xEAF3FB, 0xD8EAF5, 0xCCDFF0, 0xF2F8FF, 0xE0EEF8],
};

let _mesh = null;

function buildGrid(env) {
    const cols  = PALETTES[env] || PALETTES.grassland;
    const steps = Math.ceil((GRID_HALF * 2) / GRID_STEP);
    const count = steps * steps;

    const geo  = new THREE.BoxGeometry(CUBE_SIZE, 1, CUBE_SIZE);
    const mat  = new THREE.MeshLambertMaterial();
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.receiveShadow = true;
    mesh.castShadow    = true;

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let idx = 0;

    for (let ix = 0; ix < steps; ix++) {
        for (let iz = 0; iz < steps; iz++) {
            const x = -GRID_HALF + ix * GRID_STEP + GRID_STEP * 0.5;
            const z = -GRID_HALF + iz * GRID_STEP + GRID_STEP * 0.5;
            // Vary depth downward — tops all flush at y=0 so rabbits walk normally
            const depth = 1 + Math.random() * 2.5;
            dummy.position.set(x, -(depth / 2), z);
            dummy.scale.set(1, depth, 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(idx, dummy.matrix);
            color.setHex(cols[Math.floor(Math.random() * cols.length)]);
            mesh.setColorAt(idx, color);
            idx++;
        }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
}

export default {
    setup(scene, env = 'grassland') {
        ground.visible = false;
        _mesh = buildGrid(env);
        scene.add(_mesh);
    },

    teardown(scene) {
        if (_mesh) { scene.remove(_mesh); _mesh = null; }
        ground.visible = true;
    },

    onEnvironment(env, scene) {
        if (!_mesh) return;
        scene.remove(_mesh);
        _mesh = buildGrid(env);
        scene.add(_mesh);
    },
};
