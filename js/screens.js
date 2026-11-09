import { FADE_MS } from './config.js';

// Full-screen sections ([data-screen]) that cross-fade into each other.
export function createScreens(root) {
  const screens = new Map(
    [...root.querySelectorAll('[data-screen]')].map((el) => [el.dataset.screen, el]),
  );
  let current = null;

  // Resolves once the fade has finished.
  function show(name) {
    const next = screens.get(name);
    if (!next || next === current) {
      return Promise.resolve();
    }
    if (current) {
      current.classList.remove('is-active');
      current.setAttribute('aria-hidden', 'true');
    }
    next.classList.add('is-active');
    next.removeAttribute('aria-hidden');
    current = next;
    return new Promise((resolve) => setTimeout(resolve, FADE_MS));
  }

  return { show };
}

// Sizes a static screen to its image and places its clickable area.
export function setupStaticScreen(section, { image, alt, hotspot }, onActivate) {
  const img = section.querySelector('.screen-image');
  img.src = image;
  img.alt = alt;
  img.decode().then(() => {
    section.style.setProperty('--ar', String(img.naturalWidth / img.naturalHeight));
  }, () => {});

  if (!hotspot) {
    return;
  }
  const button = section.querySelector('.hotspot');
  button.style.left = `${hotspot.left}%`;
  button.style.top = `${hotspot.top}%`;
  button.style.width = `${hotspot.width}%`;
  button.style.height = `${hotspot.height}%`;
  button.setAttribute('aria-label', hotspot.label);
  button.addEventListener('click', onActivate);
}
