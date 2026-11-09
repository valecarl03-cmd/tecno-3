import { SCENE_FADE_MS } from './config.js';
import { orientationToView, screenOrientationAngle } from './orientation.js';

const { Marzipano } = window;
const DEG = Math.PI / 180;
// Vertical field of view per eye, close to a Cardboard lens.
const VR_FOV = 90 * DEG;
const LEFT_EYE_RECT = { relativeWidth: 0.5, relativeX: 0 };
const RIGHT_EYE_RECT = { relativeWidth: 0.5, relativeX: 0.5 };
// Show the "turn this way" arrow once the card's center is this far from
// the center of the view, i.e. the card is mostly out of sight.
const HINT_THRESHOLD = 40 * DEG;

function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

// The 360 part of the experience: Marzipano panoramas that follow the
// user's head, drawn twice side by side for Cardboard (`stereo`). Each
// scene's card is a flat plane anchored at a fixed yaw/pitch of the scene
// (a Marzipano perspective hotspot, built with CSS 3D transforms): it stays
// put in the world, and the user turns their head to read it.
export function createVrExperience({ container, hintLayer, scenes, stereo, sensor, stage }) {
  const viewer = new Marzipano.Viewer(container, { controls: { mouseViewMode: 'drag' } });
  const eyeRects = stereo ? [LEFT_EYE_RECT, RIGHT_EYE_RECT] : [null];
  container.classList.toggle('is-stereo', stereo);
  hintLayer.classList.toggle('is-mono', !stereo);
  const hints = [...hintLayer.querySelectorAll('.hint')];

  // Above the canvas; one hotspot container per eye clips to that eye.
  const cardLayer = document.createElement('div');
  cardLayer.className = 'card-layer';
  container.appendChild(cardLayer);

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

    const cards = eyeRects.map((rect, eye) => {
      const hotspots = new Marzipano.HotspotContainer(cardLayer, viewer.stage(), view,
        viewer.renderLoop(), rect ? { rect } : {});
      hotspots.hide();
      const element = document.createElement('div');
      element.className = 'floating-card';
      const img = document.createElement('img');
      img.src = config.card.image;
      // Both eyes show the same card; announce it only once.
      img.alt = eye === 0 ? config.card.alt : '';
      img.decoding = 'async';
      element.appendChild(img);
      const hotspot = hotspots.createHotspot(element,
        { yaw: config.card.yaw * DEG, pitch: config.card.pitch * DEG },
        { perspective: { radius: 1000 } });
      return { hotspots, hotspot, element };
    });

    return { config, scene, view, cards };
  });

  // Size every card so it spans its `widthDeg` of the view. The card sits at
  // a distance equal to the camera's focal length, so the browser draws it
  // at 1:1 scale: its layout pixels are its screen pixels, rasterized at the
  // phone's full pixel density. Placing it farther and drawing it bigger
  // would leave the GPU shrinking a texture without mipmaps, which shimmers.
  function fitCards() {
    const eyeHeight = container.clientHeight;
    if (!eyeHeight) {
      return;
    }
    const focal = 0.5 * eyeHeight / Math.tan(VR_FOV / 2);
    items.forEach(({ config, cards }) => {
      const width = 2 * focal * Math.tan((config.card.widthDeg * DEG) / 2);
      cards.forEach(({ hotspot, element }) => {
        element.style.width = `${width.toFixed(1)}px`;
        hotspot.setPerspective({ radius: focal });
      });
    });
  }
  fitCards();

  let current = null;
  let cardShown = false;
  let reading = null;
  let dirty = false;
  let needsCalibration = true;
  let yawOffset = 0;
  let frame = null;
  let hintSide = null;

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
    fitCards();
    dirty = true;
  });

  function applyHead() {
    dirty = false;
    const head = orientationToView(reading.alpha, reading.beta, reading.gamma,
      stage.angle() || screenOrientationAngle());
    if (!head) {
      return;
    }
    if (needsCalibration) {
      // Put the front of the image wherever the user is looking now.
      yawOffset = current.config.initialYaw * DEG - head.yaw;
      needsCalibration = false;
    }
    current.view.setParameters({ yaw: head.yaw + yawOffset, pitch: head.pitch, roll: head.roll, fov: VR_FOV });
  }

  // While the card is out of sight, an arrow at the edge of each eye
  // points the shorter way toward it.
  function updateHint() {
    let side = null;
    if (cardShown) {
      const delta = wrapAngle(current.config.card.yaw * DEG - current.view.yaw());
      if (Math.abs(delta) > HINT_THRESHOLD) {
        side = delta > 0 ? 'right' : 'left';
      }
    }
    if (side === hintSide) {
      return;
    }
    hintSide = side;
    hints.forEach((hint) => {
      hint.classList.toggle('is-visible', hint.dataset.side === side);
    });
  }

  function render() {
    frame = requestAnimationFrame(render);
    if (!current) {
      return;
    }
    if (dirty && reading) {
      applyHead();
    }
    updateHint();
  }
  frame = requestAnimationFrame(render);

  function setCardsVisible(item, visible) {
    item.cards.forEach(({ element }) => element.classList.toggle('is-visible', visible));
  }

  function showScene(index) {
    const previous = current;
    current = items[index];
    current.cards.forEach(({ hotspots }) => hotspots.show());
    current.view.setParameters({ yaw: current.config.initialYaw * DEG, pitch: 0, roll: 0, fov: VR_FOV });
    needsCalibration = true;
    dirty = true;
    current.scene.switchTo({ transitionDuration: SCENE_FADE_MS });
    if (previous && previous !== current) {
      // Let the previous card finish fading out with its scene.
      setTimeout(() => previous.cards.forEach(({ hotspots }) => hotspots.hide()), SCENE_FADE_MS);
    }
  }

  function showFloating(index) {
    const item = items[index];
    Promise.all(item.cards.map(({ element }) => element.firstChild.decode().catch(() => {})))
      .then(() => {
        setCardsVisible(item, true);
        cardShown = item === current;
      });
  }

  function hideFloating() {
    if (current) {
      setCardsVisible(current, false);
    }
    cardShown = false;
  }

  function destroy() {
    cancelAnimationFrame(frame);
    unsubscribeSensor();
    unsubscribeLayout();
    hideFloating();
    updateHint();
    items.forEach(({ cards }) => cards.forEach(({ hotspots }) => hotspots.destroy()));
    viewer.destroy();
    cardLayer.remove();
  }

  return {
    showScene,
    showFloating,
    hideFloating,
    hasHeadTracking: () => reading !== null,
    destroy,
  };
}
