"use strict";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { alpha: true });

const fpsCounterEl = document.getElementById("fps-counter");
const circlesCountEl = document.getElementById("circles-count");
const speedLevelEl = document.getElementById("speed-level");
const collisionCountEl = document.getElementById("collision-count");
const btnPause = document.getElementById("btn-pause");
const btnReset = document.getElementById("btn-reset");

const MAX_OBJECTS = 25;
const FRAME_DURATION = 1000 / 60;
const HITBOX_PADDING = 7;

let viewWidth = window.innerWidth;
let viewHeight = window.innerHeight;
let pixelRatio = 1;
let objects = [];
let destroyedCount = 0;
let isPaused = false;
let animationId = null;
let lastFrameTime = 0;
let fpsSampleStart = 0;
let framesInSample = 0;
let speedMultiplier = 1;
let speedTier = "initial";

/** Ajusta la resolución interna del canvas para pantallas normales y Retina. */
function resizeCanvas() {
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(viewWidth * pixelRatio);
    canvas.height = Math.round(viewHeight * pixelRatio);
    canvas.style.width = `${viewWidth}px`;
    canvas.style.height = `${viewHeight}px`;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    // Evita que los objetos queden fuera de la pantalla al cambiar el tamaño.
    objects.forEach((object) => {
        object.x = Math.min(Math.max(object.x, object.radius), viewWidth - object.radius);
        if (object.y + object.radius > viewHeight) {
            object.y = viewHeight - object.radius;
            object.vy = -Math.abs(object.vy) * object.bounce;
        }
    });
}

/** Devuelve las reglas de velocidad según el total de objetos impactados. */
function getSpeedProfile(score) {
    if (score > 20) {
        return { tier: "high", label: "Alta 🚀", multiplier: 1.85 };
    }
    if (score > 10) {
        return { tier: "medium", label: "Media ⚡", multiplier: 1.4 };
    }
    return { tier: "initial", label: "Inicial", multiplier: 1 };
}

/** Actualiza el indicador visual y el multiplicador global de velocidad. */
function updateSpeedLevel() {
    const profile = getSpeedProfile(destroyedCount);
    speedTier = profile.tier;
    speedMultiplier = profile.multiplier;

    if (speedLevelEl) {
        speedLevelEl.textContent = profile.label;
        speedLevelEl.classList.remove("speed-initial", "speed-medium", "speed-high");
        speedLevelEl.classList.add(`speed-${profile.tier}`);
    }
}

class GameObject {
    constructor() {
        this.reset();
    }

    /**
     * Reutiliza el objeto en vez de eliminarlo del arreglo.
     * Así siempre existen exactamente MAX_OBJECTS objetos activos.
     */
    reset() {
        this.radius = Math.random() * 9 + 15;
        this.x = this.radius + Math.random() * Math.max(1, viewWidth - this.radius * 2);

        // Se origina apenas por encima del borde, para entrar por la parte superior.
        this.y = -this.radius - Math.random() * 55;
        this.vx = (Math.random() - 0.5) * 2.2;
        this.vy = Math.random() * 1.2 + 0.7;
        this.gravity = Math.random() * 0.1 + 0.17;
        this.bounce = 0.61 + Math.random() * 0.05;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.055;
        this.color = `hsl(${Math.floor(Math.random() * 360)}, 88%, 67%)`;
        this.trail = [];
    }

    /** Actualiza la posición, la gravedad, la fricción horizontal y los rebotes. */
    update(deltaFrames) {
        const step = deltaFrames * speedMultiplier;

        this.vy += this.gravity * step;
        this.x += this.vx * step;
        this.y += this.vy * step;
        this.vx *= Math.pow(0.998, step);
        this.rotation += this.rotationSpeed * step;

        // Rebote lateral para mantener los objetos dentro del marco.
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx = Math.abs(this.vx);
        } else if (this.x + this.radius > viewWidth) {
            this.x = viewWidth - this.radius;
            this.vx = -Math.abs(this.vx);
        }

        // El suelo invierte la velocidad vertical y pierde energía en cada rebote.
        const groundLevel = viewHeight - this.radius;
        if (this.y >= groundLevel) {
            this.y = groundLevel;
            this.vy = -Math.abs(this.vy) * this.bounce;
            this.vx *= 0.88;

            // Cuando ya casi no rebota, se reinicia desde el margen superior.
            if (Math.abs(this.vy) < 0.9) {
                this.reset();
                return;
            }
        }

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 7) this.trail.shift();
    }

    /** Dibuja una gema/cristal luminoso con facetas; no utiliza círculos. */
    draw() {
        ctx.save();

        // Estela breve que refuerza la sensación de movimiento.
        if (this.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i += 1) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.28;
            ctx.lineCap = "round";
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 17;

        // Silueta angular de cristal.
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius * 0.72, -this.radius * 0.3);
        ctx.lineTo(this.radius * 0.86, this.radius * 0.48);
        ctx.lineTo(0, this.radius);
        ctx.lineTo(-this.radius * 0.86, this.radius * 0.48);
        ctx.lineTo(-this.radius * 0.72, -this.radius * 0.3);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.stroke();

        // Facetas internas para dar profundidad y apariencia tridimensional.
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(0, this.radius);
        ctx.lineTo(this.radius * 0.72, -this.radius * 0.3);
        ctx.closePath();
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(-this.radius * 0.72, -this.radius * 0.3);
        ctx.lineTo(0, this.radius);
        ctx.closePath();
        ctx.fillStyle = "rgba(15, 23, 42, 0.17)";
        ctx.fill();

        ctx.restore();
    }

    /** Detecta si el clic cae dentro de la zona interactiva del objeto. */
    containsPoint(mouseX, mouseY) {
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const hitRadius = this.radius + HITBOX_PADDING;
        return dx * dx + dy * dy <= hitRadius * hitRadius;
    }
}

/** Crea exactamente 25 objetos, tanto al iniciar como al reiniciar. */
function initObjects() {
    objects = Array.from({ length: MAX_OBJECTS }, () => new GameObject());
    if (circlesCountEl) circlesCountEl.textContent = String(objects.length);
}

/** Actualiza la puntuación cuando el usuario impacta un objeto con clic izquierdo. */
function handleCanvasClick(event) {
    if (event.button !== 0) return; // Solo clic izquierdo.

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Se recorre al revés para priorizar el objeto dibujado más recientemente.
    for (let i = objects.length - 1; i >= 0; i -= 1) {
        const object = objects[i];
        if (object.containsPoint(mouseX, mouseY)) {
            destroyedCount += 1;
            if (collisionCountEl) collisionCountEl.textContent = String(destroyedCount);

            // El objeto impactado vuelve arriba; el arreglo sigue conteniendo 25.
            object.reset();
            updateSpeedLevel();
            if (circlesCountEl) circlesCountEl.textContent = String(objects.length);
            return; // Un clic registra como máximo un impacto.
        }
    }
}

/** Bucle principal de animación. deltaFrames mantiene la física estable entre FPS. */
function animate(timestamp) {
    if (isPaused) return;

    const deltaFrames = lastFrameTime === 0
        ? 1
        : Math.min((timestamp - lastFrameTime) / FRAME_DURATION, 2.5);
    lastFrameTime = timestamp;

    ctx.clearRect(0, 0, viewWidth, viewHeight);
    for (const object of objects) {
        object.update(deltaFrames);
        object.draw();
    }

    framesInSample += 1;
    if (fpsSampleStart === 0) fpsSampleStart = timestamp;
    const elapsed = timestamp - fpsSampleStart;
    if (elapsed >= 1000) {
        if (fpsCounterEl) {
            fpsCounterEl.textContent = String(Math.round((framesInSample * 1000) / elapsed));
        }
        framesInSample = 0;
        fpsSampleStart = timestamp;
    }

    animationId = requestAnimationFrame(animate);
}

btnPause.addEventListener("click", () => {
    isPaused = !isPaused;
    btnPause.textContent = isPaused ? "▶ Reanudar" : "⏸ Pausar";

    if (isPaused) {
        if (animationId !== null) cancelAnimationFrame(animationId);
        animationId = null;
    } else {
        lastFrameTime = 0;
        fpsSampleStart = 0;
        framesInSample = 0;
        animationId = requestAnimationFrame(animate);
    }
});

btnReset.addEventListener("click", () => {
    destroyedCount = 0;
    if (collisionCountEl) collisionCountEl.textContent = "0";
    updateSpeedLevel();
    initObjects();

    // Si la simulación está activa, la siguiente animación dibuja los objetos nuevos.
    ctx.clearRect(0, 0, viewWidth, viewHeight);
});

canvas.addEventListener("click", handleCanvasClick);
window.addEventListener("resize", resizeCanvas);

// Estado inicial de la aplicación.
resizeCanvas();
updateSpeedLevel();
initObjects();
animationId = requestAnimationFrame(animate);
