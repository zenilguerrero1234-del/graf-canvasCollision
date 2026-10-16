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

let impactEffects = [];


/* Ajusta el canvas al tamaño de la ventana. */
function resizeCanvas() {
    viewWidth = window.innerWidth;
    viewHeight = window.innerHeight;

    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(viewWidth * pixelRatio);
    canvas.height = Math.round(viewHeight * pixelRatio);

    canvas.style.width = `${viewWidth}px`;
    canvas.style.height = `${viewHeight}px`;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    // Evita que los objetos queden fuera de la pantalla al redimensionar.
    objects.forEach((object) => {
        object.x = Math.min(
            Math.max(object.x, object.radius),
            Math.max(object.radius, viewWidth - object.radius)
        );

        if (object.y + object.radius > viewHeight) {
            object.y = viewHeight - object.radius;
            object.vy = -Math.abs(object.vy) * object.bounce;
        }
    });
}


/* Determina la velocidad según los impactos registrados. */
function getSpeedProfile(score) {
    if (score > 20) {
        return {
            tier: "high",
            label: "Alta 🚀",
            multiplier: 1.85
        };
    }

    if (score > 10) {
        return {
            tier: "medium",
            label: "Media ⚡",
            multiplier: 1.4
        };
    }

    return {
        tier: "initial",
        label: "Inicial",
        multiplier: 1
    };
}


/* Actualiza el nivel de velocidad en el panel. */
function updateSpeedLevel() {
    const profile = getSpeedProfile(destroyedCount);

    speedTier = profile.tier;
    speedMultiplier = profile.multiplier;

    if (speedLevelEl) {
        speedLevelEl.textContent = profile.label;

        speedLevelEl.classList.remove(
            "speed-initial",
            "speed-medium",
            "speed-high"
        );

        speedLevelEl.classList.add(`speed-${profile.tier}`);
    }
}


/* Clase de los objetos que caen en el canvas. */
class GameObject {
    constructor() {
        this.reset();
    }

    /*
     * Reinicia el objeto sin eliminarlo del arreglo.
     * Así se mantienen siempre exactamente 25 objetos.
     */
    reset() {
        this.radius = Math.random() * 9 + 15;

        this.x =
            this.radius +
            Math.random() * Math.max(1, viewWidth - this.radius * 2);

        // El objeto comienza ligeramente por encima del canvas.
        this.y = -this.radius - Math.random() * 55;

        // Velocidades iniciales aleatorias.
        this.vx = (Math.random() - 0.5) * 2.2;
        this.vy = Math.random() * 1.2 + 0.7;

        // Gravedad y pérdida de energía al rebotar.
        this.gravity = Math.random() * 0.1 + 0.17;
        this.bounce = 0.61 + Math.random() * 0.05;

        // Rotación aleatoria.
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.055;

        // Color diferente para cada cristal.
        this.color = `hsl(${Math.floor(Math.random() * 360)}, 88%, 67%)`;

        // Historial para dibujar la estela.
        this.trail = [];
    }


    /* Actualiza la posición, la gravedad y los rebotes. */
    update(deltaFrames) {
        const step = deltaFrames * speedMultiplier;

        // Aplicar gravedad.
        this.vy += this.gravity * step;

        // Actualizar posición.
        this.x += this.vx * step;
        this.y += this.vy * step;

        // Fricción horizontal.
        this.vx *= Math.pow(0.998, step);

        // Rotación.
        this.rotation += this.rotationSpeed * step;

        // Rebotes en los límites laterales.
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx = Math.abs(this.vx);

        } else if (this.x + this.radius > viewWidth) {
            this.x = viewWidth - this.radius;
            this.vx = -Math.abs(this.vx);
        }

        // Límite inferior del canvas.
        const groundLevel = viewHeight - this.radius;

        if (this.y >= groundLevel) {
            this.y = groundLevel;

            // Rebote con pérdida de energía.
            this.vy = -Math.abs(this.vy) * this.bounce;

            // Disminuir el movimiento horizontal.
            this.vx *= 0.88;

            // Cuando deja de rebotar, reaparece arriba.
            if (Math.abs(this.vy) < 0.9) {
                this.reset();
                return;
            }
        }

        // Guardar posiciones anteriores para la estela.
        this.trail.push({
            x: this.x,
            y: this.y
        });

        if (this.trail.length > 7) {
            this.trail.shift();
        }
    }


    /* Dibuja el cristal con forma geométrica y brillo. */
    draw() {
        ctx.save();

        // Estela luminosa.
        if (this.trail.length > 1) {
            ctx.beginPath();

            ctx.moveTo(
                this.trail[0].x,
                this.trail[0].y
            );

            for (let i = 1; i < this.trail.length; i += 1) {
                ctx.lineTo(
                    this.trail[i].x,
                    this.trail[i].y
                );
            }

            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.28;
            ctx.lineCap = "round";

            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;

            ctx.stroke();
        }

        // Preparar la posición y la rotación del cristal.
        ctx.globalAlpha = 1;

        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.shadowColor = this.color;
        ctx.shadowBlur = 17;

        // Silueta exterior del cristal.
        ctx.beginPath();

        ctx.moveTo(0, -this.radius);

        ctx.lineTo(
            this.radius * 0.72,
            -this.radius * 0.3
        );

        ctx.lineTo(
            this.radius * 0.86,
            this.radius * 0.48
        );

        ctx.lineTo(0, this.radius);

        ctx.lineTo(
            -this.radius * 0.86,
            this.radius * 0.48
        );

        ctx.lineTo(
            -this.radius * 0.72,
            -this.radius * 0.3
        );

        ctx.closePath();

        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.lineWidth = 1.1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.stroke();

        // Primera faceta interna.
        ctx.beginPath();

        ctx.moveTo(0, -this.radius);
        ctx.lineTo(0, this.radius);

        ctx.lineTo(
            this.radius * 0.72,
            -this.radius * 0.3
        );

        ctx.closePath();

        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.fill();

        // Segunda faceta interna.
        ctx.beginPath();

        ctx.moveTo(0, -this.radius);

        ctx.lineTo(
            -this.radius * 0.72,
            -this.radius * 0.3
        );

        ctx.lineTo(0, this.radius);

        ctx.closePath();

        ctx.fillStyle = "rgba(15, 23, 42, 0.17)";
        ctx.fill();

        ctx.restore();
    }


    /* Detecta si las coordenadas del clic alcanzan el cristal. */
    containsPoint(mouseX, mouseY) {
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;

        const hitRadius = this.radius + HITBOX_PADDING;

        return dx * dx + dy * dy <= hitRadius * hitRadius;
    }
}


/* Crea exactamente 25 objetos al iniciar o reiniciar. */
function initObjects() {
    objects = Array.from(
        { length: MAX_OBJECTS },
        () => new GameObject()
    );

    if (circlesCountEl) {
        circlesCountEl.textContent = String(objects.length);
    }
}


/*
 * CREA EL EFECTO DE IMPACTO.
 * Incluye partículas, anillo luminoso y texto +1.
 * No modifica la física ni la cantidad de objetos.
 */
function createImpactEffect(x, y, color) {
    const particles = [];
    const particleCount = 22;

    // Crear las partículas en distintas direcciones.
    for (let i = 0; i < particleCount; i += 1) {
        const angle =
            (Math.PI * 2 * i) / particleCount +
            (Math.random() - 0.5) * 0.28;

        const speed = 1.4 + Math.random() * 4.2;

        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 1.4 + Math.random() * 2.5,
            age: 0,
            life: 18 + Math.random() * 16
        });
    }

    // Guardar el efecto para animarlo en los siguientes fotogramas.
    impactEffects.push({
        x,
        y,
        color,
        age: 0,
        ringLife: 24,
        textAge: 0,
        textLife: 40,
        particles
    });
}


/* Actualiza y dibuja todos los efectos de los impactos. */
function updateAndDrawImpactEffects(deltaFrames) {
    for (let i = impactEffects.length - 1; i >= 0; i -= 1) {
        const effect = impactEffects[i];

        effect.age += deltaFrames;
        effect.textAge += deltaFrames;

        // ANILLO LUMINOSO EXPANSIVO.
        const ringProgress = Math.min(
            effect.age / effect.ringLife,
            1
        );

        if (ringProgress < 1) {
            ctx.save();

            ctx.globalAlpha = 1 - ringProgress;

            // Anillo exterior.
            ctx.beginPath();

            ctx.arc(
                effect.x,
                effect.y,
                7 + ringProgress * 44,
                0,
                Math.PI * 2
            );

            ctx.strokeStyle = effect.color;

            ctx.lineWidth =
                3 * (1 - ringProgress) + 0.5;

            ctx.shadowColor = effect.color;
            ctx.shadowBlur = 18;

            ctx.stroke();

            // Anillo interior.
            ctx.beginPath();

            ctx.arc(
                effect.x,
                effect.y,
                4 + ringProgress * 25,
                0,
                Math.PI * 2
            );

            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";

            ctx.stroke();

            ctx.restore();
        }


        // PARTÍCULAS QUE SALEN DESPEDIDAS DEL IMPACTO.
        for (
            let j = effect.particles.length - 1;
            j >= 0;
            j -= 1
        ) {
            const particle = effect.particles[j];

            particle.age += deltaFrames;

            particle.x += particle.vx * deltaFrames;
            particle.y += particle.vy * deltaFrames;

            // Reducir la velocidad progresivamente.
            particle.vx *= Math.pow(0.97, deltaFrames);

            // Dar una pequeña caída a las partículas.
            particle.vy += 0.12 * deltaFrames;

            const particleAlpha = Math.max(
                0,
                1 - particle.age / particle.life
            );

            // Eliminar partículas que terminaron su animación.
            if (particleAlpha <= 0) {
                effect.particles.splice(j, 1);
                continue;
            }

            ctx.save();

            ctx.globalAlpha = particleAlpha;

            ctx.fillStyle = effect.color;
            ctx.shadowColor = effect.color;
            ctx.shadowBlur = 10;

            ctx.beginPath();

            ctx.arc(
                particle.x,
                particle.y,
                particle.size * particleAlpha,
                0,
                Math.PI * 2
            );

            ctx.fill();

            ctx.restore();
        }


        // TEXTO FLOTANTE +1.
        const textProgress = Math.min(
            effect.textAge / effect.textLife,
            1
        );

        if (textProgress < 1) {
            ctx.save();

            ctx.globalAlpha = 1 - textProgress;

            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = effect.color;
            ctx.shadowBlur = 14;

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.font =
                `700 ${14 + (1 - textProgress) * 3}px 'Fira Code', monospace`;

            // El texto sube mientras se desvanece.
            ctx.fillText(
                "+1",
                effect.x,
                effect.y - 18 - textProgress * 35
            );

            ctx.restore();
        }


        // Quitar el efecto cuando todos sus elementos han terminado.
        if (
            ringProgress >= 1 &&
            effect.particles.length === 0 &&
            textProgress >= 1
        ) {
            impactEffects.splice(i, 1);
        }
    }
}


/* Detecta el clic izquierdo y registra los impactos. */
function handleCanvasClick(event) {
    // Ignorar cualquier botón distinto del izquierdo.
    if (event.button !== 0) {
        return;
    }

    const rect = canvas.getBoundingClientRect();

    // Coordenadas relativas al canvas.
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Recorrer al revés para priorizar el objeto dibujado al final.
    for (let i = objects.length - 1; i >= 0; i -= 1) {
        const object = objects[i];

        if (object.containsPoint(mouseX, mouseY)) {

            // Generar el efecto antes de reiniciar el objeto.
            createImpactEffect(
                object.x,
                object.y,
                object.color
            );

            // Actualizar el contador.
            destroyedCount += 1;

            if (collisionCountEl) {
                collisionCountEl.textContent =
                    String(destroyedCount);
            }

            // Reutilizar el objeto y devolverlo arriba.
            object.reset();

            // Revisar si cambia el nivel de velocidad.
            updateSpeedLevel();

            // Confirmar que continúan existiendo 25 objetos.
            if (circlesCountEl) {
                circlesCountEl.textContent =
                    String(objects.length);
            }

            // Un clic registra como máximo un impacto.
            return;
        }
    }
}


/* Bucle principal de animación. */
function animate(timestamp) {
    if (isPaused) {
        return;
    }

    // Normalizar el movimiento respecto a la velocidad de los fotogramas.
    const deltaFrames = lastFrameTime === 0
        ? 1
        : Math.min(
            (timestamp - lastFrameTime) / FRAME_DURATION,
            2.5
        );

    lastFrameTime = timestamp;

    // Limpiar el canvas.
    ctx.clearRect(
        0,
        0,
        viewWidth,
        viewHeight
    );

    // Actualizar y dibujar los 25 objetos.
    for (const object of objects) {
        object.update(deltaFrames);
        object.draw();
    }

    // Dibujar los efectos por encima de los objetos.
    updateAndDrawImpactEffects(deltaFrames);

    // Calcular los FPS.
    framesInSample += 1;

    if (fpsSampleStart === 0) {
        fpsSampleStart = timestamp;
    }

    const elapsed = timestamp - fpsSampleStart;

    if (elapsed >= 1000) {
        if (fpsCounterEl) {
            fpsCounterEl.textContent = String(
                Math.round(
                    (framesInSample * 1000) / elapsed
                )
            );
        }

        framesInSample = 0;
        fpsSampleStart = timestamp;
    }

    // Solicitar el siguiente fotograma.
    animationId = requestAnimationFrame(animate);
}


/* Botón para pausar y reanudar. */
btnPause.addEventListener("click", () => {
    isPaused = !isPaused;

    btnPause.textContent = isPaused
        ? "▶ Reanudar"
        : "⏸ Pausar";

    if (isPaused) {
        if (animationId !== null) {
            cancelAnimationFrame(animationId);
        }

        animationId = null;

    } else {
        lastFrameTime = 0;
        fpsSampleStart = 0;
        framesInSample = 0;

        animationId = requestAnimationFrame(animate);
    }
});


/* Botón para reiniciar la simulación. */
btnReset.addEventListener("click", () => {
    destroyedCount = 0;

    // Limpiar los efectos visuales pendientes.
    impactEffects = [];

    if (collisionCountEl) {
        collisionCountEl.textContent = "0";
    }

    // Volver a la velocidad inicial.
    updateSpeedLevel();

    // Generar nuevamente exactamente 25 objetos.
    initObjects();

    // Limpiar el dibujo anterior.
    ctx.clearRect(
        0,
        0,
        viewWidth,
        viewHeight
    );
});


/* Eventos del canvas y la ventana. */
canvas.addEventListener("click", handleCanvasClick);

window.addEventListener("resize", resizeCanvas);


/* Inicialización de la aplicación. */
resizeCanvas();

updateSpeedLevel();

initObjects();

animationId = requestAnimationFrame(animate);