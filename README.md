# Etno-Expandido — Un objeto, mil historias

Experiencia web mobile-first para recorrer con gafas Cardboard. Se abre con un código QR.

1. **Fase 1: pantallas iniciales.** El usuario toca la flecha de la pantalla de inicio y después "COMENZAR".
2. **Fase 2: recorrido 360°.** Dura 60 s y avanza sola, sin tocar la pantalla. Son 3 fondos 360° y en cada uno aparece una imagen flotante. La imagen sigue el movimiento de la cabeza.
3. **Fase 3: pantalla de cierre.** Es una pantalla estática.

## Dónde van las imágenes

Para cambiar una imagen, reemplazá el archivo **con el mismo nombre**.

```
assets/img/
├── pantallas/
│   ├── pantalla-inicio.jpg          ← "pantalla de inicio.pdf"
│   ├── pantalla-confirmacion.jpg    ← "panta de confirmacion.pdf"
│   └── pantalla-cierre.jpg          ← "pantalla cierre.png"
├── 360/
│   ├── 360-1ra.jpg                  ← "360 1ra.jpg.jpeg"
│   ├── 2daa.jpg                     ← "2daaa.jpg.jpeg"
│   └── 360-3ra.jpg                  ← "360 3ra.jpg.jpeg"
└── flotantes/
    ├── flotante-bernegal.png        ← "flotante bernegal.pdf"
    ├── flotante-mate-de-plata.png   ← "flotante mate de plata.pdf"
    └── flotante-mate-imperial.png   ← "flotante mate imperial.pdf"
```

**Cómo se convirtieron los originales:**
- **PDFs:** pasados a imagen. Los flotantes, a PNG con fondo transparente.
- **Fondos 360°:** reducidos de 8192 × 4096 a **4096 × 2048** (de ~20 MB a ~1,5 MB cada uno). Algunos celulares no muestran imágenes más grandes, y así cargan rápido con datos móviles.
- **Pantalla de cierre:** reducida de 10960 px a 2340 px de ancho.

**Formatos recomendados:**

| Tipo | Formato | Tamaño |
|---|---|---|
| Pantallas | JPG horizontal, 2:1 como las actuales | ~2340 × 1175 px |
| Fondos 360° | JPG equirectangular (proporción 2:1, la que exporta cualquier cámara 360) | **4096 × 2048 px**. Algunos celulares no muestran imágenes de más de 4096 px de ancho. |
| Flotantes | PNG con fondo transparente | ~900 px de lado |

Si un archivo tiene otro nombre o formato (por ejemplo `.webp`), cambiá la ruta en `js/config.js`.

## Estructura del código

| Archivo | Responsabilidad |
|---|---|
| `index.html` | Las 4 pantallas: inicio, confirmación, 360 y cierre |
| `css/styles.css` | Fundidos entre pantallas, capa flotante y división de las lentes |
| `js/config.js` | **Todo lo editable:** rutas de imágenes, zonas tocables y la línea de tiempo |
| `js/app.js` | Orquesta el flujo completo |
| `js/screens.js` | Pantallas estáticas: fundido y botones invisibles |
| `js/timeline.js` | Temporizador de la Fase 2 (`setTimeout` contra una hora de inicio única: no acumula desfase) |
| `js/vr.js` | Visor 360: pantalla dividida para Cardboard, seguimiento de cabeza e imágenes flotantes |
| `js/orientation.js` | Giroscopio: cálculo de la vista y permiso de iPhone |
| `js/stage.js` | Muestra todo en horizontal aunque el celular tenga el bloqueo de rotación activado |
| `js/device.js` | Pantalla completa (Android), traba horizontal y pantalla siempre encendida |
| `vendor/marzipano.js` | Librería 360 (Marzipano, Google, Apache 2.0) |

## Línea de tiempo (Fase 2)

Los tiempos se cuentan desde el toque en "COMENZAR" y se editan en `TIMELINE` dentro de `js/config.js`.

| Tiempo | Qué pasa |
|---|---|
| 0 s | Fondo 360 "360 1ra" |
| 10 s | Aparece "flotante bernegal" |
| 20 s | Fundido al fondo "2daa" (el flotante anterior se desvanece) |
| 30 s | Aparece "flotante mate de plata" |
| 40 s | Fundido al fondo "360 3ra" |
| 50 s | Aparece "flotante mate imperial" |
| 60 s | Fundido a "pantalla cierre" |

## Decisiones de diseño

- **Marzipano en vez de A-Frame o Pannellum.** El modo Cardboard de A-Frame depende de WebXR, que no funciona en iPhone. Pannellum no tiene pantalla dividida. Marzipano es liviano y dibuja la pantalla dividida y sigue la cabeza en Android y en iPhone.
- **Imágenes flotantes.** Son elementos HTML fijos sobre el canvas 360 (`z-index` superior), **duplicados: una copia centrada en cada ojo**, para que cada lente la vea en el centro. El fondo sigue girando detrás.
- **Pantallas en horizontal.** Los diseños son horizontales. Si el celular está vertical (o tiene el bloqueo de rotación), la app se dibuja girada 90° para el lado en que está el teléfono, según el sensor.
- **En el toque de "COMENZAR"** se piden el permiso del sensor (iPhone), la pantalla completa (Android) y que la pantalla no se apague. Los navegadores solo permiten estas acciones dentro de un toque del usuario.
- **Sin interacción en la Fase 2.** Tocar la pantalla no hace nada: todo avanza por tiempo.

## Probar

Hace falta un servidor. Con `file://` las imágenes 360 no cargan.

```bash
cd etno-expandido && python3 -m http.server 8370
```

Abrí `http://localhost:8370`. Atajos para probar, agregando parámetros al link:

- `?rapido`: la Fase 2 dura 12 s en vez de 60 (todo 5 veces más rápido).
- `?modo=pantalla`: vista única sin dividir, para mostrarlo sin gafas.
- Se pueden combinar: `?rapido&modo=pantalla`.

En el celular, el giroscopio **solo funciona con `https://`**. Publicalo antes de probarlo con las gafas.

## Publicar

La carpeta se publica tal cual en cualquier hosting estático con https (Vercel, Netlify, GitHub Pages). Para Vercel:

1. Subí el **contenido** de esta carpeta a la raíz de un repositorio, como archivos sueltos y nunca un `.zip`.
2. En Vercel: Framework Preset "Other", sin Build Command.
3. Generá el código QR con el link `https://…` que te da Vercel.
