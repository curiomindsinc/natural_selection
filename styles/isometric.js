import * as THREE from 'three';

const FRUSTUM_HALF = 22;   // world units from centre to top edge — tweak to zoom

let _orthoCamera = null;

export default {
    setupCamera(perspCamera, controls, renderer) {
        const canvas = renderer.domElement;
        const aspect = canvas.clientWidth / canvas.clientHeight;

        _orthoCamera = new THREE.OrthographicCamera(
            -FRUSTUM_HALF * aspect,
             FRUSTUM_HALF * aspect,
             FRUSTUM_HALF,
            -FRUSTUM_HALF,
            0.1, 300
        );
        // Store so onResize can update it
        _orthoCamera._frustumHalf = FRUSTUM_HALF;

        // Classic isometric: equal distance along X, Y, Z
        _orthoCamera.position.set(40, 40, 40);
        _orthoCamera.lookAt(0, 0, 0);
        _orthoCamera.updateProjectionMatrix();

        // Disable orbit so the fixed angle stays locked
        controls.enabled = false;

        return _orthoCamera;
    },

    restoreCamera(perspCamera, controls) {
        controls.enabled = true;
        _orthoCamera = null;
        return perspCamera;
    },

    setup(scene) {},
    teardown(scene) {},
};
