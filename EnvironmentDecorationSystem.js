import { SIM } from './simulation.js';
import { GrassRenderer } from './GrassRenderer.js';
import { SnowRenderer }  from './SnowRenderer.js';

let _grass   = null;
let _snow    = null;
let _lastHab = null;

function _applyVisibility(hab) {
    _grass.setVisible(hab === 'grass');
    _snow.setVisible(hab !== 'grass');
}

export function initDecorations(scene) {
    _grass   = new GrassRenderer(scene);
    _snow    = new SnowRenderer(scene);
    _lastHab = SIM.habitat;
    _applyVisibility(SIM.habitat);
}

// Call every frame: dt in seconds, timeMs from requestAnimationFrame
export function updateDecorations(dt, timeMs) {
    if (!_grass) return;

    if (SIM.habitat !== _lastHab) {
        _lastHab = SIM.habitat;
        _applyVisibility(SIM.habitat);
    }

    if (SIM.habitat === 'grass') {
        _grass.update(timeMs);
    } else {
        _snow.update(dt);
    }
}
