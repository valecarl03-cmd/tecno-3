import { landscapeSideFromSensor } from './orientation.js';

// The whole experience is designed in landscape (screens and Cardboard
// split). When the browser shows the page in portrait — before the user
// turns the phone, or with the rotation lock on — draw the app rotated a
// quarter turn toward the side gravity says the phone is turned.
export function createLandscapeStage(appElement, sensor) {
  let angle = 0;
  let width = 0;
  let height = 0;
  const layoutListeners = new Set();

  function update() {
    let next = 0;
    if (window.innerHeight > window.innerWidth) {
      const reading = sensor.latest();
      const side = reading ? landscapeSideFromSensor(reading) : null;
      next = side !== null ? side : (angle || 90);
    }
    if (next === angle && window.innerWidth === width && window.innerHeight === height) {
      return;
    }
    angle = next;
    width = window.innerWidth;
    height = window.innerHeight;

    const style = appElement.style;
    if (angle) {
      style.width = `${window.innerHeight}px`;
      style.height = `${window.innerWidth}px`;
      style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    } else {
      style.width = style.height = style.transform = '';
    }
    appElement.classList.toggle('is-rotated', angle !== 0);
    layoutListeners.forEach((listener) => listener());
  }

  const unsubscribe = sensor.subscribe(update);
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', update);
  update();

  return {
    // Rotation applied to the app, in degrees (0 when not rotated).
    angle: () => angle,
    onLayout(listener) {
      layoutListeners.add(listener);
      return () => layoutListeners.delete(listener);
    },
    destroy() {
      unsubscribe();
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      layoutListeners.clear();
    },
  };
}
