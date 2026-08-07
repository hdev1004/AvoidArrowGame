const PARTICLE_COLORS = ['#ff4b5c', '#ffcd3c', '#4bffb5', '#3c5cff'];

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
        this.canvas = document.querySelector(".canvas");
        this.ctx = this.canvas.getContext("2d");
        this.radius = Math.floor(Math.random() * 20) + 30;
        this.angle = Math.random() * 2 * Math.PI;
        this.shrinkRate = 0.8;
        this.speed = Math.floor(Math.random() * 6) + 9;
    }

    update() {
        if (this.radius <= 1) return;

        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.radius *= this.shrinkRate;
    }
}

export class Particles {
    constructor(x, y) {
        this.particles = [];
        this.x = x;
        this.y = y;
        this.createFirework();
    }

    createFirework() {
        for (let i = 0; i < 10; i++) {
            this.particles.push(new Particle(this.x, this.y));
        }
    }

    animate() {
        this.particles.forEach((particle) => particle.update());
        requestAnimationFrame(this.animate.bind(this));
    }
}
