// Phone motion sensor: head-tracking math and the shared sensor reading.

const DEG = Math.PI / 180;

function rotX(t) {
  const c = Math.cos(t), s = Math.sin(t);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

function rotY(t) {
  const c = Math.cos(t), s = Math.sin(t);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

function rotZ(t) {
  const c = Math.cos(t), s = Math.sin(t);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

function multiply(a, b) {
  const r = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    }
  }
  return r;
}

// Converts a deviceorientation reading (degrees) into Marzipano view angles
// for a camera looking out of the back of the screen. Earth frame: x east,
// y north, z up; device rotation R = Rz(alpha)·Rx(beta)·Ry(gamma) (W3C),
// then undo the screen rotation so landscape maps to the screen's axes.
// Returns null when looking straight up or down (heading undefined).
export function orientationToView(alpha, beta, gamma, screenAngle) {
  const m = multiply(multiply(multiply(rotZ(alpha * DEG), rotX(beta * DEG)), rotY(gamma * DEG)), rotZ(-screenAngle * DEG));
  // Matrix columns are the screen's right, up and normal axes in earth space.
  const right = [m[0], m[3], m[6]];
  const forward = [-m[2], -m[5], -m[8]];
  const horizontal = Math.hypot(forward[0], forward[1]);
  if (horizontal < 1e-6) {
    return null;
  }
  // Right axis of an unrolled camera with the same heading.
  const levelRight = [forward[1] / horizontal, -forward[0] / horizontal, 0];
  const cross = [
    levelRight[1] * right[2] - levelRight[2] * right[1],
    levelRight[2] * right[0] - levelRight[0] * right[2],
    levelRight[0] * right[1] - levelRight[1] * right[0],
  ];
  const sinRoll = cross[0] * forward[0] + cross[1] * forward[1] + cross[2] * forward[2];
  const cosRoll = levelRight[0] * right[0] + levelRight[1] * right[1];
  return {
    // Compass heading: clockwise from north, like Marzipano's yaw.
    yaw: Math.atan2(forward[0], forward[1]),
    // Marzipano's positive pitch looks down.
    pitch: -Math.asin(Math.max(-1, Math.min(1, forward[2]))),
    // Same sign as Marzipano's roll (positive = head tilted clockwise).
    roll: Math.atan2(sinRoll, cosRoll),
  };
}

// Which way the phone is turned, from gravity: 90 when its top points left
// (right edge up), -90 when its top points right. null while the phone is
// closer to flat or upright, so the layout does not flicker.
export function landscapeSideFromSensor({ beta, gamma }) {
  const rightEdgeUp = -Math.cos(beta * DEG) * Math.sin(gamma * DEG);
  if (rightEdgeUp > 0.5) {
    return 90;
  }
  if (rightEdgeUp < -0.5) {
    return -90;
  }
  return null;
}

export function screenOrientationAngle() {
  if (window.screen && screen.orientation && typeof screen.orientation.angle === 'number') {
    return screen.orientation.angle;
  }
  if (typeof window.orientation === 'number') {
    return window.orientation;
  }
  return 0;
}

// iOS 13+ only grants sensor access from a user gesture, after a prompt.
// Must be called synchronously inside the tap handler.
export function requestMotionPermission() {
  if (window.DeviceOrientationEvent &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    return DeviceOrientationEvent.requestPermission()
      .then((state) => state === 'granted', () => false);
  }
  return Promise.resolve(true);
}

// Keeps the latest sensor reading and tells subscribers about each new one.
// Android delivers readings right away; iOS only after permission.
export function createMotionSensor() {
  let reading = null;
  const listeners = new Set();

  function handle(event) {
    if (event.alpha == null && event.beta == null && event.gamma == null) {
      return;
    }
    reading = { alpha: event.alpha || 0, beta: event.beta || 0, gamma: event.gamma || 0 };
    listeners.forEach((listener) => listener(reading));
  }

  window.addEventListener('deviceorientation', handle);

  return {
    latest: () => reading,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      window.removeEventListener('deviceorientation', handle);
      listeners.clear();
    },
  };
}
