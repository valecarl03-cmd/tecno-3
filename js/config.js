// Everything that defines the experience lives here: image paths, the
// clickable areas on the static screens and the 360 timeline.

export const SCREENS = {
  inicio: {
    image: 'assets/img/pantallas/pantalla-inicio.jpg',
    alt: 'Un objeto… mil historias. El bernegal nos abre una ventana a la vida en Santa Fe la Vieja.',
    // Area over the arrow button (bottom right), in % of the image.
    hotspot: { left: 75.8, top: 76.8, width: 14.9, height: 13.9, label: 'Continuar' },
  },
  confirmacion: {
    image: 'assets/img/pantallas/pantalla-confirmacion.jpg',
    alt: 'Tocá “comenzar” cuando hayas acomodado el celular dentro de las gafas y estés listo.',
    // Area over the "COMENZAR" button, in % of the image.
    hotspot: { left: 34.2, top: 72.6, width: 31.6, height: 14.0, label: 'Comenzar' },
  },
  cierre: {
    image: 'assets/img/pantallas/pantalla-cierre.jpg',
    alt: 'Fin de la experiencia.',
  },
};

// 360 backgrounds (equirectangular, 2:1) and the floating image of each one.
// `width` is the panorama's width in pixels; 4096 works on every phone.
export const SCENES = [
  {
    panorama: 'assets/img/360/360-1ra.jpg',
    width: 4096,
    initialYaw: 0,
    floating: 'assets/img/flotantes/flotante-bernegal.png',
    floatingAlt: 'Bernegal',
  },
  {
    panorama: 'assets/img/360/2daa.jpg',
    width: 4096,
    initialYaw: 0,
    floating: 'assets/img/flotantes/flotante-mate-de-plata.png',
    floatingAlt: 'Mate de plata',
  },
  {
    panorama: 'assets/img/360/360-3ra.jpg',
    width: 4096,
    initialYaw: 0,
    floating: 'assets/img/flotantes/flotante-mate-imperial.png',
    floatingAlt: 'Mate imperial',
  },
];

// Milliseconds from the moment "COMENZAR" is tapped.
export const TIMELINE = [
  { at: 0, type: 'scene', scene: 0 },
  { at: 10000, type: 'floating', scene: 0 },
  { at: 20000, type: 'scene', scene: 1 },
  { at: 30000, type: 'floating', scene: 1 },
  { at: 40000, type: 'scene', scene: 2 },
  { at: 50000, type: 'floating', scene: 2 },
  { at: 60000, type: 'end' },
];

// Must match --fade-ms in css/styles.css.
export const FADE_MS = 800;
export const SCENE_FADE_MS = 1500;
