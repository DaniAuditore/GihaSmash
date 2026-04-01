# GihaSmash (Boss Fight Architect V2.0)

> Juego Web asimétrico (Boss vs Bot) utilizando control gestual en tiempo real.
> Supera las deficiencias de WebGPU acoplando P5.js y ML5.js a WebGL puro de manera asíncrona para anclar las inferencias físicas por debajo de los 30ms.

## 🛠 Requisitos Previos

- Cualquier Navegador moderno con soporte para **WebGL** (y aceleración de hardware habilitada).
- Una Webcam estándar.
- **Node.js** o Python instalados en tu computadora (solo para eludir la restricción CORS de _localhost_ requerida para utilizar captura de video).

## 🚀 Instalación y Uso Rápido

**Copia y pega en la terminal dentro del directorio del juego:**

Si utilizas Node.js (Recomendado):

```bash
npx serve
```

Si utilizas Python:

```bash
python3 -m http.server 8080
```

**Pasos para el uso:**

1. Al levantar el servidor, navega a `http://localhost:3000` (o el puerto emitido por consola).
2. Otorga al navegador el **permiso de cámara** para que inicialice Handpose.
3. El juego mantendrá 60 FPS ininterrumpidos y liberará el procesador cuando el modelo esté listo. No sobrecargues la pestaña, deja que corra fluidamente.

## 🗂 Estructura del Proyecto

```text
/boss-fight-ml5
├── /scripts
│   ├── sketch.js        # Punto de anclaje (Setup de hardware/P5 loop estricto).
│   ├── handHandler.js   # Wrapper ML5. Fuerza WebGL y estabiliza puntos críticos.
│   ├── gestureAnalyzer.js # Heurísticas matemáticas de distancias euclidianas.
│   ├── bot.js           # Máquina de estados (AABB e inertias) desacoplada de la UI.
│   ├── AttackManager.js # Gestión de tolerancia/buffers para entradas (cooldowns).
│   ├── visualEffects.js # Partículas orgánicas (Juice) independientes del main lock.
│   └── UIManager.js     # Componentes HUD con re-rendering simplificado.
└── index.html           # Estructura del DOM.
```

## ⚙️ Ajuste de "Juice" (Sensación de Impacto)

Manejo de variables paramétricas en el sistema. Puedes alterarlas en los scripts sin romper las dependencias físicas:

- **Hitstop (`visualEffects.js`):** Por defecto `60ms`. Extensión del retraso de cámara al impactar ataques críticos.
- **Screenshake (`visualEffects.js`):** La fuerza en px para la traducción global del canvas. Por defecto salta a `30px` en _Expansión de Dominio_.
- **Partículas:** Cada núcleo mágico arroja +60 entidades.
- **Knockback (`bot.js`):** Repulsión AABB `vx = +-25` dependiendo la masa virtual calculada.
