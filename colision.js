const canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d"); 

let window_height = window.innerHeight; 
let window_width = window.innerWidth; 

canvas.height = window_height; 
canvas.width = window_width; 

const collisionCountEl = document.getElementById("collision-count");
const circlesCountEl = document.getElementById("circles-count");
const fpsCounterEl = document.getElementById("fps-counter");
const btnPause = document.getElementById("btn-pause");
const btnReset = document.getElementById("btn-reset");

let isPaused = false;
let circles = [];
let particles = [];

// --- NUEVA LÓGICA DE COLISIONES ---
let totalImpacts = 0; // Contador acumulativo global
// Mapa para rastrear qué pares de círculos están chocando actualmente
// La clave será "id1-id2" y el valor un booleano.
let activeCollisionPairs = new Map(); 

// Control de rendimiento (FPS)
let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;

// Botón Pausar / Reanudar
btnPause.addEventListener("click", () => {
    isPaused = !isPaused;
    btnPause.textContent = isPaused ? "▶️ Reanudar" : "⏸️ Pausar";
    if (!isPaused) {
        requestAnimationFrame(animate);
    }
});

// Botón Reiniciar simulación
btnReset.addEventListener("click", () => {
    circles = [];
    particles = [];
    totalImpacts = 0; // Reiniciamos el contador
    if (collisionCountEl) collisionCountEl.textContent = 0;
    activeCollisionPairs.clear(); // Limpiamos el mapa de pares
    generateCircles(20);
});

// Soporte Responsive
window.addEventListener("resize", () => {
    window_height = window.innerHeight;
    window_width = window.innerWidth;
    canvas.height = window_height;
    canvas.width = window_width;
});

class Particle {
    constructor(x, y, color) {
        this.posX = x; this.posY = y; this.color = color;
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 3 + 1;
        this.dx = Math.cos(angle) * speed; this.dy = Math.sin(angle) * speed;
        this.alpha = 1; this.decay = Math.random() * 0.04 + 0.02; 
    }
    update(context) {
        this.posX += this.dx; this.posY += this.dy; this.alpha -= this.decay;
        if (this.alpha <= 0) return;
        context.save(); context.globalAlpha = this.alpha; context.beginPath();
        context.arc(this.posX, this.posY, 2.5, 0, Math.PI * 2);
        context.fillStyle = this.color; context.shadowColor = this.color;
        context.shadowBlur = 8; context.fill(); context.closePath(); context.restore();
    }
}

class Circle { 
    constructor(x, y, radius, color, text, speed, index) { 
        this.posX = x; this.posY = y; this.radius = radius; 
        this.color = color; this.originalColor = color; 
        this.text = text; this.speed = speed; 
        // ID único obligatorio para la nueva lógica de pares
        this.id = index; 
        this.isColliding = false;
        let angle = Math.random() * Math.PI * 2;
        this.dx = Math.cos(angle) * this.speed; this.dy = Math.sin(angle) * this.speed; 
    } 
    draw(context) { 
        context.beginPath(); 
        context.shadowColor = this.color;
        context.shadowBlur = this.isColliding ? 18 : 8;
        context.strokeStyle = this.color; context.fillStyle = this.color;
        context.textAlign = "center"; context.textBaseline = "middle"; 
        context.font = "bold 13px 'Fira Code', monospace"; 
        context.fillText(this.text, this.posX, this.posY); 
        context.lineWidth = 2.5; context.arc(this.posX, this.posY, this.radius, 0, Math.PI * 2, false); 
        context.stroke(); context.shadowBlur = 0; context.closePath(); 
    } 
    update(context) { 
        this.posX += this.dx; this.posY += this.dy; 
        let currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        // Rebote paredes
        if (this.posX + this.radius > window_width) { this.posX = window_width - this.radius; this.dx = -Math.abs(this.dx); }
        else if (this.posX - this.radius < 0) { this.posX = this.radius; this.dx = Math.abs(this.dx); }
        if (this.posY + this.radius > window_height) { this.posY = window_height - this.radius; this.dy = -Math.abs(this.dy); }
        else if (this.posY - this.radius < 0) { this.posY = this.radius; this.dy = Math.abs(this.dy); }
        
        // Color visual
        this.color = this.isColliding ? "#0000FF" : this.originalColor;
        this.draw(context); 
    } 
} 

function generateCircles(n) { 
    for (let i = 0; i < n; i++) { 
        let radius = Math.random() * 20 + 20; 
        let x = Math.random() * (window_width - radius * 2) + radius; 
        let y = Math.random() * (window_height - radius * 2) + radius; 
        let color = `#${Math.floor(Math.random()*16777215).toString(16)}`; 
        let speed = Math.random() * 4 + 1; 
        // Usamos la longitud actual como ID único
        let text = `C${circles.length + 1}`; 
        circles.push(new Circle(x, y, radius, color, text, speed, circles.length)); 
    }
    if (circlesCountEl) circlesCountEl.textContent = circles.length;
} 

// Interactividad clics
window.addEventListener("click", (event) => {
    if (event.clientX < 260 && event.clientY < 180) return;
    let radius = Math.random() * 20 + 20;
    let color = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    let speed = Math.random() * 4 + 1;
    let text = `C${circles.length + 1}`;
    let x = Math.max(radius, Math.min(event.clientX, window_width - radius));
    let y = Math.max(radius, Math.min(event.clientY, window_height - radius));
    circles.push(new Circle(x, y, radius, color, text, speed, circles.length));
    if (circlesCountEl) circlesCountEl.textContent = circles.length;
});

// --- FUNCIÓN CORREGIDA Y FUNCIONAL ---
function handleCollisions() {
    // Resetear estado visual de colisión para este fotograma
    circles.forEach(c => c.isColliding = false);

    // Bucle doble para comparar todos los pares (i, j)
    for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
            let c1 = circles[i];
            let c2 = circles[j];

            let dx = c2.posX - c1.posX;
            let dy = c2.posY - c1.posY;
            // Distancia al cuadrado (más eficiente que Math.sqrt para la detección inicial)
            let distanceSq = dx * dx + dy * dy;
            let minDistance = c1.radius + c2.radius;

            // Crear una clave única para este par, ej: "0-5" (siempre menor-mayor)
            let pairKey = `${c1.id}-${c2.id}`;

            // 1. DETECCIÓN FÍSICA
            if (distanceSq < minDistance * minDistance) {
                // Hay contacto físico
                c1.isColliding = true;
                c2.isColliding = true;

                // 2. DETECCIÓN DE ESTADO (Lógica del contador funcional)
                // Preguntamos: ¿Este par ya estaba chocando en el fotograma anterior?
                if (!activeCollisionPairs.has(pairKey)) {
                    // ¡NO ESTABA CHOCANDO! Significa que este es el EXACTO momento del impacto.
                    
                    // A) Sumamos al contador funcional (solo una vez por choque completo)
                    totalImpacts++; 
                    if (collisionCountEl) collisionCountEl.textContent = totalImpacts;
                    
                    // B) Registramos el par como "actualmente chocando" en el Mapa
                    activeCollisionPairs.set(pairKey, true);

                    // C) Efectos visuales de impacto (chispas)
                    let distance = Math.sqrt(distanceSq); // Ahora sí calculamos raíz para la física
                    let midX = c1.posX + (dx / distance) * c1.radius;
                    let midY = c1.posY + (dy / distance) * c1.radius;
                    for (let p = 0; p < 5; p++) { particles.push(new Particle(midX, midY, "#38bdf8")); }
                }

                // 3. RESOLUCIÓN FÍSICA (Vectorial y separación, se mantiene igual)
                let distance = Math.sqrt(distanceSq);
                let nx = dx / distance; let ny = dy / distance;
                let tx = -ny; let ty = nx;
                let dpTan1 = c1.dx * tx + c1.dy * ty; let dpTan2 = c2.dx * tx + c2.dy * ty;
                let dpNorm1 = c1.dx * nx + c1.dy * ny; let dpNorm2 = c2.dx * nx + c2.dy * ny;
                let m1 = c1.radius; let m2 = c2.radius;
                let p1 = (dpNorm1 * (m1 - m2) + 2 * m2 * dpNorm2) / (m1 + m2);
                let p2 = (dpNorm2 * (m2 - m1) + 2 * m1 * dpNorm1) / (m1 + m2);
                c1.dx = tx * dpTan1 + nx * p1; c1.dy = ty * dpTan1 + ny * p1;
                c2.dx = tx * dpTan2 + nx * p2; c2.dy = ty * dpTan2 + ny * p2;
                // Separación para evitar solapamiento
                let overlap = minDistance - distance;
                c1.posX -= nx * overlap * 0.5; c1.posY -= ny * overlap * 0.5;
                c2.posX += nx * overlap * 0.5; c2.posY += ny * overlap * 0.5;

            } else {
                // No hay contacto físico.
                // Si el par estaba registrado como "chocando", lo eliminamos del mapa 
                // para que pueda volver a sumar puntos la próxima vez que choquen.
                if (activeCollisionPairs.has(pairKey)) {
                    activeCollisionPairs.delete(pairKey);
                }
            }
        }
    }
}

function animate(currentTime) { 
    if (isPaused) return;
    // Cálculo FPS
    frameCount++;
    if (currentTime - fpsTimer >= 1000) {
        if (fpsCounterEl) fpsCounterEl.textContent = frameCount;
        frameCount = 0; fpsTimer = currentTime;
    }
    ctx.fillStyle = 'rgba(7, 9, 14, 0.25)'; ctx.fillRect(0, 0, window_width, window_height); 
    handleCollisions();
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(ctx);
        if (particles[i].alpha <= 0) particles.splice(i, 1);
    }
    circles.forEach(circle => { circle.update(ctx); }); 
    requestAnimationFrame(animate); 
} 

generateCircles(20);
requestAnimationFrame(animate);