export class Arrow {
    constructor(x, y, size, speed, rotateSpeed, arrowIndex, mousePoint, main) {
        this.main = main;
        this.opacity = 1;
        this.DecreaseOpacity = 0.005;
        this.arrowIndex = arrowIndex;

        this.isHitAnimation = false;
        this.isEnd = false;
        this.isHit = false;
        this.x = x;
        this.y = y;
        this.imgWidth = 71;
        this.imgHeight = 21;

        this.nowTime = 0;
        this.focusTime = 3;
        this.splitTimer = this.focusTime / 60;

        this.beforeX = this.x;
        this.beforeY = this.y;
        this.mouseX = mousePoint.x;
        this.mouseY = mousePoint.y;
        this.saveMousePoint = [];

        this.size = size;
        this.speed = speed;
        this.degree = 0;
        this.go = 0;

        this.imgGapX;
        this.imgGapY;
        this.hitbox = { x: 0, y: 0, w: 0, h: 0, r: 0, s: 0 };

        // 회전
        this.rotateSpeed = rotateSpeed;
        this.splitScale = this.size / this.rotateSpeed;
        this.nowScale = 0;
        this.index = 0;

        // 발사
        this.shot = -30.5;
        this.shotSpeed = 10;

        // 모션 플래그
        this.createMotionFlag = false;
        this.shotMotionFlag = false;
        this.lastPosBackup = null;

        // delta time (60fps 기준 정규화)
        this.lastTime = 0;
        this.delta = 1;

        this.img = new Image();
        this.img.src = Math.random() < 0.5 ? "img/arrow.png" : "img/arrow2.png";

        this.canvas = document.querySelector(".canvas");
        this.ctx = this.canvas.getContext("2d");
        window.addEventListener("mousemove", this.mouseMove.bind(this), false);
        window.addEventListener("touchmove", this.touchMove.bind(this), false);
    }

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    getPos(speed) {
        let targetRadian = -Math.atan2(this.mouseX - this.x, this.mouseY - this.y);
        let targetDegree = this.radianToDegree(targetRadian);
        if (targetDegree < 0) targetDegree += 360;

        if (Math.abs(targetDegree - this.degree) > Math.floor(targetDegree) + 360 - Math.floor(this.degree)) {
            targetDegree += 360;
        } else if (Math.abs(targetDegree - this.degree) > Math.floor(this.degree) + 360 - Math.floor(targetDegree)) {
            this.degree += 360;
        }

        if (targetDegree - speed > this.degree) {
            this.degree += speed;
        } else if (targetDegree + speed < this.degree) {
            this.degree -= speed;
        }

        let radian = this.degreeToRadian(this.degree);
        return { x: this.x, y: this.y, r: radian, d: this.degree };
    }

    radianToDegree(radian) {
        return radian * 180 / Math.PI * -1;
    }

    degreeToRadian(degree) {
        return (degree / 180) * Math.PI * -1;
    }

    MediateDegree(degree) {
        return this.degreeToRadian(degree % 360);
    }

    mouseMove(e) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }

    touchMove(e) {
        let touches = e.changedTouches;
        this.mouseX = touches[0].clientX;
        this.mouseY = touches[0].clientY;
    }

    createMotion() {
        let pos;
        let trigger = false;

        if (this.rotateSpeed > 0) {
            this.degree += this.rotateSpeed * this.delta;
            this.rotateSpeed -= 1 * this.delta;
            this.nowScale += this.splitScale * this.delta;
        } else {
            trigger = true;
            this.degree %= 360;
            pos = this.getPos(4);
        }

        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.ctx.scale(this.nowScale, this.nowScale);
        this.ctx.rotate(this.degreeToRadian(90));

        if (!trigger) {
            this.ctx.rotate(this.MediateDegree(this.degree));
        } else {
            this.nowTime += this.splitTimer * this.delta;
            if (this.nowTime >= this.focusTime) this.createMotionFlag = true;

            this.ctx.rotate(pos.r);
            this.hitbox = {
                x: this.x - this.imgWidth * this.size / 2,
                y: this.y - this.imgHeight * this.size / 2,
                w: this.imgWidth * this.size,
                h: this.imgHeight * this.size,
                r: pos.r + this.degreeToRadian(90),
                s: this.size
            };
        }

        this.imgGapX = -35.5;
        this.imgGapY = -10.5;
        this.ctx.drawImage(this.img, 0, 0, 512, 154, this.imgGapX, this.imgGapY, this.imgWidth, this.imgHeight);
        this.ctx.restore();
    }

    shootingMotion() {
        if (this.lastPosBackup == null) {
            this.lastPosBackup = this.getPos(0);
        }

        let angle = this.degreeToRadian(this.lastPosBackup.d - 90);
        this.x = this.lastPosBackup.x + Math.cos(angle) * this.go;
        this.y = this.lastPosBackup.y + Math.sin(angle) * this.go;
        let currentSpeed = this.main.nowSlowTime > 0 ? 5 : this.speed;
        this.go += currentSpeed * this.delta;

        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.ctx.scale(this.nowScale, this.nowScale);
        this.ctx.rotate(this.degreeToRadian(90));
        this.ctx.rotate(this.lastPosBackup.r);
        this.ctx.drawImage(this.img, 0, 0, 512, 154, this.imgGapX, this.imgGapY, this.imgWidth, this.imgHeight);
        this.ctx.restore();

        this.hitbox = {
            x: this.x - this.imgWidth * this.size / 2,
            y: this.y - this.imgHeight * this.size / 2,
            w: this.imgWidth * this.size,
            h: this.imgHeight * this.size,
            r: this.lastPosBackup.r + this.degreeToRadian(90),
            s: this.size
        };

        if (this.x <= -1 || this.x >= this.canvas.width || this.y <= -1 || this.y >= this.canvas.height) {
            this.shotMotionFlag = true;
        }
    }

    leftMotion() {
        this.ctx.save();
        if (this.opacity > this.DecreaseOpacity) {
            this.opacity -= this.DecreaseOpacity * this.delta;
        } else {
            this.opacity = 0;
            this.isEnd = true;
        }

        this.ctx.globalAlpha = this.opacity;
        this.ctx.translate(this.x, this.y);
        this.ctx.scale(this.nowScale, this.nowScale);
        this.ctx.rotate(this.degreeToRadian(90));
        this.ctx.rotate(this.lastPosBackup.r);
        this.ctx.drawImage(this.img, 0, 0, 512, 154, this.imgGapX, this.imgGapY, this.imgWidth, this.imgHeight);
        this.ctx.restore();
    }

    animate(timestamp) {
        if (this.isEnd) return;

        requestAnimationFrame(this.animate.bind(this));

        // 60fps 기준 delta time 계산
        if (this.lastTime > 0) {
            const elapsed = timestamp - this.lastTime;
            this.delta = elapsed / (1000 / 60); // 60fps = 16.67ms 기준
            if (this.delta > 3) this.delta = 3; // 탭 전환 등 극단적 스파이크 방지
        }
        this.lastTime = timestamp;

        if (!this.createMotionFlag) {
            this.createMotion();
        } else if (!this.shotMotionFlag) {
            this.shootingMotion();
        } else {
            this.leftMotion();
        }

        this.CharCollision();
    }

    detectCollision(rect, circle) {
        var cx, cy;
        var angleOfRad = -rect.r;
        var rectCenterX = rect.x + rect.w / 2;
        var rectCenterY = rect.y + rect.h / 2;

        var rotateCircleX = Math.cos(angleOfRad) * (circle.x - rectCenterX) - Math.sin(angleOfRad) * (circle.y - rectCenterY) + rectCenterX;
        var rotateCircleY = Math.sin(angleOfRad) * (circle.x - rectCenterX) + Math.cos(angleOfRad) * (circle.y - rectCenterY) + rectCenterY;

        cx = Math.max(rect.x, Math.min(rotateCircleX, rect.x + rect.w));
        cy = Math.max(rect.y, Math.min(rotateCircleY, rect.y + rect.h));

        if (this.distance(rotateCircleX, rotateCircleY, cx, cy) < circle.r && !this.isHit) {
            if (this.main.life <= 0) return false;

            this.canvas.className = 'canvas hit';
            setTimeout(() => { this.canvas.classList = 'canvas'; }, 1000);

            this.main.life -= 1;
            this.isHit = true;
            return true;
        }
        return false;
    }

    detectShieldCollision(rect, circle) {
        var cx, cy;
        var angleOfRad = -rect.r;
        var rectCenterX = rect.x + rect.w / 2;
        var rectCenterY = rect.y + rect.h / 2;

        var rotateCircleX = Math.cos(angleOfRad) * (circle.x - rectCenterX) - Math.sin(angleOfRad) * (circle.y - rectCenterY) + rectCenterX;
        var rotateCircleY = Math.sin(angleOfRad) * (circle.x - rectCenterX) + Math.cos(angleOfRad) * (circle.y - rectCenterY) + rectCenterY;

        cx = Math.max(rect.x, Math.min(rotateCircleX, rect.x + rect.w));
        cy = Math.max(rect.y, Math.min(rotateCircleY, rect.y + rect.h));

        if (this.distance(rotateCircleX, rotateCircleY, cx, cy) < circle.r && !this.isHit) {
            this.isEnd = true;
            this.isHit = true;
            this.main.drawParticle(cx, cy);
            return true;
        }
        return false;
    }

    distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    CharCollision() {
        if (this.shotMotionFlag) return;

        if (this.main.nowShieldTime > 0) {
            let radius = 100;
            this.main.angles.forEach((angle) => {
                const x = this.mouseX + radius * Math.cos(angle);
                const y = this.mouseY + radius * Math.sin(angle);
                this.detectShieldCollision(this.hitbox, { x, y, r: 30 });
            });
        }
        let hitR = this.main.nowMiniTime > 0 ? 15 : 30;
        this.detectCollision(this.hitbox, { x: this.mouseX, y: this.mouseY, r: hitR });
    }
}
