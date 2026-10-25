# Tour 360° — Modo realidad virtual (Cardboard) y pase automático

Este documento explica qué hace el tour, cómo usarlo con un visor Cardboard y cómo está construido por dentro.

---

## 1. Qué hace, en una frase

Abrís la página en el celular, tocás **"Ver en VR"**, ponés el celular en el visor y mirás alrededor moviendo la cabeza. **Cada 8 segundos la imagen pasa sola a la siguiente.** No hace falta tocar la pantalla para nada.

---

## 2. Cómo usarlo (paso a paso)

1. Abrí la página del tour en el celular. **Tiene que ser una dirección `https://`** (ver sección 4).
2. Tocá el botón **"Ver en VR"** (abajo, al centro).
3. Solo en iPhone: aparece un cartel pidiendo acceso a **"Movimiento y orientación"**. Tocá **Permitir**.
4. Girá el celular a **horizontal** y colocalo en el visor.
5. Mirá alrededor: arriba, abajo, a los costados y para atrás. La imagen sigue tu cabeza.
6. Cada 8 segundos pasa a la imagen siguiente, y después de la última vuelve a la primera.
7. Para salir, sacá el celular del visor y tocá **"Salir de VR"** (arriba, al centro). En Android también podés usar el gesto de "atrás".

### Qué ves dentro del visor

| Elemento | Para qué sirve |
|---|---|
| Pantalla partida en dos mitades | Una mitad para cada ojo (cada lente del visor) |
| Barrita blanca bajo el centro | Cuenta regresiva: se llena en 8 s y ahí cambia la imagen |
| Nombre de la imagen | Aparece unos segundos cada vez que cambia la imagen |

### Atajos

- **Tocar la pantalla** (o el botón del costado del Cardboard, que toca la pantalla) **pasa a la imagen siguiente** en el momento.
- Cada imagen nueva se acomoda para que **su frente quede donde estás mirando**. No hace falta girarse para buscar el punto de inicio.

---

## 3. Fuera del modo VR (computadora o celular sin visor)

- Se navega arrastrando con el dedo o el mouse.
- Si nadie toca nada durante 8 segundos, la imagen pasa sola. **Cualquier interacción** (click, toque, arrastre, rueda del mouse, scroll de la lista, pasar el mouse) **reinicia la cuenta desde cero**.
- La barrita bajo el título muestra esa cuenta regresiva.
- El botón **pausa** (arriba a la derecha) frena el giro automático y también el pase de imágenes. El botón **play** reactiva los dos.
- Si cambiás de pestaña, el pase se pausa. Al volver, la cuenta arranca otra vez desde 8 s.

---

## 4. Requisitos del celular

| Requisito | Por qué |
|---|---|
| **Página con `https://`** | Los celulares solo dan acceso al giroscopio en páginas seguras. Con `http://` la pantalla se parte igual, pero la imagen no sigue la cabeza (aparece un aviso). |
| **Giroscopio** | Lo tiene prácticamente cualquier celular. Si no se detecta, aparece un aviso. |
| **iPhone: tocar "Permitir"** | iOS pregunta una vez por el sensor de movimiento. Si se tocó "No permitir", hay que cerrar la pestaña de Safari y volver a abrir la página. |
| **Navegador** | Android: Chrome. iPhone: Safari. |

### Cómo poner la página en `https://`

**Opción A: publicarla (recomendada para usar en el instituto).**
La versión publicada está en **https://tecno-3.vercel.app** (Vercel publica la raíz del repositorio `tecno-3`). Para publicarla en otro lado, subí los archivos de la raíz a cualquier hosting estático con https, por ejemplo:

- **Netlify Drop** (`app.netlify.com/drop`): arrastrás la carpeta del sitio y te da un link `https://…`.
- **GitHub Pages**.

**Opción B: prueba rápida desde tu Mac, sin publicar nada.**
Levantá el servidor local y abrí un túnel https temporal:

```bash
cd tecno-3 && python3 -m http.server 8360
```

En otra terminal (requiere `brew install cloudflared` la primera vez):

```bash
cloudflared tunnel --url http://localhost:8360
```

Te muestra una dirección `https://…trycloudflare.com`. Abrila en el celular. El link deja de funcionar al cerrar la terminal.

### Consejos para que se vea mejor

- **Android:** al entrar a VR, la página pasa a pantalla completa y se traba en horizontal sola.
- **iPhone:** Safari no permite pantalla completa en iPhone. Para sacar las barras del navegador, en Safari tocá *Compartir → Agregar a pantalla de inicio* y abrí el tour desde ese ícono.
- La pantalla **no se apaga** mientras estás en VR (en navegadores que lo soportan).
- Subí el brillo del celular al máximo para el visor.

---

## 5. Cómo está construido

El tour es una exportación de **Marzipano** (visor 360° de Google). No usa frameworks: son archivos HTML, CSS y JavaScript dentro de `app-files/`. En el repositorio, esos archivos están directamente en la raíz para que Vercel los publique.

```
(raíz del repositorio = la web publicada)
├── index.html   → botón "Ver en VR", capa de VR (dos ojos, salir, avisos), barras de cuenta regresiva
├── style.css    → estilos de la barra de cuenta regresiva y del modo VR
├── index.js     → lógica: pase automático, giroscopio, pantalla partida
├── data.js      → lista de imágenes (sin cambios)
└── vendor/      → librerías Marzipano y screenfull (sin cambios)
├── img/, tiles/ → íconos e imágenes 360°
tests/
├── idle.test.js → pruebas del temporizador de 8 s
└── gyro.test.js → pruebas de la matemática del giroscopio
```

### 5.1 Pase automático por inactividad (`index.js`, `createIdleAutoplay`, línea ~300)

- Hay **un único temporizador** de 8000 ms (`IDLE_AUTOPLAY_DELAY`, línea 40). Cuando se cumple, pasa a la imagen siguiente y se vuelve a armar solo (`setTimeout` recursivo).
- Cada interacción (`click`, `mouseenter`, `mouseleave`, `touchstart`, `touchend`, `scroll`, más `pointerdown`, `pointermove`, `wheel` y `keydown` para cubrir arrastre y zoom) **cancela el temporizador y lo arranca de nuevo desde cero**.
- Los eventos se escuchan en *fase de captura* sobre toda la página. Así también se detectan los que no "suben" por la página (`scroll`, `mouseenter`) y los que el visor bloquea internamente.
- **Mover la cabeza no cuenta como interacción**: el giroscopio no genera ninguno de esos eventos. Por eso en VR las imágenes pasan cada 8 s mientras mirás alrededor.
- Se pausa con la pestaña oculta y se limpia por completo (temporizadores y escuchas) al cerrar la página.

### 5.2 Seguimiento de la cabeza (`orientationToView`, línea ~604)

1. El celular informa su orientación con tres ángulos (`alpha`, `beta`, `gamma`) mediante el evento `deviceorientation`.
2. Con esos ángulos se arma una matriz de rotación y se compensa si el celular está en horizontal (`screen.orientation.angle`).
3. De la matriz se calculan los tres ángulos que usa el visor:
   - **yaw**: hacia dónde mirás (izquierda/derecha).
   - **pitch**: arriba/abajo.
   - **roll**: inclinación de la cabeza, para que el horizonte quede derecho aunque inclines la cabeza.
4. Una vez por cuadro de pantalla (`renderVrFrame`, línea ~656) se aplica la última lectura a la vista.
5. **Calibración:** al entrar a VR y en cada cambio de imagen, se guarda un desfase para que el frente de la imagen quede donde estás mirando.

### 5.3 Pantalla partida (`setStereo`, línea ~682)

- Cada imagen se dibuja **dos veces**: una capa en la mitad izquierda y otra en la derecha.
- Las dos capas comparten la misma "cámara", así que se mueven exactamente juntas.
- El visor ajusta la proporción de cada mitad, así que la imagen no se ve aplastada.
- Al salir de VR, la segunda capa se destruye para liberar memoria.

### 5.4 Entrar y salir de VR (`enterVr` línea ~780, `exitVr` línea ~824)

**Al entrar:**
- Pide permiso del sensor (iPhone) y pantalla completa. Las dos cosas tienen que pasar en el mismo toque: el navegador no las permite fuera de un toque del usuario.
- Traba la pantalla en horizontal (Android) y evita que se apague.
- Oculta los botones, desactiva el arrastre y el giro automático, y activa el pase automático.

**Al salir:** deshace todo lo anterior y vuelve a la vista normal.

### 5.5 Ajustes que podés cambiar

| Qué | Dónde | Valor actual |
|---|---|---|
| Segundos entre imágenes | `IDLE_AUTOPLAY_DELAY` (línea 40 de `index.js`) | `8000` (8 s) |
| Campo visual en el visor | `VR_FOV` (línea 554) | `Math.PI / 2` (90°). Más alto = se ve más amplio y más chico |
| Nombres de las imágenes | `data.js` (`"name"`) e `index.html` (lista de escenas) | Nombres de archivo de WhatsApp: conviene cambiarlos |

---

## 6. Cómo verificar que todo funciona

### En la computadora

```bash
cd tecno-3 && python3 -m http.server 8360
```

Abrí `http://localhost:8360` y probá:

1. **Sin tocar nada:** la barra bajo el título se llena y a los 8 s cambia la imagen.
2. **Un click a los 5 s:** la cuenta vuelve a 0, así que la imagen tarda 8 s más.
3. **"Ver en VR":** la pantalla se parte en dos. En la computadora aparece el aviso de que no hay giroscopio (es lo esperado).
4. **Tocar la pantalla en VR:** pasa a la siguiente imagen.
5. **"Salir de VR":** vuelve la vista normal.

Para simular el giroscopio en Chrome: DevTools → menú ⋮ → *More tools* → *Sensors* → *Orientation*.

### Pruebas automáticas

```bash
cd tecno-3 && node tests/idle.test.js && node tests/gyro.test.js
```

- `idle.test.js`: 19 pruebas con reloj simulado (cambio a los 8000 ms exactos, reinicio con cada evento, pausa, pestaña oculta, limpieza).
- `gyro.test.js`: 9 pruebas de posiciones de cabeza (girar, mirar arriba/abajo, inclinar, ambas posiciones horizontales).

### En el celular con el visor (prueba final)

1. Abrí el link `https://`, tocá "Ver en VR" y permití el sensor si lo pide.
2. Poné el celular en el visor y girá 360° sobre vos mismo: la imagen tiene que acompañar sin saltos.
3. Mirá arriba y abajo, e inclina la cabeza: el horizonte tiene que quedar derecho.
4. Quedate mirando: a los 8 s cambia la imagen y su frente aparece donde estás mirando.

---

## 7. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| La pantalla se parte pero la imagen no sigue la cabeza | La página se abrió con `http://` | Usar el link `https://` (sección 4) |
| Aviso "Sin permiso para el sensor de movimiento" (iPhone) | Se tocó "No permitir" | Cerrar la pestaña, abrir la página otra vez y tocar "Permitir" |
| Aviso "No se detecta el giroscopio" | Computadora, o celular sin sensor | Probar en otro celular |
| Cartel "Girá el celular a horizontal" | El celular está vertical | Ponerlo horizontal |
| La imagen se va corriendo lentamente hacia un costado | Desvío propio del sensor en algunos celulares | Salir y volver a entrar a VR, o esperar al próximo cambio de imagen (se recalibra) |
| La pantalla se apaga en el visor | El navegador no soporta mantenerla encendida | Subir el tiempo de bloqueo de pantalla en los ajustes del celular |

---

## 8. Limitaciones conocidas

- **Sin profundidad 3D:** las fotos 360° son de una sola cámara, así que los dos ojos ven la misma imagen. Es lo normal en tours 360° fotográficos.
- **Sin corrección de lente:** la imagen no se pre-deforma para el lente del visor. Los bordes pueden verse un poco curvados. No afecta el uso.
- **Mirar exactamente hacia arriba o hacia abajo** puede dar un pequeño salto del giro (límite matemático en el cenit).
- **iPhone:** no hay pantalla completa real. Se mitiga con "Agregar a pantalla de inicio".
