// Browser features that make the phone behave well inside the goggles.

// Must run inside a tap handler. Returns whether fullscreen was requested.
export function requestFullscreen(element = document.documentElement) {
  const request = element.requestFullscreen || element.webkitRequestFullscreen;
  if (!request || document.fullscreenElement) {
    return false;
  }
  const result = request.call(element);
  if (result && typeof result.then === 'function') {
    // Then lock to landscape, which Android only allows in fullscreen.
    result.then(lockLandscape, () => {});
  }
  return true;
}

export function exitFullscreen() {
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

function lockLandscape() {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
}

export function unlockOrientation() {
  if (screen.orientation && screen.orientation.unlock) {
    try {
      screen.orientation.unlock();
    } catch (error) {
      // Not locked, or not supported.
    }
  }
}

// Keeps the screen on; re-acquired when the page becomes visible again,
// since browsers drop the lock whenever the page is hidden.
export function createWakeLock() {
  let lock = null;
  let wanted = false;

  function acquire() {
    wanted = true;
    if (!navigator.wakeLock || lock) {
      return;
    }
    navigator.wakeLock.request('screen').then((sentinel) => {
      lock = sentinel;
      sentinel.addEventListener('release', () => {
        lock = null;
      });
    }, () => {});
  }

  function handleVisibility() {
    if (wanted && !document.hidden) {
      acquire();
    }
  }

  document.addEventListener('visibilitychange', handleVisibility);

  return {
    acquire,
    release() {
      wanted = false;
      if (lock) {
        lock.release().catch(() => {});
        lock = null;
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    },
  };
}
