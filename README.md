# GihaSmash

GihaSmash is a web-based, gesture-controlled action game originally developed for a university project. It uses your webcam to detect hand gestures in real-time, allowing you to cast spells and fight off waves of enemies (and bosses!) using only your hands.

## Features
- **Real-time Hand Tracking**: Powered by ML5.js and TensorFlow.js.
- **Gesture-based Combat**: Trigger different attacks based on the shape of your hand.
- **Wave Progression**: Infinite enemy waves with increasing difficulty.
- **Boss Fights**: Face off against Mahoraga, who adapts to your attacks.
- **Zero Dependencies**: Pure Vanilla JavaScript (ES6+) and P5.js. No build steps required.
- **Dev Container Ready**: Fully Dockerized for instant development.

---

## How to Play

The game requires access to your webcam. Stand in a well-lit room and make sure your hand is visible to the camera.

### Controls (Gestures)
-  **Start Game**: Hold a closed fist for 1 second.
-  **Basic Attack (Combo)**: Open palm overlapping the enemy.
-  **Ao (Blue / Attraction)**: Point with your index finger.
-  **Aka (Red / Repulsion)**: Make a peace sign.
-  **Purple (Nuke)**: Show three fingers (index, pinky, thumb / Spider-man web gesture).
-  **Domain Expansion**: Cross your fingers (slows down time).
-  **Summon Mahoraga**: Hold double fists for 2 seconds.

---

## Running the Game

You can run GihaSmash in several ways, as it requires no complex build systems.

### Option 1: Node.js (Recommended)
```bash
npx serve boss-fight-ml5
```

### Option 2: Python
```bash
cd boss-fight-ml5
python -m http.server 8080
```

### Option 3: Docker / Dev Container
The project is fully Dockerized.
```bash
# Build the image
docker build -t gihasmash .

# Run the container
docker run -d -p 3000:3000 gihasmash
```
Then navigate to `http://localhost:3000` in your browser.
*Note: If you use VS Code, you can click "Reopen in Container" to automatically load the environment with all recommended extensions.*

---

## Technical Architecture & Codebase Guide

### Project Overview
- **Type**: Client-side SPA (Single Page Application) - vanilla JavaScript game
- **Tech Stack**: P5.js (rendering), ML5.js (hand tracking)
- **Entry Point**: `boss-fight-ml5/index.html` -> `boss-fight-ml5/scripts/sketch.js`
- **Performance Target**: 60 FPS with <30ms latency for ML5 inference

### File Organization
```
boss-fight-ml5/
├── index.html              # DOM structure + script loading order
└── scripts/
    ├── sketch.js           # P5 setup/draw, main game loop
    ├── bot.js              # Enemy AI + physics
    ├── MahoragaBot.js      # Subclass with adaptation mechanics
    ├── handHandler.js      # ML5 Handpose wrapper
    ├── gestureAnalyzer.js  # Euclidean distance heuristics
    ├── AttackManager.js    # Cooldown + input buffering
    ├── AdaptationManager.js # Diminishing returns system
    ├── UIManager.js        # HUD rendering
    └── visualEffects.js    # Particles, hitstop, screenshake
```

### Code Style Guidelines
- **Language**: Vanilla JavaScript (ES6+), no TypeScript.
- **Classes**: PascalCase (`class Bot`, `class AttackManager`).
- **Methods/Variables**: camelCase (`update()`, `isTracking`).
- **Constants**: camelCase or UPPER_SNAKE.
- **Module System**: None - scripts are loaded sequentially via `<script>` tags in `index.html`.
- **Comments**: JSDoc style for classes and public methods.

### P5.js & Physics Conventions
- Canvas size: 1280x720, pixel density: 1.
- Video capture: 400x300 max for ML5 performance.
- **Collision**: AABB (Axis-Aligned Bounding Box).
- **Input Smoothing**: Always use LERP for hand tracking to avoid jitter.
- **Juice/Game Feel**: Every impact includes hitstop, screenshake, and particle spawning via `FXManager`.

### Key Constants (Tuning Parameters)
| Parameter | File | Default | Description |
|-----------|------|---------|-------------|
| Hitstop duration | visualEffects.js | 60ms | Camera freeze on impact |
| Screenshake intensity | visualEffects.js | 20-50px | Shake magnitude |
| Particles per hit | visualEffects.js | 30-60 | Visual feedback count |
| Knockback force | bot.js | vx: ±25 | AABB repulsion on hit |
| Lerp smoothing | handHandler.js | 0.15 | Hand tracking smoothness |
| Confidence threshold | handHandler.js | 0.8 | ML5 prediction filter |
| Attack cooldowns | AttackManager.js | 200-10000ms | Skill recovery times |

### Architecture Notes
- **Single-threaded**: All logic runs in the main thread.
- **No dependency injection**: Classes reference each other directly.
- **Global state**: Variables like `bot`, `playerHP`, `domainActive` live in `sketch.js`.
- **Polymorphism**: The global `bot` variable can hold instances of `Bot` or `MahoragaBot`.
