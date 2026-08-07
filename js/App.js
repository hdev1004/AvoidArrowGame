import { Arrow } from "./Arrow.js";
import { HomingArrow } from "./HomingArrow.js";
import { ClearCanvas } from "./ClearCanvas.js";
import { Items } from "./Items.js";
import { Particles } from "./Particles.js";
import * as setting from "./setting.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getDatabase, ref, set, get, child, update } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-database.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// 스킨 목록
export const SKINS = [
    { id: 'default', name: '기본',     price: 0,   glow: null,      trail: null },
    { id: 'ice',     name: '아이스',   price: 100, glow: '#3182f6', trail: '#a5d8ff' },
    { id: 'flame',   name: '플레임',   price: 200, glow: '#ff6b35', trail: '#ff4b5c' },
    { id: 'gold',    name: '골드',     price: 350, glow: '#ffd700', trail: '#f0a500' },
    { id: 'shadow',  name: '섀도우',   price: 500, glow: '#a855f7', trail: '#7c3aed' },
    { id: 'neon',    name: '네온',     price: 800, glow: '#00ff88', trail: '#00ffcc' },
];

// 난이도 설정 테이블
const DIFFICULTY_TABLE = [
    { threshold: 10,  maxScale: 2, createTime: 50, maxSpeed: null },
    { threshold: 30,  maxScale: null, createTime: 40, maxSpeed: 40 },
    { threshold: 60,  maxScale: null, createTime: 30, maxSpeed: 50 },
    { threshold: 90,  maxScale: null, createTime: null, maxSpeed: 60 },
    { threshold: 120, maxScale: null, createTime: null, maxSpeed: 70 },
    { threshold: 150, maxScale: null, createTime: 20, maxSpeed: null },
    { threshold: 200, maxScale: null, createTime: 10, maxSpeed: null },
];

class App {
    constructor(nickname) {
        this.nickname = nickname;
        this.canvas = document.querySelector(".canvas");
        this.ctx = this.canvas.getContext("2d");

        // 점수 & 상태
        this.bonusScore = 0;
        this.score = 0;
        this.life = 3;
        this.gameOver = false;
        this.difficulty = 0;
        this.difficultyControl = new Array(DIFFICULTY_TABLE.length).fill(false);

        // 화살 생성
        this.nowArrow = null;
        this.arrows = [];
        this.index = 0;
        this.nowSpeed = 20;
        this.maxSpeed = 20;
        this.nowScale = 1;
        this.maxScale = 1;
        this.createTime = 60;
        this.sec = 1;
        this.timer = 0;
        this.frameRate = this.sec / this.createTime;

        // 쉴드
        this.shieldTime = 7;
        this.nowShieldTime = 0;
        this.angles = [0, Math.PI * 2 / 3, Math.PI * 4 / 3];
        this.shieldRadian = 15;
        this.shieldImg = new Image();
        this.shieldImg.src = "/img/shield.png";

        // 슬로우
        this.slowTime = 10;
        this.nowSlowTime = 0;

        // 축소
        this.miniTime = 8;
        this.nowMiniTime = 0;
        this.charSize = 50;

        // 자석
        this.magnetTime = 15;
        this.nowMagnetTime = 0;

        // 활성 화살 추적 (폭탄용)
        this.activeArrows = [];

        // 슬로우 눈 파티클
        this.snowParticles = [];

        // 유도 화살
        this.homingTimer = 0;
        this.homingInterval = 180; // 3초마다 (60fps 기준)

        // 스킨
        this.skin = currentSkin || SKINS[0];
        this.trailParticles = [];

        // 이미지
        this.charImg = new Image();
        this.charImg.src = "img/char.png";
        this.lifeImg = new Image();
        this.lifeImg.src = "/img/heart.png";
        this.reloadImg = new Image();
        this.reloadImg.src = "img/reload.png";
        this.reloadImgSize = 50;

        // delta time
        this.lastTime = 0;
        this.delta = 1;

        // 입력
        this.mouseX = this.canvas.width / 2;
        this.mouseY = this.canvas.height / 2;

        window.addEventListener("touchmove", this.touchmove.bind(this), false);
        window.addEventListener("touchend", this.touchend.bind(this), false);
        window.addEventListener("mousemove", this.mousemove.bind(this));
        window.addEventListener("mouseup", this.mouseup.bind(this));
        window.addEventListener("resize", this.resize.bind(this));
        this.resize();

        // 모바일 스케일 (기준: 1920px 폭)
        this.mobileScale = Math.min(this.canvas.width / 1920, 1);
        this.mobileScale = Math.max(this.mobileScale, 0.45);

        this.startItemSpawner();
        this.startTimers();
    }

    startTimers() {
        setInterval(() => {
            if (this.nowSlowTime > 0) this.nowSlowTime -= 1;
            if (this.nowShieldTime > 0) this.nowShieldTime -= 1;
            if (this.nowMiniTime > 0) {
                this.nowMiniTime -= 1;
                if (this.nowMiniTime <= 0) this.charSize = 50;
            }
            if (this.nowMagnetTime > 0) this.nowMagnetTime -= 1;
        }, 1000);
    }

    startItemSpawner() {
        setInterval(() => {
            if (!this.gameOver) {
                let item = new Items(app);
                item.animate();
            }
        }, 10000);
    }

    drawSlowEffect() {
        if (this.nowSlowTime <= 0) {
            this.snowParticles = [];
            return;
        }

        let w = this.canvas.width;
        let h = this.canvas.height;

        // 가장자리 안개 비네팅
        this.ctx.save();
        let gradient = this.ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
        gradient.addColorStop(0, 'rgba(180, 220, 255, 0)');
        gradient.addColorStop(1, 'rgba(180, 220, 255, 0.25)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, w, h);
        this.ctx.restore();

        // 눈/얼음 파티클 생성
        if (this.snowParticles.length < 40 && Math.random() < 0.3) {
            this.snowParticles.push({
                x: Math.random() * w,
                y: -10,
                size: 2 + Math.random() * 4,
                speedY: 0.5 + Math.random() * 1.5,
                speedX: (Math.random() - 0.5) * 0.8,
                opacity: 0.3 + Math.random() * 0.5,
                wobble: Math.random() * Math.PI * 2
            });
        }

        // 파티클 업데이트 & 렌더링
        this.ctx.save();
        for (let i = this.snowParticles.length - 1; i >= 0; i--) {
            let p = this.snowParticles[i];
            p.y += p.speedY * this.delta;
            p.wobble += 0.02 * this.delta;
            p.x += p.speedX * this.delta + Math.sin(p.wobble) * 0.3;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(200, 230, 255, ' + p.opacity + ')';
            this.ctx.fill();

            if (p.y > h + 10) {
                this.snowParticles.splice(i, 1);
            }
        }
        this.ctx.restore();
    }

    drawShield() {
        if (this.nowShieldTime <= 0) return;

        const speed = 0.01;
        const radius = 100 * this.mobileScale;
        const shieldSize = 30 * this.mobileScale;
        this.angles.forEach((angle, index) => {
            const x = this.mouseX + radius * Math.cos(angle);
            const y = this.mouseY + radius * Math.sin(angle);
            this.ctx.drawImage(this.shieldImg, 0, 0, 512, 512, x, y, shieldSize, shieldSize);
            this.angles[index] += speed * this.delta;
        });
    }

    drawParticle(x, y) {
        let particles = new Particles(x, y);
        particles.createFirework(x, y);
        particles.animate();
    }

    inital() {
        this.clearAllArrows();
        this.bonusScore = 0;
        this.score = 0;
        this.life = 3;
        this.gameOver = false;
        this.nowArrow = null;
        this.reloadImgSize = 50;
        this.difficulty = 0;
        this.difficultyControl = new Array(DIFFICULTY_TABLE.length).fill(false);
        this.nowSpeed = 20;
        this.maxSpeed = 20;
        this.nowScale = 1;
        this.maxScale = 1;
        this.createTime = 60;
        this.index = 0;
        this.arrows = [];
        this.sec = 1;
        this.timer = 0;
        this.frameRate = this.sec / this.createTime;
        this.nowMiniTime = 0;
        this.charSize = 50;
        this.nowMagnetTime = 0;
        this.activeArrows = [];
        this.homingTimer = 0;
        this.trailParticles = [];
    }

    clearAllArrows() {
        this.activeArrows.forEach(arrow => {
            arrow.isEnd = true;
            arrow.isHit = true;
        });
        this.activeArrows = [];
    }

    animate(timestamp) {
        if (this.life <= 0 && !this.gameOver) {
            this.gameOver = true;
            this.clearAllArrows();
        }
        requestAnimationFrame(this.animate.bind(this));

        // 60fps 기준 delta time
        if (this.lastTime > 0) {
            const elapsed = timestamp - this.lastTime;
            this.delta = elapsed / (1000 / 60);
            if (this.delta > 3) this.delta = 3;
        }
        this.lastTime = timestamp;

        if (!this.gameOver) {
            this.timer += this.frameRate * this.delta;

            if (this.timer > this.sec) {
                this.difficulty += 1;
                this.timer = 0;

                let x = this.getRandomInt(0, this.canvas.width);
                let y = this.getRandomInt(0, this.canvas.height);
                let size = this.getRandomArbitrary(this.nowScale, this.maxScale) * this.mobileScale;
                let speed = this.getRandomInt(this.nowSpeed, this.maxSpeed) * this.mobileScale;

                if (this.nowSlowTime > 0) speed = 5;

                let rotateSpeed = this.getRandomInt(70, 120);
                this.nowArrow = new Arrow(x, y, size, speed, rotateSpeed, this.index, { x: this.mouseX, y: this.mouseY }, this);
                this.nowArrow.animate();
                this.activeArrows.push(this.nowArrow);
                this.index += 1;

                this.updateDifficulty();
            }

            // 유도 화살 (40점 이상부터, 점수에 따라 빈도/속도 증가)
            let currentScore = this.difficulty + this.bonusScore;
            if (currentScore >= 40) {
                // 점수 구간별 생성 간격 (빨라짐)
                let interval = currentScore >= 150 ? 90
                             : currentScore >= 100 ? 120
                             : currentScore >= 70  ? 150
                             : 180;
                // 점수 구간별 속도 (최대 6)
                let homingSpeed = currentScore >= 150 ? 6
                                : currentScore >= 100 ? 5
                                : currentScore >= 70  ? 4
                                : 3;

                this.homingTimer += this.delta;
                if (this.homingTimer >= interval) {
                    this.homingTimer = 0;
                    let side = Math.floor(Math.random() * 4);
                    let hx, hy;
                    if (side === 0) { hx = -30; hy = Math.random() * this.canvas.height; }
                    else if (side === 1) { hx = this.canvas.width + 30; hy = Math.random() * this.canvas.height; }
                    else if (side === 2) { hx = Math.random() * this.canvas.width; hy = -30; }
                    else { hx = Math.random() * this.canvas.width; hy = this.canvas.height + 30; }

                    let homing = new HomingArrow(hx, hy, this);
                    homing.speed = homingSpeed;
                    homing.animate();
                    this.activeArrows.push(homing);
                }
            }

            // 종료된 화살 정리
            this.activeArrows = this.activeArrows.filter(a => !a.isEnd);

            this.drawSlowEffect();
            this.drawChar();
            this.drawLife();
            this.drawScore();
            this.drawStatusBar();
            this.drawShield();
        }

        if (this.gameOver) {
            gameover(this.difficulty + this.bonusScore);
        } else {
            hideGameover();
        }
    }

    updateDifficulty() {
        DIFFICULTY_TABLE.forEach((level, i) => {
            if (this.difficulty >= level.threshold && !this.difficultyControl[i]) {
                this.difficultyControl[i] = true;
                if (level.maxScale) this.maxScale = level.maxScale;
                if (level.maxSpeed) this.maxSpeed = level.maxSpeed;
                if (level.createTime) {
                    this.createTime = level.createTime;
                    this.frameRate = this.sec / this.createTime;
                }
            }
        });
    }

    mouseup() {}
    touchend() {}

    mousemove(e) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }

    touchmove(e) {
        let touches = e.changedTouches;
        this.mouseX = touches[0].clientX;
        this.mouseY = touches[0].clientY;
    }

    resize() {
        this.canvas.width = document.body.clientWidth;
        this.canvas.height = document.body.clientHeight;
        this.mobileScale = Math.min(this.canvas.width / 1920, 1);
        this.mobileScale = Math.max(this.mobileScale, 0.45);
    }

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }

    getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    drawLife() {
        let now = performance.now() / 1000;
        for (let i = 1; i <= this.life; i++) {
            // 왼→오 웨이브: 각 하트마다 위상 차이
            let wave = Math.sin(now * 3 - i * 0.6);
            let scale = 1 + wave * 0.15; // 0.85 ~ 1.15 범위
            let baseSize = 22;
            let size = baseSize * scale;
            let offsetY = -wave * 3; // 살짝 위아래로도 움직임

            this.ctx.save();
            this.ctx.translate(28 * i + baseSize / 2, 30 + baseSize / 2 + offsetY);
            this.ctx.scale(scale, scale);
            this.ctx.drawImage(this.lifeImg, 0, 0, 512, 512, -baseSize / 2, -baseSize / 2, baseSize, baseSize);
            this.ctx.restore();
        }
    }

    drawChar() {
        let imgSize = this.charSize * this.mobileScale;

        // 트레일 파티클
        if (this.skin.trail) {
            this.trailParticles.push({
                x: this.mouseX, y: this.mouseY,
                size: 4 + Math.random() * 3,
                opacity: 0.6,
                life: 20
            });
            if (this.trailParticles.length > 30) this.trailParticles.shift();

            for (let i = this.trailParticles.length - 1; i >= 0; i--) {
                let tp = this.trailParticles[i];
                tp.life -= this.delta;
                tp.opacity -= 0.03 * this.delta;
                tp.size -= 0.1 * this.delta;
                if (tp.life <= 0 || tp.opacity <= 0) {
                    this.trailParticles.splice(i, 1);
                    continue;
                }
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(tp.x, tp.y, tp.size, 0, Math.PI * 2);
                this.ctx.fillStyle = this.skin.trail;
                this.ctx.globalAlpha = tp.opacity;
                this.ctx.fill();
                this.ctx.restore();
            }
        }

        this.ctx.save();
        this.ctx.translate(this.mouseX, this.mouseY);

        // 스킨 글로우
        if (this.skin.glow) {
            this.ctx.shadowColor = this.skin.glow;
            this.ctx.shadowBlur = 20;
        }

        // 축소 이펙트
        if (this.nowMiniTime > 0) {
            this.ctx.shadowColor = '#a855f7';
            this.ctx.shadowBlur = 15;
        }

        this.ctx.drawImage(this.charImg, 0, 0, 512, 512, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
        this.ctx.restore();
    }

    drawScore() {
        let score = this.difficulty + this.bonusScore;
        this.ctx.save();
        this.ctx.fillStyle = '#191f28';
        this.ctx.font = 'bold 28px Pretendard, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(score, this.canvas.width / 2, 30);
        this.ctx.restore();
    }

    drawStatusBar() {
        let y = 70;
        this.ctx.save();
        this.ctx.font = '13px Pretendard, sans-serif';
        this.ctx.textAlign = 'center';

        let pills = [];
        if (this.nowShieldTime > 0) pills.push({ color: '#3182f6', label: 'SHIELD', time: this.nowShieldTime });
        if (this.nowSlowTime > 0) pills.push({ color: '#10b981', label: 'SLOW', time: this.nowSlowTime });
        if (this.nowMiniTime > 0) pills.push({ color: '#a855f7', label: 'MINI', time: this.nowMiniTime });
        if (this.nowMagnetTime > 0) pills.push({ color: '#f59e0b', label: 'MAGNET', time: this.nowMagnetTime });

        let pillW = 80;
        let gap = 8;
        let totalW = pills.length * pillW + (pills.length - 1) * gap;
        let startX = this.canvas.width / 2 - totalW / 2;
        pills.forEach((p, i) => {
            this.drawStatusPill(startX + i * (pillW + gap), y, p.color, p.label, p.time);
        });
        this.ctx.restore();
    }

    drawStatusPill(x, y, color, label, time) {
        this.ctx.save();
        // 배경 필
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = 0.15;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, 80, 22, 11);
        this.ctx.fill();

        // 텍스트
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = color;
        this.ctx.font = 'bold 11px Pretendard, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(label + ' ' + time + 's', x + 40, y + 15);
        this.ctx.restore();
    }

    // ── 아이템 효과 ──

    triggerBomb() {
        // 각 화살 위치에 파티클 생성 후 제거
        this.activeArrows.forEach(arrow => {
            this.drawParticle(arrow.x, arrow.y);
            arrow.isEnd = true;
            arrow.isHit = true;
        });
        this.activeArrows = [];
        this.bonusScore += 5;

        // 폭탄 플래시 효과
        this.canvas.className = 'canvas bomb-flash';
        setTimeout(() => { this.canvas.classList = 'canvas'; }, 400);
    }

    triggerMini() {
        this.nowMiniTime += this.miniTime;
        this.charSize = 25;
    }

    triggerMagnet() {
        this.nowMagnetTime += this.magnetTime;
    }
}

// ── 게임 제어 ──

export const restart = () => {
    app.inital();
    gameoverTrigger = false;
    document.querySelector("#score_board").className = '';
    document.querySelector("#score").textContent = '화이팅!';
};

export const tutorial = () => {
    document.getElementById("tutorial").className = 'tutorial';
};

let clearCanvas = null;
let app = null;
let firebase = null;
let database = null;
let auth = null;
let currentUser = null;
let currentSkin = null;
let userData = { totalScore: 0, ownedSkins: ['default'], selectedSkin: 'default' };
let getNickname = '';

export const gameStart = (nickname) => {
    clearCanvas = new ClearCanvas();
    clearCanvas.animate();

    nickname = nickname.replace(/_/g, "");

    // 로그인 유저: UID 고정 키, 비로그인: 랜덤 키
    if (currentUser) {
        getNickname = currentUser.uid;
    } else {
        getNickname = nickname + "_" + generateRandomString(7);
    }

    app = new App(nickname);
    app.animate();
};

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

const hideGameover = () => {
    document.querySelector("#score_board").className = "";
    document.querySelector("#score").textContent = '화이팅';
};

let gameoverTrigger = false;
let allScores = [];

function writeUserData(userId, value, displayName) {
    let data = { value };
    if (displayName) data.name = displayName;
    set(ref(database, 'users/' + userId), data);
}

const gameover = (score) => {
    document.querySelector("#score_board").className = "score_board_show";
    document.querySelector("#score").textContent = score;
    let earnedPoints = Math.floor(score / 2);
    let earnedEl = document.getElementById('earned-points');
    if (earnedEl) {
        earnedEl.textContent = currentUser ? '+' + earnedPoints + 'P 획득!' : '로그인하면 포인트 적립!';
    }

    if (!gameoverTrigger) {
        gameoverTrigger = true;
        if (currentUser) {
            userData.totalScore += earnedPoints;
            saveUserData(currentUser.uid);
            updateLobbyUI();
        }

        // 최고 점수일 때만 갱신
        const dbRef = ref(getDatabase());
        get(child(dbRef, 'users/' + getNickname)).then((snapshot) => {
            let prevScore = snapshot.exists() ? snapshot.val().value : 0;
            if (score > prevScore) {
                let displayName = currentUser
                    ? (currentUser.displayName || document.getElementById('nickname').value)
                    : document.getElementById('nickname').value;
                writeUserData(getNickname, score, displayName);
            }
        }).then(() => get(child(ref(getDatabase()), 'users'))).then((snapshot) => {
            if (!snapshot.exists()) return;

            let data = snapshot.val();
            let sorted = Object.entries(data).sort((a, b) => b[1].value - a[1].value);
            let count = Math.min(sorted.length, 5);

            for (let i = 0; i < count; i++) {
                let entry = sorted[i][1];
                let name = entry.name || sorted[i][0].split("_")[0];
                let el = document.querySelector(`#ranking${i + 1}`);
                el.innerHTML = '';
                if (i < 3) {
                    let icon = document.createElement('span');
                    icon.className = 'rank-medal rank-' + (i + 1);
                    icon.textContent = (i + 1);
                    el.appendChild(icon);
                    el.appendChild(document.createTextNode(' ' + name));
                } else {
                    el.textContent = (i + 1) + '. ' + name;
                }
                document.querySelector(`#ranking${i + 1}_score`).textContent = sorted[i][1].value;
            }
        }).catch((error) => {
            console.error(error);
        });
    }
};

// ── 로그인 ──

export const googleLogin = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error('로그인 실패:', error);
        return null;
    }
};

export const googleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    currentUser = null;
    userData = { totalScore: 0, ownedSkins: ['default'], selectedSkin: 'default' };
    currentSkin = SKINS[0];
};

export const getLoginState = () => currentUser;
export const getUserData = () => userData;
export const getSkins = () => SKINS;

async function loadUserData(uid) {
    const dbRef = ref(getDatabase());
    try {
        const snapshot = await get(child(dbRef, 'profiles/' + uid));
        if (snapshot.exists()) {
            let data = snapshot.val();
            userData.totalScore = data.totalScore || 0;
            userData.ownedSkins = data.ownedSkins || ['default'];
            userData.selectedSkin = data.selectedSkin || 'default';
        }
    } catch (e) {
        console.error(e);
    }
    currentSkin = SKINS.find(s => s.id === userData.selectedSkin) || SKINS[0];
}

function saveUserData(uid) {
    update(ref(database, 'profiles/' + uid), userData);
}

export const buySkin = (skinId) => {
    if (!currentUser) return { success: false, reason: '로그인이 필요합니다.' };
    let skin = SKINS.find(s => s.id === skinId);
    if (!skin) return { success: false, reason: '존재하지 않는 스킨입니다.' };
    if (userData.ownedSkins.includes(skinId)) return { success: false, reason: '이미 보유 중입니다.' };
    if (userData.totalScore < skin.price) return { success: false, reason: '포인트가 부족합니다.' };

    userData.totalScore -= skin.price;
    userData.ownedSkins.push(skinId);
    saveUserData(currentUser.uid);
    updateLobbyUI();
    return { success: true };
};

export const selectSkin = (skinId) => {
    if (!userData.ownedSkins.includes(skinId)) return false;
    userData.selectedSkin = skinId;
    currentSkin = SKINS.find(s => s.id === skinId) || SKINS[0];
    if (currentUser) saveUserData(currentUser.uid);
    updateLobbyUI();
    return true;
};

function updateLobbyUI() {
    let el = document.getElementById('user-points');
    if (el) el.textContent = userData.totalScore + 'P';

    let grid = document.getElementById('skin-grid');
    if (!grid) return;
    grid.innerHTML = '';
    SKINS.forEach(skin => {
        let owned = userData.ownedSkins.includes(skin.id);
        let selected = userData.selectedSkin === skin.id;
        let div = document.createElement('div');
        div.className = 'skin-card' + (selected ? ' selected' : '') + (!owned ? ' locked' : '');
        div.innerHTML =
            '<div class="skin-preview" style="' + (skin.glow ? 'box-shadow:0 0 16px ' + skin.glow : '') + '">' +
                '<img src="img/char.png" width="36" height="36">' +
            '</div>' +
            '<div class="skin-name">' + skin.name + '</div>' +
            (owned
                ? (selected ? '<div class="skin-status selected-label">착용중</div>' : '<div class="skin-status equip-btn">착용</div>')
                : '<div class="skin-status buy-btn">' + skin.price + 'P</div>'
            );

        div.addEventListener('click', () => {
            if (owned && !selected) {
                window.selectSkinAction(skin.id);
            } else if (!owned) {
                window.buySkinAction(skin.id);
            }
        });
        grid.appendChild(div);
    });
}

export { updateLobbyUI };

// ── Firebase 초기화 ──

const load = () => {
    if (!setting.firebaseConfig.apiKey) {
        console.warn("Firebase 설정이 비어있습니다. js/setting.js를 확인하세요.");
        return;
    }

    firebase = initializeApp(setting.firebaseConfig);
    database = getDatabase(firebase);
    auth = getAuth(firebase);

    // 로그인 상태 감지
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            await loadUserData(user.uid);
            document.getElementById('nickname').value = user.displayName || '';
            document.getElementById('login-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = 'block';
            document.getElementById('user-info').style.display = 'flex';
            document.getElementById('skin-shop').style.display = 'block';
            updateLobbyUI();
        } else {
            document.getElementById('login-btn').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'none';
            document.getElementById('user-info').style.display = 'none';
            document.getElementById('skin-shop').style.display = 'none';
        }
    });

    const dbRef = ref(getDatabase());
    get(child(dbRef, 'users')).then((snapshot) => {
        if (snapshot.exists()) {
            allScores = Object.entries(snapshot.val()).sort((a, b) => b[1].value - a[1].value);
        }
    }).catch((error) => {
        console.error(error);
    });
};

load();
