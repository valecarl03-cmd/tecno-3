import { FADE_MS, SCENES, SCREENS } from './config.js';
import { createWakeLock, exitFullscreen, requestFullscreen, unlockOrientation } from './device.js';
import { createMotionSensor, requestMotionPermission } from './orientation.js';
import { createScreens, setupStaticScreen } from './screens.js';
import { createLandscapeStage } from './stage.js';
import { buildTimeline, runTimeline } from './timeline.js';
import { createVrExperience } from './vr.js';

// Testing aids: ?rapido runs the 360 timeline 5x faster;
// ?modo=pantalla shows a single view instead of the Cardboard split.
const params = new URLSearchParams(window.location.search);
const SPEED = params.has('rapido') ? 0.2 : 1;
const STEREO = params.get('modo') !== 'pantalla';
const NO_SENSOR_TIMEOUT = 3000;
const NOTICE_MS = 6000;

const app = document.querySelector('#app');
const vrSection = document.querySelector('[data-screen="vr"]');
const notice = vrSection.querySelector('.vr-notice');

const sensor = createMotionSensor();
const stage = createLandscapeStage(app, sensor);
const screens = createScreens(app);
const wakeLock = createWakeLock();

let experience = null;

function preload(urls) {
  urls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}

function showNotice(text) {
  notice.textContent = text;
  notice.classList.add('is-visible');
  setTimeout(() => notice.classList.remove('is-visible'), NOTICE_MS);
}

function startExperience() {
  if (experience) {
    return;
  }
  // Permission, fullscreen and wake lock all need this tap's user gesture,
  // so they are requested before anything asynchronous happens.
  const permission = requestMotionPermission();
  const ownsFullscreen = requestFullscreen();
  wakeLock.acquire();

  const vr = createVrExperience({
    container: vrSection.querySelector('.pano'),
    hintLayer: vrSection.querySelector('.hint-layer'),
    scenes: SCENES,
    stereo: STEREO,
    sensor,
    stage,
  });

  const cancelTimeline = runTimeline(buildTimeline(SCENES), (event) => {
    if (event.type === 'scene') {
      vr.hideFloating();
      vr.showScene(event.scene);
    } else if (event.type === 'floating') {
      vr.showFloating(event.scene);
    } else if (event.type === 'end') {
      finishExperience();
    }
  }, { speed: SPEED });

  experience = { vr, cancelTimeline, ownsFullscreen };
  screens.show('vr');

  // Only warn if no sensor reading has arrived after a while; some browsers
  // report a refused permission yet still deliver readings.
  permission.then((granted) => {
    setTimeout(() => {
      if (!vr.hasHeadTracking()) {
        let message = 'No se detecta el giroscopio. Arrastrá para mirar alrededor.';
        if (!window.isSecureContext) {
          message = 'El giroscopio solo funciona si la página se abre con https://';
        } else if (!granted) {
          message = 'Sin permiso para el sensor de movimiento: la imagen no seguirá tu cabeza.';
        }
        showNotice(message);
      }
    }, NO_SENSOR_TIMEOUT);
  });
}

function finishExperience() {
  const { vr, cancelTimeline, ownsFullscreen } = experience;
  cancelTimeline();
  vr.hideFloating();
  screens.show('cierre').then(() => {
    vr.destroy();
    wakeLock.release();
    unlockOrientation();
    if (ownsFullscreen) {
      exitFullscreen();
    }
  });
}

setupStaticScreen(app.querySelector('[data-screen="inicio"]'), SCREENS.inicio,
  () => screens.show('confirmacion'));
setupStaticScreen(app.querySelector('[data-screen="confirmacion"]'), SCREENS.confirmacion,
  startExperience);
setupStaticScreen(app.querySelector('[data-screen="cierre"]'), SCREENS.cierre);

// Warm the cache so every transition is instant.
preload([
  SCREENS.confirmacion.image,
  SCREENS.cierre.image,
  ...SCENES.flatMap((scene) => [scene.panorama, scene.card.image]),
]);

document.documentElement.style.setProperty('--fade-ms', `${FADE_MS}ms`);
screens.show('inicio');
