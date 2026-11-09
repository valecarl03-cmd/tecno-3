import { SCENE_FADE_MS } from './config.js';
import { orientationToView, screenOrientationAngle } from './orientation.js';

const { Marzipano } = window;
const DEG = Math.PI / 180;
// Vertical field of view per eye, close to a Cardboard lens.
const VR_FOV = 90 * DEG;
const LEFT_EYE_RECT = { relativeWidth: 0.5, relativeX: 0 };
const RIGHT_EYE_RECT = { relativeWidth: 0.5, relativeX: 0.5 };

// The 360 part of the experience: Marzipano panoramas that follow the
// user's head, drawn twice side by side for Cardboard (`stereo`), with the
// floating images as plain DOM layered above the canvas.
export function createVrExperience({ container, floatingLayer, scenes, stereo, sensor, stage }) {
  const viewer = new Marzipano.Viewer(container, { controls: { mouseViewMode: 'drag' } });
  const floatingImages = [...floatingLayer.querySelectorAll('.floating-img')];
  floatingLayer.classList.toggle('is-mono', !stereo);
  container.classList.toggle('is-stereo', stereo);

  const items = scenes.map((config) => {
    const source = Marzipano.ImageUrlSource.fromString(config.panorama);
    const geometry = new Marzipano.EquirectGeometry([{ width: config.width }]);
    const limiter = Marzipano.RectilinearView.limit.traditional(config.width, 120 * DEG, 120 * DEG);
    const view = new Marzipano.RectilinearView({ yaw: config.initialYaw, pitch: 0, fov: VR_FOV }, limiter);
    const scene = viewer.createScene({ source, geometry, view, pinFirstLevel: true });
    if (stereo) {
      // Both layers share the scene's view, so the eyes always move together;
      // the stage sizes the view to each layer's rect, keeping the aspect right.
      scene.listLayers()[0].mergeEffects({ rect: LEFT_EYE_RECT });
      const rightEye = scene.createLayer({ source, geometry, pinFirstLevel: true });
      rightEye.mergeEffects({ rect: RIGHT_EYE_RECT });
    }
    return { config, scene, view };
  });

  let current = null;
  let reading = null;
  let dirty = false;
  let needsCalibration = true;
  let yawOffset = 0;
  let frame = null;

  const unsubscribeSensor = sensor.subscribe((next) => {
    if (!reading) {
      // The head drives the view from now on; dragging would fight it.
      viewer.controls().disable();
    }
    reading = next;
    dirty = true;
  });
  const unsubscribeLayout = stage.onLayout(() => {
    // Marzipano only measures its container on window resize.
    viewer.updateSize();
    dirty = true;
  });

  // Applies the latest sensor reading once per frame.
  function render() {
    frame = requestAnimationFrame(render);
    if (!dirty || !reading || !current) {
      return;
    }
    dirty = false;
    const head = orientationToView(reading.alpha, reading.beta, reading.gamma,
      stage.angle() || screenOrientationAngle());
    if (!head) {
      return;
    }
    if (needsCalibration) {
      // Put the front of the image wherever the user is looking now.
      yawOffset = current.config.initialYaw - head.yaw;
      needsCalibration = false;
    }
    current.view.setParameters({ yaw: head.yaw + yawOffset, pitch: head.pitch, roll: head.roll, fov: VR_FOV });
  }
  frame = requestAnimationFrame(render);

  function showScene(index) {
    current = items[index];
    current.view.setParameters({ yaw: current.config.initialYaw, pitch: 0, roll: 0, fov: VR_FOV });
    needsCalibration = true;
    dirty = true;
    current.scene.switchTo({ transitionDuration: SCENE_FADE_MS });
  }

  function showFloating(index) {
    const { floating, floatingAlt } = items[index].config;
    floatingImages.forEach((img, eye) => {
      img.src = floating;
      // Both eyes show the same image; announce it only once.
      img.alt = eye === 0 ? floatingAlt : '';
    });
    Promise.all(floatingImages.map((img) => img.decode().catch(() => {}))).then(() => {
      floatingLayer.classList.add('is-visible');
    });
  }

  function hideFloating() {
    floatingLayer.classList.remove('is-visible');
  }

  function destroy() {
    cancelAnimationFrame(frame);
    unsubscribeSensor();
    unsubscribeLayout();
    hideFloating();
    viewer.destroy();
  }

  return {
    showScene,
    showFloating,
    hideFloating,
    hasHeadTracking: () => reading !== null,
    destroy,
  };
}
