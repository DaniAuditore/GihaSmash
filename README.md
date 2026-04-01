# GihaSmash: Módulo Boss Fight ML5

GihaSmash es un juego de acción 2D "Jefe vs Jugador" que se juega directamente en el navegador. Emplea la cámara web y ML5.js para rastrear los movimientos de tus manos en tiempo real, permitiéndote invocar magias y repeler a los enemigos a través de gestos sin usar ratón ni teclado.

## Requisitos Previos

- **Cámara Web**: Requerida obligatoriamente para el modelo ML5 Handpose.
- **Navegador Moderno**: Con soporte WebGL y WebRTC.
- **Entorno Local**: Node.js (v18+) o Docker para ejecutar el servidor estático.

## Instalación

Puedes iniciar el proyecto copiando y pegando estos comandos en tu terminal.

**Opción A: Docker (Recomendado)**

```bash
docker build -t gihasmash .
docker run -d -p 3000:3000 gihasmash
```

Abre `http://localhost:3000` en tu navegador.

**Opción B: Servidor Estático Local (Node)**

```bash
npm install -g serve
npx serve boss-fight-ml5 -l 3000
```

Abre `http://localhost:3000` en tu navegador.

## Ejemplo de Uso Rápido (Controles)

Ponte frente a la cámara, asegúrate de que tu mano esté visible y utiliza estos gestos:

- ✊ **Puño cerrado (Mantener 1s)**: Iniciar el juego.
- 🖐️ **Palma abierta**: Ataque básico (Apunta sobre el enemigo).
- ☝️ **Dedo índice (Ao/Azul)**: Atracción (Atrae al enemigo hacia ti).
- ✌️ **Signo de Paz (Aka/Rojo)**: Repulsión (Empuja al enemigo lejos).
- 🤟 **Tres dedos (Púrpura)**: Daño masivo y knockback severo.
- 🤞 **Dedos cruzados (Expansión de Dominio)**: Ralentiza el tiempo de los enemigos por 5 segundos.
- ✊✊ **Doble puño cerrado (Mantener 2s)**: Ritual de invocación. Llama a Mahoraga (Boss).

## Estructura del Proyecto

```text
boss-fight-ml5/scripts/
├── sketch.js            # Loop principal de P5.js, estado global, renderizado maestro e integración de assets.
├── bot.js               # Entidad enemiga base, físicas de gravedad, fricción y colisiones AABB.
├── MahoragaBot.js       # Subclase del jefe con IA agresiva, dashes, saltos dobles y UI propia.
├── handHandler.js       # Wrapper de ML5 Handpose, suavizado LERP y definición del hitbox del cursor.
├── gestureAnalyzer.js   # Cálculo de distancias euclidianas para clasificación e inferencia temporal de gestos.
├── AttackManager.js     # Gestión de cooldowns, lógica de combos e input buffering (200ms window).
├── AdaptationManager.js # Sistema de inmunidad progresiva matemática para los ataques recibidos por el jefe.
├── UIManager.js         # Renderizado de HUD (Barras de HP lerpeadas, cooldowns radiales, tooltips).
├── visualEffects.js     # Sistema autónomo de partículas, hitstop (congelación de frames) y screenshake.
└── AudioManager.js      # Sintetizador procedural Web Audio API y controlador del IFrame de YouTube (BGM).
```

## Limitaciones Tecnológicas

- **Frontend-only**: Toda la lógica, la memoria de variables y el estado residen estrictamente en el cliente. No hay validación de servidor.
- **Latencia de ML5**: La inferencia neuronal introduce una latencia ineludible (usualmente 15-30ms) que depende directamente del procesamiento de la GPU del usuario.
- **Limitación de FPS**: Bloqueado a 60 FPS. El engine P5.js es _single-threaded_, los cálculos de físicas, renderizado y UI compiten por el mismo hilo en `sketch.js`.
- **Cero Frameworks**: El proyecto está construido para no requerir _bundlers_ (Webpack, Vite). La carga de scripts (`<script>`) ocurre secuencialmente de forma directa desde el HTML.
