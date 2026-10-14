const canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d"); 

const window_height = window.innerHeight; 
const window_width = window.innerWidth; 

canvas.height = window_height; 
canvas.width = window_width; 

const collisionCountEl = document.getElementById("collision-count");
const circlesCountEl = document.getElementById("circles-count");

class Particle {
    constructor(x, y, color) {
        this.posX = x;
        this.posY = y;
        this.color = color;
        let angle = Math.random() * Math.PI * 2;
        let speed = Math.random() * 3 + 1;
        this.dx = Math.cos(angle) * speed;
        this.dy = Math.sin(angle) * speed;
        this.alpha = 1; 
        this.decay = Math.random() * 0.04 + 0.02; 
    }

    update(context) {
        this.posX += this.dx;
        this.posY += this.dy;
        this.alpha -= this.decay;

        if (this.alpha <= 0) return;

        context.save();
        context.globalAlpha = this.alpha;
        context.beginPath();
        context.arc(this.posX, this.posY, 2.5, 0, Math.PI * 2);
        context.fillStyle = this.color;
        context.shadowColor = this.color;
        context.shadowBlur = 8;
        context.fill();
        context.closePath();
        context.restore();
    }
}

class Circle { 
    constructor(x, y, radius, color, text, speed, index) { 
        this.posX = x; 
        this.posY = y; 
        this.radius = radius; 
        this.color = color; 
        this.originalColor = color; 
        this.text = text; 
        this.speed = speed; 
        this.index = index; 
        this.isColliding = false;

        let angle = Math.random() * Math.PI * 2;
        this.dx = Math.cos(angle) * this.speed; 
        this.dy = Math.sin(angle) * this.speed; 
    } 

    draw(context) { 
        context.beginPath(); 
        
        context.shadowColor = this.color;
        context.shadowBlur = this.isColliding ? 18 : 8;

        context.strokeStyle = this.color; 
        context.fillStyle = this.color;
        context.textAlign = "center"; 
        context.textBaseline = "middle"; 
        context.font = "bold 13px 'Fira Code', monospace"; 
        
        context.fillText(this.text, this.posX, this.posY); 
        
        context.lineWidth = 2.5; 
        context.arc(this.posX, this.posY, this.radius, 0, Math.PI * 2, false); 
        context.stroke(); 
        
        context.shadowBlur = 0; 
        context.closePath(); 
    } 

    update(context) { 
        this.posX += this.dx; 
        this.posY += this.dy; 

        let currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);

        if (this.posX + this.radius > window_width) {
            this.posX = window_width - this.radius;
            let angle = Math.atan2(this.dy, this.dx) + (Math.random() - 0.5) * 0.3;
            this.dx = -Math.cos(angle) * currentSpeed;
            this.dy = Math.sin(angle) * currentSpeed;
        } else if (this.posX - this.radius < 0) {
            this.posX = this.radius;
            let angle = Math.atan2(this.dy, this.dx) + (Math.random() - 0.5) * 0.3;
            this.dx = -Math.cos(angle) * currentSpeed;
            this.dy = Math.sin(angle) * currentSpeed;
        }

        if (this.posY + this.radius > window_height) {
            this.posY = window_height - this.radius;
            let angle = Math.atan2(this.dy, this.dx) + (Math.random() - 0.5) * 0.3;
            this.dx = Math.cos(angle) * currentSpeed;
            this.dy = -Math.sin(angle) * currentSpeed;
        } else if (this.posY - this.radius < 0) {
            this.posY = this.radius;
            let angle = Math.atan2(this.dy, this.dx) + (Math.random() - 0.5) * 0.3;
            this.dx = Math.cos(angle) * currentSpeed;
            this.dy = -Math.sin(angle) * currentSpeed;
        }

        if (this.isColliding) {
            this.color = "#0000FF";
        } else {
            this.color = this.originalColor;
        }

        this.draw(context); 
    } 
} 

let circles = []; 
let particles = [];

function generateCircles(n) { 
    for (let i = 0; i < n; i++) { 
        let radius = Math.random() * 20 + 20; 
        let x = Math.random() * (window_width - radius * 2) + radius; 
        let y = Math.random() * (window_height - radius * 2) + radius; 
        let color = `#${Math.floor(Math.random()*16777215).toString(16)}`; 
        let speed = Math.random() * 4 + 1; 
        let text = `C${circles.length + 1}`; 
        
        circles.push(new Circle(x, y, radius, color, text, speed, circles.length)); 
    }
    if (circlesCountEl) circlesCountEl.textContent = circles.length;
} 

window.addEventListener("click", (event) => {
    if (event.clientX < 320 && event.clientY < 160) return;

    let radius = Math.random() * 20 + 20;
    let color = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    let speed = Math.random() * 4 + 1;
    let text = `C${circles.length + 1}`;
    
    let x = Math.max(radius, Math.min(event.clientX, window_width - radius));
    let y = Math.max(radius, Math.min(event.clientY, window_height - radius));

    circles.push(new Circle(x, y, radius, color, text, speed, circles.length));
    if (circlesCountEl) circlesCountEl.textContent = circles.length;
});

function handleCollisions() {
    let activeCollisions = 0;

    circles.forEach(c => c.isColliding = false);

    for (let i = 0; i < circles.length; i++) {
        for (let j = i + 1; j < circles.length; j++) {
            let c1 = circles[i];
            let c2 = circles[j];

            let dx = c2.posX - c1.posX;
            let dy = c2.posY - c1.posY;
            let distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < c1.radius + c2.radius) {
                activeCollisions++;
                c1.isColliding = true;
                c2.isColliding = true;

                let midX = (c1.posX + c2.posX) / 2;
                let midY = (c1.posY + c2.posY) / 2;
                for (let p = 0; p < 4; p++) {
                    particles.push(new Particle(midX, midY, "#38bdf8"));
                }

                let nx = dx / distance;
                let ny = dy / distance;
                let tx = -ny;
                let ty = nx;

                let dpTan1 = c1.dx * tx + c1.dy * ty;
                let dpTan2 = c2.dx * tx + c2.dy * ty;

                let dpNorm1 = c1.dx * nx + c1.dy * ny;
                let dpNorm2 = c2.dx * nx + c2.dy * ny;

                let m1 = c1.radius;
                let m2 = c2.radius;

                let p1 = (dpNorm1 * (m1 - m2) + 2 * m2 * dpNorm2) / (m1 + m2);
                let p2 = (dpNorm2 * (m2 - m1) + 2 * m1 * dpNorm1) / (m1 + m2);

                c1.dx = tx * dpTan1 + nx * p1;
                c1.dy = ty * dpTan1 + ny * p1;
                c2.dx = tx * dpTan2 + nx * p2;
                c2.dy = ty * dpTan2 + ny * p2;

                let overlap = (c1.radius + c2.radius) - distance;
                c1.posX -= nx * overlap * 0.5;
                c1.posY -= ny * overlap * 0.5;
                c2.posX += nx * overlap * 0.5;
                c2.posY += ny * overlap * 0.5;
            }
        }
    }

    if (collisionCountEl) {
        collisionCountEl.textContent = activeCollisions;
    }
}

function animate() { 
    ctx.fillStyle = 'rgba(7, 9, 14, 0.25)';
    ctx.fillRect(0, 0, window_width, window_height); 
    
    handleCollisions();

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update(ctx);
        if (particles[i].alpha <= 0) {
            particles.splice(i, 1);
        }
    }

    circles.forEach(circle => { 
        circle.update(ctx); 
    }); 
    
    requestAnimationFrame(animate); 
} 

generateCircles(20); 
animate();