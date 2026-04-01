let video;
let handHandler;
let gestureAnalyzer;
let bot;
let fx;
let platform;
let uiManager;
let attackManager;
let audioManager;

let imgBot;
let imgMahoraga;
let imgPlatform;

function preload() {
  imgBot = loadImage('assets/bot.png');
  imgMahoraga = loadImage('assets/bossMahoraga.png');
  imgPlatform = loadImage('assets/platform.png');
}

// Sistema de Domain Expansion (Vacío Infinito)
let domainActive = false;
let domainEndTime = 0;
let stars = [];
let lastTechniqueText = "";
let techniqueTextTimer = 0;
// --- Nuevas Definiciones y Estado Global ---
let adaptationManager;
let isMahoragaActive = false;
let invocationTimer = 0;

// Variables Riesgo Real (Player HP)
let playerHP = 100;
let gameState = 'START'; // 'START', 'PLAYING', 'DEFEAT'
let lastHitTime = 0; // Cooldown de invulnerabilidad jugador iFrames
let gameScore = 0;
let currentWave = 1;

/**
 * Estructura estática principal que representa el suelo donde se asienta la física del Bot.
 * @class Platform
 */
class Platform {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }
  
  draw() {
    push();
    if (imgPlatform) {
      // Usar la imagen como textura de plataforma
      imageMode(CORNER);
      // Elevamos un poco y le damos margen extra para que no floten
      image(imgPlatform, this.x - 20, this.y - 20, this.w + 40, this.h + 80);
    } else {
      // Diseño "pesado": Bloque con grosor tridimensional
      fill(40, 45, 60); // Cara frontal
      rect(this.x, this.y, this.w, this.h + 40, 8);
      fill(70, 75, 95); // Superficie
      rect(this.x, this.y, this.w, this.h, 8);
    }
    pop();
  }
}

/**
 * Motor Central P5 instanciado a 60fps.
 * @performance Este frame ha sido blindado desvinculando la cámara (`constraints` manuales) 
 * impidiendo que las dependencias asíncronas de la GPU recorten la interpolación a 30fps máximos.
 */
function setup() {
  createCanvas(1280, 720);
  pixelDensity(1); // 🔧 EL TRUCO DEL ARQUITECTO: Forzar densidad de píxeles para pantallas Retina/4K
  frameRate(60); // 🔧 Forzar al engine a no rendirse ante los Hz de la cámara
  
  // Floating Island
  platform = new Platform(width/2 - 300, height - 150, 600, 30);
  
  // 🔧 Reducir la resolución de captura REAL del hardware de la cámara
  let constraints = {
    video: {
      width: { ideal: 400 },
      height: { ideal: 300 },
      frameRate: { ideal: 60 } // Quitamos el max: 30 que asfixiaba el hardware
    }
  };
  
  video = createCapture(constraints, () => {
    console.log("Cámara inicializada.");
  });
  video.size(400, 300);
  video.hide();

  handHandler = new HandHandler(video);
  gestureAnalyzer = new GestureAnalyzer();
  bot = new Bot(platform.x + platform.w / 2 - 25, platform.y - 50);
  fx = new FXManager();
  uiManager = new UIManager();
  attackManager = new AttackManager();
  adaptationManager = new AdaptationManager();
  audioManager = new AudioManager();

  // Precargar estrellas para la Expansión de Dominio
  for (let i = 0; i < 150; i++) {
      stars.push({ x: random(-width, width), y: random(-height, height), z: random(width) });
  }
}

let audioEnabled = false;
let startTimer = 0;

function mousePressed() {
  if (!audioEnabled && audioManager) {
    audioManager.init();
    audioEnabled = true;
  }
}

function drawStartMenu(gesture) {
    background(20, 20, 25);
    
    push();
    // Título
    fill(255);
    textAlign(CENTER, TOP);
    textSize(60);
    textStyle(BOLD);
    text("GIHA SMASH", width/2, 60);
    
    // Contenedor de instrucciones
    fill(30, 30, 45, 200);
    stroke(100);
    strokeWeight(2);
    rectMode(CENTER);
    rect(width/2, height/2 - 20, 800, 400, 15);
    
    noStroke();
    fill(255, 200, 0);
    textSize(28);
    text("TÉCNICAS Y GESTOS", width/2, 120);
    
    textSize(22);
    textAlign(LEFT, CENTER);
    let startX = width/2 - 320;
    let startY = 180;
    let lh = 45;
    
    fill(255);
    text("Básico (Combo): Palma abierta sobre el enemigo", startX, startY);
    fill(0, 150, 255);
    text("Ao (Azul): Dedo índice y pulgar en pinza (Atracción)", startX, startY + lh);
    fill(255, 50, 50);
    text("Aka (Rojo): Palma abierta (Repulsión)", startX, startY + lh*2);
    fill(200, 0, 255);
    text("Púrpura: Signo de la paz (Daño Masivo), se activa tras usar Ao y Aka", startX, startY + lh*3);
    fill(255);
    text("Dominio: Gesto cruzado (Ralentiza el tiempo)", startX, startY + lh*4);
    fill(255, 100, 100);
    text("Invocar Mahoraga: Doble puño por 2s", startX, startY + lh*5);
    
    textAlign(CENTER, CENTER);
    
    // Requisito de Audio
    if (!audioEnabled) {
        fill(255, 100, 100);
        textSize(20);
        text("⚠️ HAZ CLICK EN LA PANTALLA UNA VEZ PARA ACTIVAR EL AUDIO ⚠️", width/2, startY + lh*6.5);
    } else {
        fill(100, 255, 100);
        textSize(20);
        text("✅ AUDIO ACTIVADO", width/2, startY + lh*6.5);
    }

    // Estado y Arranque
    if (!handHandler.isLoaded) {
        fill(255, 200, 0);
        textSize(28);
        text("CARGANDO MODELO IA...", width/2, height - 100);
    } else if (!handHandler.isTracking) {
        fill(255, 100, 100);
        textSize(28);
        text("BUSCANDO MANO EN LA CÁMARA...", width/2, height - 100);
    } else {
        fill(0, 255, 100);
        textSize(32);
        text("MANTÉN UN PUÑO (✊) CERRADO PARA EMPEZAR", width/2, height - 120);
        
        if (gesture === 'FIST') {
            if (startTimer === 0) startTimer = millis();
            let progress = map(millis() - startTimer, 0, 1000, 0, 400); // 1.0s para iniciar
            progress = constrain(progress, 0, 400);
            
            rectMode(CORNER);
            fill(255, 255, 255, 50);
            rect(width/2 - 200, height - 80, 400, 15, 8);
            fill(0, 255, 100);
            rect(width/2 - 200, height - 80, progress, 15, 8);
            
            if (millis() - startTimer > 1000) {
                gameState = 'PLAYING';
                if (audioManager && audioEnabled) audioManager.playNormalBGM();
                // Play a start sound effect if available
                if (audioManager && audioEnabled) audioManager.playWarning();
            }
        } else {
            startTimer = 0;
        }
    }
    pop();
}

function drawDomain() {
  push();
  fill(5, 5, 10, 80); // Rastro (Trails)
  rect(0, 0, width, height);

  translate(width / 2, height / 2);
  for (let s of stars) {
    s.z -= 15; // Velocidad del hiperespacio
    if (s.z < 1) {
      s.z = width;
      s.x = random(-width, width);
      s.y = random(-height, height);
    }
    let sx = map(s.x / s.z, 0, 1, 0, width);
    let sy = map(s.y / s.z, 0, 1, 0, height);
    let r = map(s.z, 0, width, 8, 0); // Más grande si está más cerca
    fill(255);
    noStroke();
    circle(sx, sy, r);
  }
  pop();
}

function updateGameState(attackBox) {
  if (gameState === 'DEFEAT') return;

  // IA y Jugador AABB vs Hand Hitbox Vulnerable
  let activeBot = getCurrentBot();
  if (activeBot && attackBox && handHandler.isTracking) {
      if (
          activeBot.x < attackBox.x + attackBox.w &&
          activeBot.x + activeBot.w > attackBox.x &&
          activeBot.y < attackBox.y + attackBox.h &&
          activeBot.y + activeBot.h > attackBox.y
      ) {
          // El Bot toca la MANO del jugador. 
          // Administramos iFrames (ej: daño 1 vez cada 500ms)
          if (millis() - lastHitTime > 500) {
              playerHP -= 20; 
              lastHitTime = millis();
              fx.triggerScreenshake(20, 20); // Juice: Shake al ser golpeado
              
              if (playerHP <= 0) {
                  gameState = 'DEFEAT';
              }
          }
      }
  }
}

function draw() {
  // 1. Extraer ML5 SIEMPRE para permitir reinicios por gestos
  let currentHand = null;
  let confidentHands = handHandler.predictions.filter(hand => hand && hand.confidence >= 0.8);
  if (confidentHands.length > 0) {
      currentHand = confidentHands[0];
  }
  let gesture = gestureAnalyzer.analyze(currentHand);
  
  let secondGesture = 'NONE';
  if (confidentHands.length >= 2) {
      secondGesture = gestureAnalyzer.analyze(confidentHands[1], true);
  }

  // --- START STATE ---
  if (gameState === 'START') {
      drawStartMenu(gesture);
      handHandler.update(width, height, gesture);
      handHandler.drawCursor(); // Draw cursor so they know they are being tracked
      return;
  }

  // --- GAME OVER STATE ---
  if (gameState === 'DEFEAT') {
      background(50, 0, 0);
      fill(255);
      textSize(80);
      textAlign(CENTER, CENTER);
      text("DEFEAT", width/2, height/2);
      textSize(30);
      text("Haz el signo de la Paz (✌️) para reiniciar.", width/2, height/2 + 60);
      
      // Permitir Restart
      if (gesture === 'PURPLE_ATTEMPT' || gesture === 'PURPLE') {
          // Soft Reset
          playerHP = 100;
          gameState = 'PLAYING';
          isMahoragaActive = false;
          domainActive = false;
          gameScore = 0;
          currentWave = 1;
          bot = new Bot(platform.x + platform.w / 2 - 25, platform.y - 50, 1);
          fx.triggerScreenshake(20, 20); // Juice de inicio
          if (audioManager) audioManager.playNormalBGM(); // <-- FIX: Reiniciar música al revivir
      }
      return; 
  }

  // --- PLAYING STATE ---
  if (domainActive && millis() > domainEndTime) {
      domainActive = false;
  }

  if (domainActive) {
      drawDomain(); // Shader ligero de estrellas para no perder FPS
  } else {
      background(20, 20, 25);
  }

  // Lógica de invocación (Doble puño cerrado simulado por ML5 + Timer)
  if (confidentHands.length >= 2 && gesture === 'FIST' && secondGesture === 'FIST' && !isMahoragaActive) {
      // Input buff para evitar reinicio por ruido de frames (Hold)
      if (invocationTimer === 0) invocationTimer = millis();
      
      if (millis() - invocationTimer > 2000) {
          // Trigger Invocación: Megumi pose
          isMahoragaActive = true;
          fx.triggerScreenshake(50, 40); // Max Shake
          bot = new MahoragaBot(width/2 - 40, 100, adaptationManager, 1 + (currentWave * 0.2)); // Reemplaza
          
          if (audioManager) audioManager.playMahoragaBGM();
      }
  } else if (confidentHands.length < 2 || gesture !== 'FIST') {
      invocationTimer = 0; // Cancelar si suelta
  }

  // Actualizar Estados Centrales (Física + Combate)
  let attackBox = handHandler.isTracking ? handHandler.getAttackBounds() : null;
  updateGameState(attackBox); 
  
  // 1. Inputs y Actualizaciones (Le pasamos el gesto para el bloqueo de navegación)
  handHandler.update(width, height, gesture);
  
  if (gesture !== 'NONE' && gesture !== 'FIST' && gesture !== 'COOLDOWN' && attackBox) {
      let didFire = false;

      // Centralized attack triggering (ignoring AABB target to allow global ritual hits)
      if (gesture === 'DOMAIN') {
          domainActive = true;
          domainEndTime = millis() + 5000;
          fx.triggerScreenshake(10, 30);
          didFire = true;
      }
      else if (gesture === 'BASIC_ATTACK') {
          didFire = attackManager.tryAttack('BASIC', attackBox.x + attackBox.w/2, attackBox.y + attackBox.h/2, getCurrentBot(), fx, uiManager, audioManager);
      }
      else if (gesture === 'BLUE' || gesture === 'RED' || gesture === 'PURPLE') {
          didFire = attackManager.tryAttack(gesture, attackBox.x + attackBox.w/2, attackBox.y + attackBox.h/2, getCurrentBot(), fx, uiManager, audioManager);
      }

      if (didFire) {
          lastTechniqueText = gesture;
          techniqueTextTimer = millis() + 1000;
      }
  }

  attackManager.update(uiManager, audioManager);
  // Ralentización del bot por Expansión de Dominio
  let currentDomainMod = domainActive ? 0.1 : 1.0;
  getCurrentBot().update(fx, platform, currentDomainMod, attackBox);

  // 3. Render
  push();
  fx.applyScreenshake(); // Juice: Shake global del lienzo
  
  // Dibujar zona de juego
  platform.draw();
  getCurrentBot().draw(platform);
  fx.updateAndDrawParticles();
  
  // Dibujar el input del boss siempre por encima de las entidades
  handHandler.drawCursor(); 
  
  pop(); // Fin área afectada por screenshake

  // UI - Feedback texto
  if (millis() < techniqueTextTimer) {
      push();
      textSize(80);
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      fill(255, 255, 255, map(techniqueTextTimer - millis(), 0, 1000, 0, 255));
      text(lastTechniqueText, width/2, height/2 - 100);
      pop();
  }

  // UI (No afectada por el shake)
  push();
  
  // UI Info / Debug (Bottom Left)
  translate(20, height - 60);
  fill(255, 255, 255, 150); // Texto semi-transparente
  textSize(14);
  textAlign(LEFT, BOTTOM);
  text(`FPS: ${floor(frameRate())}`, 0, 0);
  
  if (!handHandler.isLoaded) {
      fill(255, 200, 0, 200);
      text("⏳ Cargando modelo ML5...", 0, 20);
  } else if (!handHandler.isTracking) {
      fill(255, 100, 100, 200);
      text("❌ Buscando mano...", 0, 20);
  } else {
      fill(0, 255, 100, 200);
      text("✅ Objetivo detectado", 0, 20);
  }
  pop();

  push();
  if (getCurrentBot().hp <= 0) {
      // Bono de puntuación por baja
      gameScore += isMahoragaActive ? 5000 : 500;
      currentWave++;
      
      let waveMultiplier = 1 + (currentWave * 0.2);
      
      // Spawn de la siguiente Ola
      fx.spawnParticles(getCurrentBot().x + getCurrentBot().w/2, getCurrentBot().y + getCurrentBot().h/2, 100, 'PURPLE');
      
      if (currentWave % 5 === 0) {
          bot = new MahoragaBot(width/2 - 40, 100, adaptationManager, waveMultiplier);
          isMahoragaActive = true;
          fx.triggerScreenshake(50, 40); // Max Shake para Boss
          
          // Cambiar BGM
          if (audioManager) audioManager.playMahoragaBGM();
      } else {
          bot = new Bot(platform.x + platform.w / 2 - 25, platform.y - 150, waveMultiplier);
          
          // Si matamos a Mahoraga en la ola anterior, regresamos la música a la normalidad
          if (isMahoragaActive && audioManager) {
              audioManager.playNormalBGM();
          }
          isMahoragaActive = false;
          fx.triggerScreenshake(20, 10);
      }
      
      // Limpiar ataques pendientes para no instakillear al nuevo bot
      attackManager = new AttackManager();
  }
  pop();
  
  // HUD Diagnóstico (Consola del Arquitecto - Historial de Gestos)
  gestureAnalyzer.drawDebug(20, 60);
  uiManager.draw(attackManager);
  
  // HUD Player HP (Riesgo Real) y Timer de Invocación
  drawRiesgoReal();
}

function drawRiesgoReal() {
  push();
  // Panel superior izquierdo: HP del Jugador
  translate(20, 20);
  
  // Fondo de la barra de vida
  fill(0, 0, 0, 150);
  stroke(100);
  strokeWeight(2);
  rect(0, 0, 300, 30, 15);
  
  // Barra de vida (relleno)
  let hpWidth = map(max(0, playerHP), 0, 100, 0, 296);
  let hpColor = lerpColor(color(255, 50, 50), color(50, 255, 50), max(0, playerHP) / 100);
  noStroke();
  fill(hpColor);
  rect(2, 2, hpWidth, 26, 13);
  
  // Texto HP
  fill(255);
  textSize(18);
  textAlign(CENTER, CENTER);
  textStyle(BOLD);
  text(`❤️ HP: ${max(0, playerHP)}/100`, 150, 15);
  pop();

  push();
  // Panel superior derecho: Olas y Puntuación
  translate(width - 320, 20);
  fill(0, 0, 0, 150);
  stroke(100);
  strokeWeight(2);
  rect(0, 0, 300, 40, 20);

  noStroke();
  fill(255);
  textSize(20);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
  text(`🌊 OLA: ${currentWave}`, 20, 20);
  
  fill(255, 215, 0); // Oro
  textAlign(RIGHT, CENTER);
  text(`🏆 PUNTOS: ${gameScore}`, 280, 20);
  pop();

  // Barra de invocación (Centro)
  if (invocationTimer > 0 && !isMahoragaActive) {
      push();
      let progress = map(millis() - invocationTimer, 0, 2000, 0, 400);
      progress = constrain(progress, 0, 400);
      
      translate(width/2 - 200, 100);
      
      // Fondo
      fill(0, 0, 0, 200);
      stroke(255, 50, 50);
      strokeWeight(2);
      rect(0, 0, 400, 20, 10);
      
      // Relleno
      noStroke();
      fill(255, 50, 50);
      rect(2, 2, progress * 0.99, 16, 8);
      
      // Texto
      fill(255);
      textSize(18);
      textAlign(CENTER, BOTTOM);
      textStyle(BOLD);
      text("⚠️ RITUAL DE INVOCACIÓN ⚠️", 200, -5);
      pop();
  }
}

function getCurrentBot() {
  return bot; // Gracias al polimorfismo, `bot` puede ser `Bot` normal o `MahoragaBot`
}
