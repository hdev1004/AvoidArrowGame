const ITEM_LIST = [
    { type: 'heart',  img: '/img/heart.png',  color: null },
    { type: 'shield', img: '/img/shield.png', color: null },
    { type: 'score',  img: null, color: '#f0a500' },
    { type: 'slow',   img: '/img/slow.png',   color: null },
    { type: 'bomb',   img: null, color: '#ff4b5c' },
    { type: 'mini',   img: null, color: '#a855f7' },
    { type: 'magnet', img: null, color: '#3b82f6' },
];

export class Items {
    constructor(main) {
        let random = Math.floor(Math.random() * ITEM_LIST.length);
        this.canvas = document.querySelector(".canvas");
        this.ctx = this.canvas.getContext("2d");

        this.isSlow = false;
        this.scale = main.mobileScale || 1;
        this.baseSize = 30 * this.scale;
        this.imgWidth = this.baseSize;
        this.imgHeight = this.baseSize;
        this.main = main;
        this.itemType = ITEM_LIST[random].type;
        this.itemColor = ITEM_LIST[random].color;

        if (ITEM_LIST[random].img) {
            this.itemImg = new Image();
            this.itemImg.src = ITEM_LIST[random].img;
        } else {
            this.itemImg = null;
        }

        this.posX = Math.floor(Math.random() * this.canvas.width);
        this.posY = Math.floor(Math.random() * this.canvas.height);
        this.staticPosX = this.posX;
        this.staticPosY = this.posY;
        this.growing = true;
        this.isGet = false;
        this.isEnd = false;
        this.hitbox = {
            x: this.posX + this.baseSize / 2,
            y: this.posY + this.baseSize / 2,
            r: 20 * this.scale
        };
    }

    detectCollision() {
        if (this.isGet) return false;

        const dx = this.main.mouseX - this.hitbox.x;
        const dy = this.main.mouseY - this.hitbox.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 30 + this.hitbox.r) {
            if (this.itemType === 'shield') this.getShield();
            else if (this.itemType === 'heart') this.getHeart();
            else if (this.itemType === 'slow') this.getSlow();
            else if (this.itemType === 'score') this.getScore();
            else if (this.itemType === 'bomb') this.getBomb();
            else if (this.itemType === 'mini') this.getMini();
            else if (this.itemType === 'magnet') this.getMagnet();
            return true;
        }
        return false;
    }

    getShield() {
        this.isEnd = true;
        this.isGet = true;
        this.main.nowShieldTime += this.main.shieldTime;
    }

    getHeart() {
        this.isEnd = true;
        this.isGet = true;
        this.main.life += 2;
    }

    getSlow() {
        this.isSlow = true;
        this.isGet = true;
        this.main.nowSlowTime += this.main.slowTime;
        setTimeout(() => { this.isEnd = true; }, this.main.slowTime * 1000);
    }

    getScore() {
        this.main.bonusScore += 10;
        this.isEnd = true;
        this.isGet = true;
    }

    // 폭탄: 화면 내 모든 화살 제거 + 보너스 점수
    getBomb() {
        this.isEnd = true;
        this.isGet = true;
        this.main.triggerBomb();
    }

    // 축소: 캐릭터 히트박스 축소 8초
    getMini() {
        this.isEnd = true;
        this.isGet = true;
        this.main.triggerMini();
    }

    // 자석: 아이템이 캐릭터에게 끌려옴 15초
    getMagnet() {
        this.isEnd = true;
        this.isGet = true;
        this.main.triggerMagnet();
    }

    drawCanvasIcon() {
        const cx = this.posX + this.imgWidth / 2;
        const cy = this.posY + this.imgHeight / 2;
        const r = this.imgWidth / 2;

        this.ctx.save();

        // 배경 원
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
        this.ctx.fillStyle = this.itemColor;
        this.ctx.globalAlpha = 0.9;
        this.ctx.fill();

        // 아이콘 텍스트
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold ' + Math.floor(r) + 'px Pretendard, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Canvas 아이콘 그리기
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';

        if (this.itemType === 'score') {
            // 코인: 금화
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
            this.ctx.fillStyle = '#fff';
            this.ctx.globalAlpha = 0.4;
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold ' + Math.floor(r * 0.8) + 'px Pretendard, sans-serif';
            this.ctx.fillText('$', cx, cy + 1);
        } else if (this.itemType === 'bomb') {
            // 폭탄: 원 + 도화선
            this.ctx.beginPath();
            this.ctx.arc(cx, cy + 2, r * 0.45, 0, Math.PI * 2);
            this.ctx.fillStyle = '#fff';
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.moveTo(cx + r * 0.25, cy - r * 0.25);
            this.ctx.lineTo(cx + r * 0.5, cy - r * 0.55);
            this.ctx.stroke();
            // 불꽃
            this.ctx.beginPath();
            this.ctx.arc(cx + r * 0.5, cy - r * 0.6, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffd700';
            this.ctx.fill();
        } else if (this.itemType === 'mini') {
            // 축소: 안쪽으로 향하는 4개 화살표
            const s = r * 0.55;
            const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
            dirs.forEach(([dx, dy]) => {
                this.ctx.beginPath();
                this.ctx.moveTo(cx + dx * s, cy + dy * s);
                this.ctx.lineTo(cx + dx * s * 0.3, cy + dy * s * 0.3);
                this.ctx.stroke();
            });
        } else if (this.itemType === 'magnet') {
            // 자석: U자 모양
            this.ctx.beginPath();
            this.ctx.arc(cx, cy + 2, r * 0.4, 0, Math.PI, false);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(cx - r * 0.4, cy + 2);
            this.ctx.lineTo(cx - r * 0.4, cy - r * 0.35);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(cx + r * 0.4, cy + 2);
            this.ctx.lineTo(cx + r * 0.4, cy - r * 0.35);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawItem() {
        // 바운스 애니메이션
        let maxSize = this.baseSize + 10 * this.scale;
        if (this.growing) {
            this.imgWidth += 0.5;
            this.imgHeight += 0.5;
            this.posX -= 0.25;
            this.posY -= 0.25;
            if (this.imgWidth >= maxSize) this.growing = false;
        } else {
            this.imgWidth -= 0.5;
            this.imgHeight -= 0.5;
            this.posX += 0.25;
            this.posY += 0.25;
            if (this.imgWidth <= this.baseSize) this.growing = true;
        }

        if (!this.isGet) {
            if (this.itemImg) {
                this.ctx.drawImage(this.itemImg, 0, 0, 512, 512, this.posX, this.posY, this.imgWidth, this.imgHeight);
                this.ctx.restore();
            } else {
                this.drawCanvasIcon();
            }
        }
    }

    animate() {
        if (this.main.gameOver || this.isEnd) return;

        requestAnimationFrame(this.animate.bind(this));
        this.drawItem();
        this.detectCollision();
    }
}
