export class HomingArrow {
    constructor(x, y, main) {
        this.main = main;
        this.canvas = document.querySelector(".canvas");
        this.ctx = this.canvas.getContext("2d");

        this.x = x;
        this.y = y;
        this.speed = 3;
        this.size = 1.2 * (main.mobileScale || 1);
        this.isEnd = false;
        this.isHit = false;

        this.imgWidth = 71;
        this.imgHeight = 21;
        this.angle = 0;

        // 수명: 5초 (300프레임 @60fps)
        this.lifeTime = 300;
        this.livedFrames = 0;

        // 폭발 애니메이션
        this.exploding = false;
        this.explodeRadius = 0;
        this.explodeMaxRadius = 60;
        this.explodeOpacity = 1;

        // delta time
        this.lastTime = 0;
        this.delta = 1;

        // 마우스 추적
        this.mouseX = main.mouseX;
        this.mouseY = main.mouseY;

        this.img = new Image();
        this.img.src = "img/arrow.png";

        window.addEventListener("mousemove", this._onMouseMove = (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        }, false);
        window.addEventListener("touchmove", this._onTouchMove = (e) => {
            let touches = e.changedTouches;
            this.mouseX = touches[0].clientX;
            this.mouseY = touches[0].clientY;
        }, false);
    }

    cleanup() {
        window.removeEventListener("mousemove", this._onMouseMove);
        window.removeEventListener("touchmove", this._onTouchMove);
    }

    animate(timestamp) {
        if (this.isEnd) {
            this.cleanup();
            return;
        }

        requestAnimationFrame(this.animate.bind(this));

        if (this.lastTime > 0) {
            const elapsed = timestamp - this.lastTime;
            this.delta = elapsed / (1000 / 60);
            if (this.delta > 3) this.delta = 3;
        }
        this.lastTime = timestamp;

        if (this.exploding) {
            this.drawExplosion();
            return;
        }

        this.livedFrames += this.delta;

        // 수명 초과 → 폭발
        if (this.livedFrames >= this.lifeTime) {
            this.exploding = true;
            this.main.drawParticle(this.x, this.y);
            return;
        }

        // 플레이어 방향으로 부드럽게 회전 추적
        let targetAngle = Math.atan2(this.mouseY - this.y, this.mouseX - this.x);
        let angleDiff = targetAngle - this.angle;

        // 각도 차이 정규화 (-PI ~ PI)
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // 부드러운 회전 (턴 속도 제한)
        let turnSpeed = 0.04 * this.delta;
        if (angleDiff > turnSpeed) this.angle += turnSpeed;
        else if (angleDiff < -turnSpeed) this.angle -= turnSpeed;
        else this.angle = targetAngle;

        let currentSpeed = this.main.nowSlowTime > 0 ? 1.5 : this.speed;
        this.x += Math.cos(this.angle) * currentSpeed * this.delta;
        this.y += Math.sin(this.angle) * currentSpeed * this.delta;

        this.drawArrow();
        this.checkCollision();
    }

    drawArrow() {
        // 남은 수명 비율로 경고 깜빡임
        let lifeRatio = this.livedFrames / this.lifeTime;
        let flash = lifeRatio > 0.7 ? 0.5 + Math.sin(this.livedFrames * 0.3) * 0.5 : 1;

        this.ctx.save();
        this.ctx.globalAlpha = flash;
        this.ctx.translate(this.x, this.y);
        this.ctx.rotate(this.angle + Math.PI);

        // 빨간 글로우
        this.ctx.shadowColor = '#ff4b5c';
        this.ctx.shadowBlur = 12;

        this.ctx.scale(this.size, this.size);
        this.ctx.drawImage(this.img, 0, 0, 512, 154, -35.5, -10.5, this.imgWidth, this.imgHeight);
        this.ctx.restore();

        // 경고 원 표시 (수명 70% 이상)
        if (lifeRatio > 0.7) {
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(this.x, this.y, 25 + Math.sin(this.livedFrames * 0.2) * 5, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(255, 75, 92, ' + (0.3 * flash) + ')';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    drawExplosion() {
        this.explodeRadius += 4 * this.delta;
        this.explodeOpacity -= 0.04 * this.delta;

        if (this.explodeOpacity <= 0) {
            this.isEnd = true;
            return;
        }

        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.explodeRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 75, 92, ' + (this.explodeOpacity * 0.3) + ')';
        this.ctx.fill();
        this.ctx.strokeStyle = 'rgba(255, 75, 92, ' + this.explodeOpacity + ')';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
    }

    checkCollision() {
        // 쉴드 충돌
        if (this.main.nowShieldTime > 0) {
            let radius = 100 * (this.main.mobileScale || 1);
            this.main.angles.forEach((angle) => {
                const sx = this.mouseX + radius * Math.cos(angle);
                const sy = this.mouseY + radius * Math.sin(angle);
                let dist = Math.sqrt((this.x - sx) ** 2 + (this.y - sy) ** 2);
                if (dist < 40 * (this.main.mobileScale || 1) && !this.isHit) {
                    this.exploding = true;
                    this.isHit = true;
                    this.main.drawParticle(this.x, this.y);
                }
            });
        }

        // 캐릭터 충돌
        let hitR = this.main.nowMiniTime > 0 ? 15 : 30;
        let dist = Math.sqrt((this.x - this.mouseX) ** 2 + (this.y - this.mouseY) ** 2);
        if (dist < hitR + 15 && !this.isHit) {
            if (this.main.life <= 0) return;

            this.canvas.className = 'canvas hit';
            setTimeout(() => { this.canvas.classList = 'canvas'; }, 1000);

            this.main.life -= 1;
            this.isHit = true;
            this.exploding = true;
        }
    }
}
