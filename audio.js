export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const audioCache = {};

async function loadAudio(name, path) {
    const buf = await (await fetch(path)).arrayBuffer();
    audioCache[name] = await audioCtx.decodeAudioData(buf);
}

export function playSound(name) {
    if (!audioCache[name]) return;
    const src = audioCtx.createBufferSource();
    src.buffer = audioCache[name];
    src.connect(audioCtx.destination);
    src.start();
}

let bgMusicSource = null;

export function playBgMusic(name) {
    if (bgMusicSource) { try { bgMusicSource.stop(); } catch {} bgMusicSource = null; }
    if (!audioCache[name]) return;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.35;
    bgMusicSource = audioCtx.createBufferSource();
    bgMusicSource.buffer = audioCache[name];
    bgMusicSource.loop = true;
    bgMusicSource.connect(gain);
    gain.connect(audioCtx.destination);
    bgMusicSource.start();
}

export function stopBgMusic() {
    if (bgMusicSource) { try { bgMusicSource.stop(); } catch {} bgMusicSource = null; }
}

Promise.all([
    loadAudio('grassland', 'sounds/grassland.mp3'),
    loadAudio('snow',      'sounds/snow.mp3'),
    loadAudio('hawk',      'sounds/hawk_sound.mp3'),
]).catch(err => console.warn('Audio load error:', err));
