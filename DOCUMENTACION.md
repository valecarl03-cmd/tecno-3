# Tour 360° con realidad virtual (Cardboard) — Documentación completa

Este documento reúne todo lo que se construyó: qué hace la web, cómo usarla, cómo está hecha por dentro, cómo se publica y cómo verificar que funciona.

| | |
|---|---|
| **Web publicada** | https://tecno-3.vercel.app |
| **Repositorio** | https://github.com/valecarl03-cmd/tecno-3 (rama `main`) |
| **Hosting** | Vercel: publica solo cada cambio que se sube a `main` |
| **Tecnología** | Tour 360° exportado con Marzipano. HTML, CSS y JavaScript sin frameworks ni compilación. |

---

## 1. Resumen

La web es un **tour de imágenes 360°** con dos formas de verlo:

- **Modo normal** (computadora o celular): se navega arrastrando, y si nadie interactúa durante **8 segundos**, la imagen pasa sola a la siguiente.
- **Modo realidad virtual** (celular + visor Cardboard): la pantalla se divide en **dos mitades, izquierda y derecha, una para cada ojo**. La imagen **sigue el movimiento de la cabeza** y **pasa sola cada 8 segundos**, sin tocar la pantalla.

---

## 2. Qué se construyó (cronología)

| # | Trabajo | Resultado |
|---|---|---|
| 1 | **Pase automático por inactividad** | Cambia de imagen cada 8 s sin interacción. Cualquier interacción reinicia la cuenta desde cero. Muestra una barra de cuenta regresiva. |
| 2 | **Modo VR para Cardboard** | Botón "Ver en VR": pantalla partida para los dos ojos, seguimiento de cabeza con el giroscopio y pase automático cada 8 s. |
| 3 | **Corrección de la publicación en Vercel** | La web daba **404**: el repositorio tenía solo un `.zip` y Vercel no lo descomprime. Los archivos se movieron a la raíz del repositorio. |
| 4 | **VR siempre horizontal** | Con el bloqueo de rotación activado, la división quedaba arriba/abajo. Ahora la vista VR se arma siempre en horizontal, una mitad por ojo, aunque el navegador no gire. |
| 5 | **Reparación de la lista de imágenes** | Una edición desde GitHub cambió los `data-id` a `"."` y la web quedaba en negro. Se restauraron los códigos y se mantuvieron los nombres `"."` elegidos. |

---

## 3. Cómo usarlo

### 3.1 Modo normal

- **Mirar alrededor:** arrastrar con el dedo o el mouse.
- **Cambiar de imagen a mano:** lista de imágenes (botón arriba a la izquierda).
- **Pase automático:** si nadie toca nada durante 8 s, pasa a la siguiente imagen. La barrita bajo el título muestra la cuenta regresiva.
- **Botón play/pausa** (arriba a la derecha): frena o reactiva el giro automático y el pase de imágenes.

### 3.2 Modo realidad virtual (con visor)

1. Abrí **https://tecno-3.vercel.app** en el celular (Chrome en Android, Safari en iPhone).
2. Tocá **"Ver en VR"** (abajo, al centro).
3. Solo en iPhone: tocá **Permitir** cuando pregunte por "Movimiento y orientación".
4. Poné el celular **horizontal** dentro del visor. Funciona para cualquiera de los dos lados y aunque el celular tenga el bloqueo de rotación activado.
5. Mirá alrededor moviendo la cabeza. Cada 8 s cambia la imagen.
6. Para salir: sacá el celular y tocá **"Salir de VR"** (en el centro del borde superior).

**Dentro del visor:**

| Elemento | Función |
|---|---|
| Dos mitades (izquierda y derecha) | Una imagen para cada ojo |
| Línea negra al medio | Separación entre las lentes |
| Barrita blanca bajo el centro | Cuenta regresiva de 8 s |
| Nombre de la imagen | Aparece unos segundos al cambiar de imagen |

**Atajos:**
- **Tocar la pantalla** (o el botón lateral del Cardboard) pasa a la imagen siguiente al instante.
- Cada imagen nueva se acomoda para que **su frente quede donde estás mirando**.

---

## 4. Requisitos

| Requisito | Motivo |
|---|---|
| Página con **`https://`** | El celular solo da acceso al giroscopio en páginas seguras. El link de Vercel ya es `https://`. |
| Celular con **giroscopio** | Lo tienen prácticamente todos los celulares actuales. |
| **iPhone:** permitir "Movimiento y orientación" | iOS lo pregunta una vez. |
| Navegador: **Chrome** (Android) o **Safari** (iPhone) | Son los navegadores probados para estas funciones. |

**Consejos:**
- **Android:** al entrar a VR, la página pasa a pantalla completa.
- **iPhone:** Safari no tiene pantalla completa. Para sacar las barras del navegador, usá *Compartir → Agregar a pantalla de inicio* y abrí el tour desde ese ícono.
- La pantalla **no se apaga** en modo VR, en los navegadores que lo permiten.
- Brillo al máximo para el visor.

---

## 5. Estructura del proyecto

Todo está en la **raíz del repositorio**: es lo que Vercel publica tal cual.

```
tecno-3/
├── index.html          Estructura de la página: visor, botones, capa VR
├── index.js            Toda la lógica: pase automático, giroscopio, modo VR
├── style.css           Estilos: barra de cuenta regresiva y modo VR
├── data.js             Lista de imágenes y ajustes generales (exportado por Marzipano)
├── img/                Íconos de los botones
├── tiles/              Las 3 imágenes 360°, cortadas en caras de cubo
├── vendor/             Librerías externas: Marzipano, screenfull, bowser
├── tests/
│   ├── idle.test.js    Pruebas del pase automático (19)
│   └── gyro.test.js    Pruebas del giroscopio y la orientación (13)
├── DOCUMENTACION.md    Este documento
├── LICENSE.txt         Licencia de Marzipano (Apache 2.0)
└── .gitignore          Excluye archivos basura de macOS y .zip
```

### Mapa de funciones en `index.js`

| Línea | Función / ajuste | Qué hace |
|---|---|---|
| 40 | `IDLE_AUTOPLAY_DELAY` | Tiempo entre imágenes: 8000 ms |
| 204 | `switchScene` | Cambia de imagen. En VR, pide recalibrar el frente. |
| 287 | `shouldAutoplay` | Define si corre el pase automático: botón play activo o modo VR |
| 292 | `switchToNextScene` | Pasa a la siguiente imagen; después de la última vuelve a la primera |
| 300 | `createIdleAutoplay` | Motor del temporizador de inactividad |
| 554 | `VR_FOV` | Campo visual en el visor: 90° |
| 561 | `ROLL_SIGN` | Sentido de la inclinación de la cabeza (verificado) |
| 610 | `orientationToView` | Convierte los datos del sensor en dirección de la vista |
| 649 | `vrScreenAngle` | Rotación de pantalla que usa el cálculo de la cabeza |
| 656 | `landscapeSideFromSensor` | Detecta para qué lado está girado el celular |
| 671 | `updateVrLayout` | Fuerza la vista horizontal cuando la página quedó vertical |
| 707 | `handleDeviceOrientation` | Recibe cada lectura del giroscopio |
| 723 | `renderVrFrame` | Aplica la última lectura en cada cuadro |
| 749 | `setStereo` | Activa o desactiva la pantalla partida |
| 771 | `requestMotionPermission` | Pide permiso del sensor (iPhone) |
| 785 | `requestFullscreen` | Pide pantalla completa (Android) |
| 815 | `acquireWakeLock` | Evita que la pantalla se apague |
| 847 | `enterVr` | Entra al modo VR |
| 893 | `exitVr` | Sale del modo VR y deja todo como estaba |
| 946 | `handleVrOverlayClick` | Toque en VR: pasa a la siguiente imagen |
| 952 | `destroyVr` | Limpieza completa del modo VR |
| 973 | `handlePageHide` | Limpieza al cerrar la página |

---

## 6. Cómo funciona por dentro

### 6.1 Pase automático por inactividad

- Hay **un solo temporizador** de 8000 ms. Al cumplirse, cambia de imagen y se vuelve a armar (`setTimeout` recursivo). Nunca se acumulan cambios.
- **Cualquier interacción lo reinicia desde cero.** Los eventos escuchados son:
  - `click`, `mouseenter`, `mouseleave`, `touchstart`, `touchend`, `scroll`
  - `pointerdown`, `pointermove`, `wheel`, `keydown`: cubren el arrastre y el zoom del visor 360°, que no generan clicks.
- Se escuchan en **fase de captura** sobre toda la página. Así se detectan también eventos que no se propagan (`scroll`, `mouseenter`) y los que el visor bloquea internamente.
- **Mover la cabeza no cuenta como interacción**: el giroscopio no genera esos eventos. Por eso en VR las imágenes pasan cada 8 s mientras mirás alrededor.
- **Pausas automáticas:**
  - Con la pestaña oculta no avanza. Al volver, la cuenta arranca otra vez desde 8 s.
  - El botón pausa lo detiene.
- **Limpieza:** al cerrar la página se eliminan el temporizador y todas las escuchas, para evitar consumo de memoria.

### 6.2 Seguimiento de la cabeza (giroscopio)

1. El celular informa su orientación con tres ángulos (`alpha`, `beta`, `gamma`) en el evento `deviceorientation`.
2. Se arma una **matriz de rotación** y se compensa la rotación de pantalla (horizontal hacia un lado o hacia el otro).
3. Se calculan los tres ángulos de la vista:
   - **yaw**: izquierda/derecha.
   - **pitch**: arriba/abajo.
   - **roll**: inclinación de la cabeza, para mantener el horizonte derecho.
4. En cada cuadro de pantalla se aplica la última lectura.
5. **Calibración:** al entrar a VR y en cada cambio de imagen, el frente de la imagen se ubica donde está mirando el usuario.

Los sentidos se verificaron contra la librería: girar a la derecha aumenta el yaw, mirar abajo da pitch positivo, y el roll compensa la inclinación.

### 6.3 Pantalla partida (estéreo)

- Cada imagen se dibuja **dos veces**: una capa en la mitad izquierda y otra en la derecha.
- Las dos capas **comparten la misma cámara**, así que se mueven exactamente juntas.
- El visor ajusta la proporción de cada mitad, así que la imagen no se deforma.
- Al salir de VR, la segunda capa se destruye para liberar memoria.

### 6.4 Vista siempre horizontal (bloqueo de rotación)

**Problema:** con el bloqueo de rotación activado (muy común en iPhone), el navegador no gira la página. La división quedaba izquierda/derecha del celular *vertical*, o sea arriba/abajo al ponerlo horizontal en el visor.

**Solución** (`updateVrLayout`):
- Si en modo VR la página está vertical, el visor y la capa VR se dibujan en formato horizontal (alto × ancho) y **rotados 90°**.
- El **sensor de gravedad** decide para qué lado rotar: +90° si la parte de arriba del celular está a la izquierda, −90° si está a la derecha.
- Si el celular está casi plano o vertical, se mantiene la última rotación, así no parpadea.
- El cálculo de la cabeza usa la misma rotación, así que el seguimiento sigue siendo correcto.
- Si el navegador ya está en horizontal (sin bloqueo de rotación), no se fuerza nada.

### 6.5 Entrar y salir de VR

**Al entrar** (`enterVr`):
- Pide permiso del sensor (iPhone) y pantalla completa (Android), en el mismo toque: el navegador no los permite fuera de un toque del usuario.
- Traba la orientación en horizontal (Android) y mantiene la pantalla encendida.
- Oculta los botones normales, desactiva el arrastre y el giro automático.
- Activa la pantalla partida, el seguimiento de la cabeza y el pase automático.

**Avisos en pantalla** si algo falta:
- Sin permiso del sensor.
- Página sin `https://`.
- No se detecta el giroscopio.

**Al salir** (`exitVr`): deshace todo y vuelve la vista normal. En Android, el gesto "atrás" que cierra la pantalla completa también sale de VR.

---

## 7. Ajustes que se pueden cambiar

| Qué | Dónde | Valor actual |
|---|---|---|
| Segundos entre imágenes | `index.js` línea 40: `IDLE_AUTOPLAY_DELAY` | `8000` (8 s) |
| Campo visual en el visor | `index.js` línea 554: `VR_FOV` | `Math.PI / 2` (90°). Más alto = más amplio y más chico |
| Nombres de las imágenes | Ver "Cómo cambiar los nombres", abajo | Lista: "."; título y visor VR: nombres de archivo de WhatsApp |
| Título de la pestaña | `index.html` (`<title>`) | "Project Title" |

### Cómo cambiar los nombres de las imágenes (sin romper la web)

Cada imagen tiene dos datos distintos:

- **`data-id`** (en `index.html`) e **`"id"`** (en `data.js`): es el **código interno** que conecta cada botón de la lista con su imagen. **No se modifica nunca.** Si cambia, la web queda en negro: ya pasó una vez, cuando se cambió a `"."`.
- **El nombre visible**, que se cambia en dos lugares:
  1. **Lista de imágenes:** el texto dentro de `<li class="text">…</li>` en `index.html`.
  2. **Título superior y cartel dentro del visor VR:** el valor `"name"` de cada imagen en `data.js`.

Ejemplo correcto en `index.html`:

```html
<a href="javascript:void(0)" class="scene" data-id="0-whatsapp-image-2026-10-12-at-121339">   ← no tocar
  <li class="text">Campamento a orillas del río</li>                                         ← nombre visible
</a>
```

---

## 8. Publicación y actualizaciones

- Vercel está conectado al repositorio: **cada cambio que se sube a `main` se publica solo**, en segundos.
- **Reglas para que no vuelva a dar 404:**
  1. Subir los **archivos sueltos**, nunca un `.zip`.
  2. `index.html` tiene que quedar en la **raíz** del repositorio.
  3. En Vercel (*Settings → Build & Deployment*): **Framework Preset** "Other", **Root Directory** vacío y sin **Build Command**.
- Para agregar imágenes 360° nuevas: generarlas con la herramienta Marzipano (marzipano.net). Después hay que copiar sus carpetas a `tiles/` y sumar sus datos a `data.js` y a la lista de `index.html`.

---

## 9. Cómo verificar que funciona

### 9.1 Pruebas automáticas (en la computadora)

Requiere Node.js:

```bash
cd tecno-3 && node tests/idle.test.js && node tests/gyro.test.js
```

- **`idle.test.js` (19 pruebas, con reloj simulado):**
  - El cambio ocurre exactamente a los 8000 ms.
  - Cada evento reinicia la cuenta.
  - La interacción continua nunca deja avanzar.
  - Se pausa con la pestaña oculta y con el botón pausa.
  - La limpieza no deja temporizadores ni escuchas.
- **`gyro.test.js` (13 pruebas):**
  - Girar, mirar arriba/abajo, inclinar la cabeza.
  - Las dos posiciones horizontales.
  - Detección del lado hacia el que está girado el celular.

### 9.2 Prueba local

```bash
cd tecno-3 && python3 -m http.server 8360
```

Abrir `http://localhost:8360`. Para simular el giroscopio en Chrome: DevTools → ⋮ → *More tools* → *Sensors* → *Orientation*.

### 9.3 Prueba final en el celular con visor

1. Abrir https://tecno-3.vercel.app, tocar "Ver en VR" y permitir el sensor si lo pide.
2. Con el celular en el visor, horizontal: confirmar que se ve **una mitad para cada ojo** (izquierda/derecha).
3. Girar 360° sobre uno mismo: la imagen acompaña sin saltos.
4. Mirar arriba y abajo e inclinar la cabeza: el horizonte queda derecho.
5. Quedarse mirando: a los 8 s cambia la imagen, con su frente donde estás mirando.
6. Repetir con el celular girado para el otro lado.

### 9.4 Qué ya se verificó

- **En navegador** (con el giroscopio simulado y tamaños de celular vertical y horizontal):
  - La pantalla se parte izquierda/derecha.
  - La rotación forzada funciona hacia los dos lados y no se activa si el navegador ya está horizontal.
  - Seguimiento de cabeza, toque para avanzar, salida de VR y pase automático en VR.
  - Sin errores en consola.
- **Web publicada:** todos los archivos responden correctamente y la consola no muestra errores.
- **Pendiente:** la prueba en un celular real dentro del visor (sección 9.3).

---

## 10. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| La web muestra "404 NOT_FOUND" | Se subió un `.zip` o `index.html` no está en la raíz | Ver sección 8 |
| La web carga pero queda **en negro**, sin imagen | Se modificó un `data-id` en `index.html` o un `"id"` en `data.js` | Restaurar los códigos originales (sección 7, "Cómo cambiar los nombres") |
| La pantalla se parte pero la imagen no sigue la cabeza | Página sin `https://` | Usar https://tecno-3.vercel.app |
| Aviso "Sin permiso para el sensor de movimiento" (iPhone) | Se tocó "No permitir" | Cerrar la pestaña, abrir la página otra vez y tocar "Permitir" |
| Aviso "No se detecta el giroscopio" | Computadora o celular sin sensor | Probar en otro celular |
| La imagen se ve de costado antes de poner el celular en el visor | Es lo esperado: la vista VR ya está armada en horizontal | Girar el celular a horizontal |
| La imagen se corre lentamente hacia un costado | Desvío propio del sensor en algunos celulares | Salir y volver a entrar a VR, o esperar al próximo cambio de imagen (se recalibra) |
| La pantalla se apaga en el visor | El navegador no permite mantenerla encendida | Subir el tiempo de bloqueo en los ajustes del celular |

---

## 11. Limitaciones conocidas

- **Sin profundidad 3D:** las fotos 360° son de una sola cámara, así que los dos ojos ven la misma imagen. Es lo normal en tours fotográficos.
- **Sin corrección de lente:** los bordes pueden verse un poco curvados a través del visor.
- **Mirar exactamente hacia arriba o hacia abajo** puede producir un pequeño salto del giro (límite matemático en el cenit).
- **iPhone:** no hay pantalla completa real. Se mitiga con "Agregar a pantalla de inicio".
