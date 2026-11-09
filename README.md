# Etno-Expandido — Un objeto, mil historias

Experiencia web mobile-first para recorrer con gafas Cardboard. Se abre con un código QR.

1. **Fase 1: pantallas iniciales.** El usuario toca la flecha de la pantalla de inicio y después "COMENZAR".
2. **Fase 2: recorrido 360°.** Dura 95 s y avanza sola, sin tocar la pantalla. Son 3 fondos 360°. En cada uno aparece una tarjeta fija en un punto del paisaje, y el usuario gira la cabeza hacia ella para leerla. La imagen sigue el movimiento de la cabeza.
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
| `css/styles.css` | Fundidos entre pantallas, tarjetas, flechas guía y división de las lentes |
| `js/config.js` | **Todo lo editable:** rutas de imágenes, zonas tocables, posición de cada tarjeta y duraciones |
| `js/app.js` | Orquesta el flujo completo |
| `js/screens.js` | Pantallas estáticas: fundido y botones invisibles |
| `js/timeline.js` | Arma la línea de tiempo con las duraciones y la ejecuta (`setTimeout` contra una hora de inicio única: no acumula desfase) |
| `js/vr.js` | Visor 360: pantalla dividida para Cardboard, seguimiento de cabeza, tarjetas ancladas en 3D y flechas guía |
| `js/orientation.js` | Giroscopio: cálculo de la vista y permiso de iPhone |
| `js/stage.js` | Muestra todo en horizontal aunque el celular tenga el bloqueo de rotación activado |
| `js/device.js` | Pantalla completa (Android), traba horizontal y pantalla siempre encendida |
| `vendor/marzipano.js` | Librería 360 (Marzipano, Google, Apache 2.0) |

## Tarjetas en el espacio 3D

Cada tarjeta es un plano fijo en un punto del paisaje 360°, siempre de frente al usuario. Si el usuario no gira la cabeza hacia ella, no la ve. Se configura en `card` de cada escena, dentro de `js/config.js`.

Todas las tarjetas están en **el mismo punto respecto del grupo de personas** de su escena, igual que en la referencia. La esquina inferior izquierda de la tarjeta queda arriba a la derecha del grupo: el borde izquierdo empieza 2,4° antes del borde derecho del grupo, y el borde inferior queda a la altura de las cabezas.

| Escena | Tarjeta | Grupo de personas (borde derecho · cabezas) | yaw | pitch | Ancho |
|---|---|---|---|---|---|
| 360 1ra | Bernegal | Ronda sentada (+44° · +9°) | **+72,5°** | **−8°** | **61,2°** |
| 2daa | Mate de plata | Grupo en la mesa (+44° · +7°) | **+72,5°** | **−8°** | **61,2°** |
| 360 3ra | Mate imperial | Jóvenes tomando mate (−21° · +20°) | **+7°** | **+4°** | **61,2°** |

**Cómo leer estos valores:**
- **yaw:** positivo es a la derecha del frente.
- **pitch:** negativo es arriba del horizonte. Las tres tarjetas quedan cerca de la altura de los ojos y se leen sin levantar la cabeza.
- **Escena 3:** los jóvenes están más cerca de la cámara y se ven más abajo, por eso su tarjeta también queda más baja.

**Qué tapa cada tarjeta:** por esta regla, en la escena 2 la tarjeta tapa la iglesia y en la escena 3 la base del obelisco.

**De dónde salen estos valores:**
- **Tamaño y dirección:** se calcularon comparando "referencia imagen flotante" con el panorama original, con una coincidencia del 98,6%. La referencia es un recorte del panorama "360 1ra". La tarjeta ocupa 66,7° de ancho a −23,4° de altura, lo que equivale a **66,7° × cos(23,4°) = 61,2°** vistos por el usuario. El alto sale de la proporción de la imagen (~37°).
- **Escenas 2 y 3:** solo hay referencia para la escena 1, así que usan el mismo tamaño, en el lugar libre más cercano.
- **El ángulo yaw** se cuenta desde el frente de cada escena, que es donde está mirando el usuario cuando la escena empieza.
- **En la pantalla de un ojo,** mirándola de frente, la tarjeta ocupa ~55% del ancho.

**Flecha guía:** si la tarjeta está fuera de la vista (a más de 40° del centro), en cada ojo aparece una flecha que indica hacia qué lado girar. Desaparece cuando la tarjeta entra en la vista.

**Nitidez:** la tarjeta se ubica a una distancia igual a la distancia focal de la cámara, así el navegador la dibuja en escala 1:1. Cada píxel del diseño queda en un píxel de la pantalla, con toda la densidad del celular. Si se dibujara más grande y luego se achicara, se vería con parpadeo y bordes serruchados. El archivo de la tarjeta (1200 px) es más grande que lo que ocupa en pantalla (~700 píxeles reales), así que siempre se achica con buena calidad y nunca se agranda.

## Línea de tiempo (Fase 2)

Los tiempos se cuentan desde el toque en "COMENZAR". Se editan en cada escena de `js/config.js`: `cleanMs` es el tiempo del 360 solo, y `cardMs` el tiempo con la tarjeta.

| Tiempo | Qué pasa |
|---|---|
| 0 s | Fondo 360 "360 1ra" |
| 8 s | Aparece la tarjeta "Bernegal" (25 s) |
| 33 s | Fundido al fondo "2daa" (la tarjeta anterior se desvanece) |
| 41 s | Aparece la tarjeta "Mate de plata" (22 s) |
| 63 s | Fundido al fondo "360 3ra" |
| 71 s | Aparece la tarjeta "Mate imperial" (24 s) |
| 95 s | Fundido a "pantalla cierre" |

**Por qué estos tiempos (auditoría de lectura):**
- **Velocidad de lectura:** la lectura silenciosa en papel en español ronda las 220 palabras por minuto. Con gafas Cardboard, baja resolución y texto fijo en el espacio, se toma una estimación conservadora de **150 palabras/minuto (2,5 palabras/s)**.
- **Tiempo por tarjeta:** ~4 s para encontrarla y girar la cabeza, más el texto a 2,5 palabras/s, más 2 s de margen.
  - Bernegal: 48 palabras → 4 + 19 + 2 ≈ **25 s**
  - Mate de plata: 40 palabras → 4 + 16 + 2 ≈ **22 s**
  - Mate imperial: 46 palabras → 4 + 18 + 2 ≈ **24 s**
- **Antes eran 10 s,** y alcanzaban para leer menos de la mitad.
- **El 360 sin tarjeta pasa de 10 s a 8 s,** para que la experiencia no se alargue de más. Con 8 s alcanza para ubicarse en la escena.
- **Duración total: 95 s.** Es razonable para sostener las gafas con la mano.

## Decisiones de diseño

- **Marzipano en vez de A-Frame o Pannellum.** El modo Cardboard de A-Frame depende de WebXR, que no funciona en iPhone. Pannellum no tiene pantalla dividida. Marzipano es liviano y dibuja la pantalla dividida y sigue la cabeza en Android y en iPhone.
- **Tarjetas ancladas en 3D.** Es el equivalente en Marzipano a `position`/`rotation` de A-Frame: hotspots en "perspectiva", es decir, elementos HTML ubicados en 3D con transformaciones CSS. Hay **una copia por ojo**, cada una recortada a su mitad de pantalla.
- **Pantallas en horizontal.** Los diseños son horizontales. Si el celular está vertical (o tiene el bloqueo de rotación), la app se dibuja girada 90° para el lado en que está el teléfono, según el sensor.
- **En el toque de "COMENZAR"** se piden el permiso del sensor (iPhone), la pantalla completa (Android) y que la pantalla no se apague. Los navegadores solo permiten estas acciones dentro de un toque del usuario.
- **Sin interacción en la Fase 2.** Tocar la pantalla no hace nada: todo avanza por tiempo.

## Probar

Hace falta un servidor. Con `file://` las imágenes 360 no cargan.

```bash
cd etno-expandido && python3 -m http.server 8370
```

Abrí `http://localhost:8370`. Atajos para probar, agregando parámetros al link:

- `?rapido`: la Fase 2 dura 19 s en vez de 95 (todo 5 veces más rápido).
- `?modo=pantalla`: vista única sin dividir, para mostrarlo sin gafas.
- Se pueden combinar: `?rapido&modo=pantalla`.

En el celular, el giroscopio **solo funciona con `https://`**. Publicalo antes de probarlo con las gafas.

## Publicar

La carpeta se publica tal cual en cualquier hosting estático con https (Vercel, Netlify, GitHub Pages). Para Vercel:

1. Subí el **contenido** de esta carpeta a la raíz de un repositorio, como archivos sueltos y nunca un `.zip`.
2. En Vercel: Framework Preset "Other", sin Build Command.
3. Generá el código QR con el link `https://…` que te da Vercel.
