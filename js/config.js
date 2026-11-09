// Everything that defines the experience lives here: image paths, the
// clickable areas on the static screens, where each card floats in the
// 360 scenes and how long every part lasts.

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

// Angular width of every card. Measured on "referencia imagen flotante":
// the card spans 66.7° of yaw at pitch -23.4°, i.e. 66.7° × cos(23.4°)
// = 61.2° as seen by the viewer. Height follows the image's proportions.
const CARD_WIDTH_DEG = 61.2;

// 360 backgrounds (equirectangular, 2:1) and the floating card of each one.
// `width` is the panorama's width in pixels; 4096 works on every phone.
// `initialYaw` (degrees) is the part of the panorama shown as the front.
// The card is anchored in the scene: `yaw` in degrees from the scene's
// front (positive = right), `pitch` in degrees (negative = above the
// horizon). The front is wherever the user is looking when the scene starts.
// Cards sit just above eye level, so they are read with the head level,
// without looking up.
// `cleanMs` is the time with the bare 360, `cardMs` the time with the card.
const CARD_PITCH = -8;
export const SCENES = [
  {
    panorama: 'assets/img/360/360-1ra.jpg',
    width: 4096,
    initialYaw: 0,
    card: {
      image: 'assets/img/flotantes/flotante-bernegal.png',
      alt: 'Bernegal. Tazón de cerámica.',
      // Same direction as in the reference: over the river and the spearmen.
      yaw: 72.5,
      pitch: CARD_PITCH,
      widthDeg: CARD_WIDTH_DEG,
    },
    cleanMs: 8000,
    cardMs: 25000, // 48 words
  },
  {
    panorama: 'assets/img/360/2daa.jpg',
    width: 4096,
    initialYaw: 0,
    card: {
      image: 'assets/img/flotantes/flotante-mate-de-plata.png',
      alt: 'Mate de plata. Calabaza y plata.',
      // Right side, past the church so its bell tower stays visible.
      yaw: 108,
      pitch: CARD_PITCH,
      widthDeg: CARD_WIDTH_DEG,
    },
    cleanMs: 8000,
    cardMs: 22000, // 40 words
  },
  {
    panorama: 'assets/img/360/360-3ra.jpg',
    width: 4096,
    initialYaw: 0,
    card: {
      image: 'assets/img/flotantes/flotante-mate-imperial.png',
      alt: 'Mate imperial. Calabaza y cuero.',
      // Left side, above the group drinking mate; on the right it would
      // cover the cathedral.
      yaw: -60,
      pitch: CARD_PITCH,
      widthDeg: CARD_WIDTH_DEG,
    },
    cleanMs: 8000,
    cardMs: 24000, // 46 words
  },
];

// Must match --fade-ms in css/styles.css.
export const FADE_MS = 800;
export const SCENE_FADE_MS = 1500;
