const canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d"); 

// Obtener dimensiones de la pantalla actual
const window_height = window.innerHeight; 
const window_width = window.innerWidth; 

canvas.height = window_height; 
canvas.width = window_width; 

// Referencia al contador en el HUD visual
const collisionCountEl = document.getElementById("collision-count");

class Circle { 
    constructor(x, y, radius, color, text, speed, index) { 
        this.posX = x; 
        this.posY = y; 
        this.radius = radius; 
        this.color = color; 
        this.originalColor = color; // Almacena el color original para restaurarlo al terminar la colisión
        this.text = text; 
        this.speed = speed; 
        this.index = index; 
        this.isColliding = false;

        // Dirección aleatoria manteniendo la velocidad configurada
        let angle = Math.random() * Math.PI * 2;
        this.dx = Math.cos(angle) * this.speed; 
        this.dy = Math.sin(angle) * this.speed; 
    } 

    draw(context) { 
        context.beginPath(); 
        
        // Efecto de brillo profesional en los círculos
        context.shadowColor = this.color;
        context.shadowBlur = 8;

        context.strokeStyle = this.color; 
        context.fillStyle = this.color;
        context.textAlign = "center"; 
        context.textBaseline = "middle"; 
        context.font = "bold 13px 'Fira Code', monospace"; 
        
        // Renderizar texto del círculo (ej. C1, C2...)
        context.fillText(this.text, this.posX, this.posY); 
        
        context.lineWidth = 2.5; 
        context.arc(this.posX, this.posY, this.radius, 0, Math.PI * 2, false); 
        context.stroke(); 
        
        context.shadowBlur = 0; // Limpiar sombra por rendimiento
        context.closePath(); 
    } 

    update(context, circles) { 
        // Actualizar posición en X y verificar límites del canvas
        this.posX += this.dx; 
        if (this.posX + this.radius > window_width) {
            this.posX = window_width - this.radius;
            this.dx = -this.dx;
        } else if (this.posX - this.radius < 0) {
            this.posX = this.radius;
            this.dx = -this.dx;
        }

        // Actualizar posición en Y y verificar límites del canvas
        this.posY += this.dy; 
        if (this.posY + this.radius > window_height) {
            this.posY = window_height - this.radius;
            this.dy = -this.dy;
        } else if (this.posY - this.radius < 0) {
            this.posY = this.radius;
            this.dy = -this.dy;
        }

        this.draw(context); 
    } 
} 

// Array para almacenar los 20 círculos
let circles = []; 

// Función para generar los 20 círculos con velocidades de 1 a 5 unidades
function generateCircles(n) { 
    for (let i = 0; i < n; i++) { 
        let radius = Math.random() * 20 + 20; // Radio entre 20 y 40px
        let x = Math.random() * (window_width - radius * 2) + radius; 
        let y = Math.random() * (window_height - radius * 2) + radius; 
        let color = `#${Math.floor(Math.random()*16777215).toString(16)}`; // Color aleatorio
        let speed = Math.random() * 4 + 1; // Velocidad exacta entre 1 y 5 unidades
        let text = `C${i + 1}`; 
        
        circles.push(new Circle(x, y, radius, color, text, speed, i)); 
    } 
} 

// Función para detectar colisiones aplicando la fórmula de distancia entre centros
function checkCollisions() {
    let activeCollisions = 0;

    // Restablecer estados de colisión en cada frame
    circles.forEach(circle => {
        circle.isColliding = false;
    });

    for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
            let c1 = circles[i];
            let c2 = circles[j];

            // Aplicación de la fórmula de distancia entre centros: d = sqrt((x2 - x1)^2 + (y2 - y1)^2)
            let dx = c2.posX - c1.posX;
            let dy = c2.posY - c1.posY;
            let distance = Math.sqrt(dx * dx + dy * dy);

            // Condición: Si la distancia es menor a la suma de ambos radios, colisionan
            if (distance < c1.radius + c2.radius) {
                activeCollisions++;
                c1.isColliding = true;
                c2.isColliding = true;

                // Cambio de dirección opuesta (rebote elástico básico)
                let tempDx = c1.dx;
                let tempDy = c1.dy;
                c1.dx = c2.dx;
                c1.dy = c2.dy;
                c2.dx = tempDx;
                c2.dy = tempDy;

                // Corrección de posición para evitar que se queden trabados
                let overlap = (c1.radius + c2.radius) - distance;
                let separateX = dx / distance;
                let separateY = dy / distance;

                c1.posX -= separateX * overlap * 0.5;
                c1.posY -= separateY * overlap * 0.5;
                c2.posX += separateX * overlap * 0.5;
                c2.posY += separateY * overlap * 0.5;
            }
        }
    }

    // Cambiar color a azul (#0000FF) mientras estén en colisión; al terminar, regresar al original
    circles.forEach(circle => {
        if (circle.isColliding) {
            circle.color = "#0000FF"; 
        } else {
            circle.color = circle.originalColor; 
        }
    });

    // Actualizar número de colisiones en tiempo real en el HUD
    if (collisionCountEl) {
        collisionCountEl.textContent = activeCollisions;
    }
}

// Función de animación principal
function animate() { 
    ctx.clearRect(0, 0, window_width, window_height); 
    
    // Evaluar colisiones antes de actualizar fotogramas
    checkCollisions();

    // Actualizar y redibujar cada objeto con POO
    circles.forEach(circle => { 
        circle.update(ctx, circles); 
    }); 
    
    requestAnimationFrame(animate); 
} 

// Inicializar con 20 círculos y arrancar el motor de animación
generateCircles(20); 
animate();