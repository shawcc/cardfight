// ============ 动画引擎 - 奥特曼卡片大战 ============
// BattleAnimationEngine: 负责战斗画面渲染
// 包含：程序化绘制的奥特曼/怪兽角色、技能特效、粒子系统、屏幕震动

class BattleAnimationEngine {
  constructor(canvas, leftCard, rightCard) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.leftCard = leftCard;
    this.rightCard = rightCard;
    this.running = false;
    this.particles = [];
    this.effects = [];
    this.damageFloats = [];
    this.absorbing = false;
    this.absorbProgress = 0;
    this.shakeIntensity = 0;
    this.shakeDecay = 0.9;
    this.frame = 0;
    this.lastTime = 0;
    this.onBattleEnd = null;
    this.currentSkillName = '';

    this.setupCanvas();
  }

  setupCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.w = rect.width;
    this.h = rect.height;

    // 角色位置
    this.leftPos = { x: this.w * 0.22, y: this.h * 0.55 };
    this.rightPos = { x: this.w * 0.78, y: this.h * 0.55 };

    // 角色动画状态
    this.leftChar = {
      offset: 0,
      shake: 0,
      scale: 1,
      color: this.leftCard.color,
      isHero: this.leftCard.type === 'hero',
      opacity: 1,
      hitFlash: 0,
      absorbed: false,
      name: this.leftCard.name,
      hp: this.leftCard.hp || 100,
      maxHp: this.leftCard.maxHp || 100
    };
    this.rightChar = {
      offset: 0,
      shake: 0,
      scale: 1,
      color: this.rightCard.color,
      isHero: this.rightCard.type === 'hero',
      opacity: 1,
      hitFlash: 0,
      absorbed: false,
      name: this.rightCard.name,
      hp: this.rightCard.hp || 100,
      maxHp: this.rightCard.maxHp || 100
    };
  }

  start() {
    this.running = true;
    this.loop();
  }

  stop() {
    this.running = false;
  }

  loop(now = 0) {
    if (!this.running) return;
    const dt = Math.min(32, now - this.lastTime);
    this.lastTime = now;
    this.frame++;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    // 更新粒子
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity || 0;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      return p.life > 0;
    });

    // 更新特效（光束等）
    this.effects = this.effects.filter(e => {
      e.life -= dt;
      if (e.progress !== undefined) e.progress += dt / e.duration;
      return e.life > 0;
    });

    // 更新伤害飘字
    this.damageFloats = this.damageFloats.filter(d => {
      d.y -= 1.2;
      d.life -= dt;
      d.alpha = Math.max(0, d.life / d.maxLife);
      return d.life > 0;
    });

    // 更新屏幕震动
    if (this.shakeIntensity > 0.1) {
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
    }

    // 角色闲置呼吸动画
    this.leftChar.offset = Math.sin(this.frame * 0.04) * 3;
    this.rightChar.offset = Math.sin(this.frame * 0.04 + 1.5) * 3;

    // 击中闪烁衰减
    if (this.leftChar.hitFlash > 0) this.leftChar.hitFlash -= 0.05;
    if (this.rightChar.hitFlash > 0) this.rightChar.hitFlash -= 0.05;

    // 吸收状态处理
    if (this.absorbing) {
      this.absorbProgress = Math.min(1, this.absorbProgress + dt * 0.003);
      // 在被吸收者位置产生旋涡粒子
      if (this.frame % 2 === 0) {
        const source = this.absorbSource === 'left' ? this.leftPos : this.rightPos;
        for (let i = 0; i < 3; i++) {
          const angle = (this.frame * 0.2 + i * 2.1) % (Math.PI * 2);
          const radius = 30 + (this.frame % 30);
          this.particles.push({
            x: source.x + Math.cos(angle) * radius,
            y: source.y + Math.sin(angle) * radius,
            vx: -Math.cos(angle) * 1.5,
            vy: -Math.sin(angle) * 1.5,
            size: 3 + Math.random() * 2,
            life: 600,
            maxLife: 600,
            color: '#e9d5ff',
            alpha: 1,
            gravity: 0
          });
        }
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    // 屏幕震动偏移
    let ox = 0, oy = 0;
    if (this.shakeIntensity > 0) {
      ox = (Math.random() - 0.5) * this.shakeIntensity;
      oy = (Math.random() - 0.5) * this.shakeIntensity;
    }
    ctx.save();
    ctx.translate(ox, oy);

    // 背景 - 能量网格
    this.drawBackground(ctx);

    // 角色阴影
    this.drawShadow(ctx, this.leftPos.x, this.h * 0.85, 40);
    this.drawShadow(ctx, this.rightPos.x, this.h * 0.85, 40);

    // 绘制角色（根据吸收状态）
    if (!this.leftChar.absorbed) {
      this.drawCharacter(ctx, this.leftPos.x, this.leftPos.y + this.leftChar.offset, this.leftChar);
    }
    if (!this.rightChar.absorbed) {
      this.drawCharacter(ctx, this.rightPos.x, this.rightPos.y + this.rightChar.offset, this.rightChar);
    }

    // 吸收漩涡
    if (this.absorbing) {
      const target = this.absorbSource === 'left' ? this.leftPos : this.rightPos;
      this.drawAbsorbVortex(ctx, target.x, target.y);
    }

    // 绘制特效（光束/爆裂）
    this.effects.forEach(e => {
      if (e.type === 'beam') this.drawBeamEffect(ctx, e);
      else if (e.type === 'explosion') this.drawExplosionEffect(ctx, e);
      else if (e.type === 'strike') this.drawStrikeEffect(ctx, e);
    });

    // 粒子
    this.particles.forEach(p => {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // 伤害飘字
    this.damageFloats.forEach(d => {
      ctx.globalAlpha = d.alpha;
      ctx.font = `900 ${d.size}px "Orbitron", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(d.text, d.x, d.y);
      ctx.fillStyle = d.color;
      ctx.shadowColor = d.color;
      ctx.shadowBlur = 15;
      ctx.fillText(d.text, d.x, d.y);
      ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // app.js 调用 render()，这里作为 draw() 的别名
  render() {
    if (!this.running) return;
    this.draw();
  }

  drawBackground(ctx) {
    // 底部能量线
    const gradient = ctx.createLinearGradient(0, this.h * 0.7, 0, this.h);
    gradient.addColorStop(0, 'rgba(0, 212, 255, 0)');
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0.12)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, this.h * 0.7, this.w, this.h * 0.3);

    // 地平线
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.h * 0.85);
    ctx.lineTo(this.w, this.h * 0.85);
    ctx.stroke();

    // 网格线
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, this.h * 0.85);
      ctx.lineTo(x * 0.3 + this.w * 0.35, this.h);
      ctx.stroke();
    }

    // 流动的能量粒子
    if (this.frame % 6 === 0) {
      this.particles.push({
        x: Math.random() * this.w,
        y: this.h * 0.85,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -1 - Math.random(),
        size: 1.5,
        life: 1500,
        maxLife: 1500,
        color: 'rgba(0, 212, 255, 0.6)',
        alpha: 1,
        gravity: 0
      });
    }
  }

  drawShadow(ctx, x, y, size) {
    const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
    grad.addColorStop(0, 'rgba(0,0,0,0.6)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCharacter(ctx, x, y, char) {
    ctx.save();
    ctx.globalAlpha = char.opacity;

    const bob = Math.sin(this.frame * 0.08) * 2;

    // 角色整体光晕
    const glowGrad = ctx.createRadialGradient(x, y + bob, 20, x, y + bob, 90);
    glowGrad.addColorStop(0, hexToRgba(char.color, 0.3));
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, y + bob, 90, 0, Math.PI * 2);
    ctx.fill();

    // 击中白色闪烁叠加
    if (char.hitFlash > 0.1) {
      ctx.globalAlpha = char.opacity * char.hitFlash;
    }

    // 根据类型绘制
    if (char.name && char.name.includes('加恩Q')) {
      this.drawGanQ(ctx, x, y + bob, char);
    } else if (char.isHero) {
      this.drawUltraman(ctx, x, y + bob, char);
    } else {
      this.drawMonster(ctx, x, y + bob, char);
    }

    // 白色闪烁叠加（被击中）
    if (char.hitFlash > 0.1) {
      ctx.globalAlpha = char.hitFlash * 0.7;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x, y + bob, 60, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // ============ 奥特曼绘制 - 精细版 ============
  drawUltraman(ctx, x, y, char) {
    const c = char.color;
    const t = this.frame * 0.08;
    const bob = Math.sin(t) * 1.5;

    // ====== 腿部 ======
    // 左腿
    this.drawUltramanLeg(ctx, x - 10, y + 25 + bob, c, -0.05);
    // 右腿
    this.drawUltramanLeg(ctx, x + 10, y + 25 + bob, c, 0.05);

    // ====== 躯干 ======
    this.drawUltramanTorso(ctx, x, y + bob, c);

    // ====== 手臂 ======
    // 左臂
    this.drawUltramanArm(ctx, x - 25, y - 5 + bob, c, 0.2);
    // 右臂
    this.drawUltramanArm(ctx, x + 25, y - 5 + bob, c, -0.2);

    // ====== 头部 ======
    this.drawUltramanHead(ctx, x, y - 45 + bob, c, char);

    // ====== 彩色计时器（胸灯） ======
    this.drawColorTimer(ctx, x, y - 5 + bob, char);
  }

  // 奥特曼腿部
  drawUltramanLeg(ctx, x, y, c, tilt) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    // 大腿 - 银色金属渐变
    const thighGrad = ctx.createLinearGradient(-8, -5, 8, 45);
    thighGrad.addColorStop(0, '#f5f5f5');
    thighGrad.addColorStop(0.5, '#c0c0c0');
    thighGrad.addColorStop(1, '#7a7a7a');

    ctx.fillStyle = thighGrad;
    ctx.beginPath();
    ctx.moveTo(-8, -10);
    ctx.quadraticCurveTo(-10, 15, -7, 25);
    ctx.lineTo(7, 25);
    ctx.quadraticCurveTo(10, 15, 8, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 大腿红色装饰线
    ctx.fillStyle = c;
    ctx.fillRect(-7, 8, 14, 4);

    // 膝盖关节
    ctx.fillStyle = '#b0b0b0';
    ctx.beginPath();
    ctx.arc(0, 25, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 小腿
    const calfGrad = ctx.createLinearGradient(-6, 25, 6, 60);
    calfGrad.addColorStop(0, '#e8e8e8');
    calfGrad.addColorStop(0.5, '#a8a8a8');
    calfGrad.addColorStop(1, '#666');

    ctx.fillStyle = calfGrad;
    ctx.beginPath();
    ctx.moveTo(-7, 28);
    ctx.quadraticCurveTo(-9, 45, -6, 55);
    ctx.lineTo(6, 55);
    ctx.quadraticCurveTo(9, 45, 7, 28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 小腿红色装饰
    ctx.fillStyle = c;
    ctx.fillRect(-6, 40, 12, 3);

    // 脚/靴
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.moveTo(-8, 55);
    ctx.quadraticCurveTo(-10, 62, -4, 63);
    ctx.lineTo(10, 63);
    ctx.quadraticCurveTo(12, 60, 8, 55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // 奥特曼手臂
  drawUltramanArm(ctx, x, y, c, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 上臂 - 银色金属
    const upperGrad = ctx.createLinearGradient(-7, -20, 7, 10);
    upperGrad.addColorStop(0, '#f0f0f0');
    upperGrad.addColorStop(0.5, '#bfbfbf');
    upperGrad.addColorStop(1, '#707070');

    ctx.fillStyle = upperGrad;
    ctx.beginPath();
    ctx.moveTo(-6, -15);
    ctx.quadraticCurveTo(-8, 0, -6, 8);
    ctx.lineTo(6, 8);
    ctx.quadraticCurveTo(8, 0, 6, -15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 上臂红色条纹
    ctx.fillStyle = c;
    ctx.fillRect(-5, -5, 10, 3);

    // 肘关节
    ctx.fillStyle = '#a8a8a8';
    ctx.beginPath();
    ctx.arc(0, 10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 前臂
    const foreGrad = ctx.createLinearGradient(-6, 10, 6, 40);
    foreGrad.addColorStop(0, '#e8e8e8');
    foreGrad.addColorStop(0.5, '#a8a8a8');
    foreGrad.addColorStop(1, '#606060');

    ctx.fillStyle = foreGrad;
    ctx.beginPath();
    ctx.moveTo(-5, 12);
    ctx.quadraticCurveTo(-7, 25, -5, 35);
    ctx.lineTo(5, 35);
    ctx.quadraticCurveTo(7, 25, 5, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 前臂红色条纹
    ctx.fillStyle = c;
    ctx.fillRect(-4, 22, 8, 3);

    // 手/拳
    ctx.fillStyle = '#9a9a9a';
    ctx.beginPath();
    ctx.arc(0, 38, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // 奥特曼躯干
  drawUltramanTorso(ctx, x, y, c) {
    // 躯干主体 - 银色金属渐变（突出立体感）
    const torsoGrad = ctx.createRadialGradient(x - 5, y - 15, 5, x, y, 35);
    torsoGrad.addColorStop(0, '#f8f8f8');
    torsoGrad.addColorStop(0.4, '#d0d0d0');
    torsoGrad.addColorStop(0.8, '#9a9a9a');
    torsoGrad.addColorStop(1, '#5a5a5a');

    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.moveTo(x - 22, y - 25);
    ctx.quadraticCurveTo(x - 28, y - 10, x - 25, y + 15);
    ctx.quadraticCurveTo(x - 22, y + 25, x - 12, y + 28);
    ctx.lineTo(x + 12, y + 28);
    ctx.quadraticCurveTo(x + 22, y + 25, x + 25, y + 15);
    ctx.quadraticCurveTo(x + 28, y - 10, x + 22, y - 25);
    ctx.quadraticCurveTo(x, y - 32, x - 22, y - 25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 红色胸甲 - 弧形
    const chestGrad = ctx.createLinearGradient(x - 20, y - 20, x + 20, y + 10);
    chestGrad.addColorStop(0, lightenColor(c, 0.3));
    chestGrad.addColorStop(0.5, c);
    chestGrad.addColorStop(1, darkenColor(c, 0.3));

    ctx.fillStyle = chestGrad;
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 18);
    ctx.quadraticCurveTo(x - 22, y - 5, x - 18, y + 8);
    ctx.lineTo(x - 8, y + 10);
    ctx.quadraticCurveTo(x - 10, y - 5, x - 10, y - 18);
    ctx.quadraticCurveTo(x, y - 25, x + 10, y - 18);
    ctx.quadraticCurveTo(x + 10, y - 5, x + 8, y + 10);
    ctx.lineTo(x + 18, y + 8);
    ctx.quadraticCurveTo(x + 22, y - 5, x + 20, y - 18);
    ctx.quadraticCurveTo(x, y - 28, x - 20, y - 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 胸甲高光
    ctx.fillStyle = hexToRgba('#ffffff', 0.25);
    ctx.beginPath();
    ctx.ellipse(x - 12, y - 10, 3, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 12, y - 10, 3, 6, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 银色中线装饰
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 25);
    ctx.lineTo(x, y - 2);
    ctx.stroke();

    // 腹部银色渐变
    const absGrad = ctx.createLinearGradient(x, y + 5, x, y + 28);
    absGrad.addColorStop(0, '#d8d8d8');
    absGrad.addColorStop(1, '#7a7a7a');
    ctx.fillStyle = absGrad;
    ctx.beginPath();
    ctx.moveTo(x - 14, y + 8);
    ctx.quadraticCurveTo(x - 18, y + 20, x - 12, y + 28);
    ctx.lineTo(x + 12, y + 28);
    ctx.quadraticCurveTo(x + 18, y + 20, x + 14, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.stroke();

    // 腹部肌肉线条
    ctx.strokeStyle = 'rgba(80,80,80,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 8, y + 14);
    ctx.lineTo(x - 6, y + 25);
    ctx.moveTo(x + 8, y + 14);
    ctx.lineTo(x + 6, y + 25);
    ctx.stroke();
  }

  // 奥特曼头部
  drawUltramanHead(ctx, x, y, c, char) {
    // 头部主体 - 椭圆形（更尖的下巴）
    const headGrad = ctx.createRadialGradient(x - 5, y - 10, 3, x, y, 22);
    headGrad.addColorStop(0, '#ffffff');
    headGrad.addColorStop(0.4, '#e0e0e0');
    headGrad.addColorStop(0.8, '#a8a8a8');
    headGrad.addColorStop(1, '#606060');

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.moveTo(x, y - 25);
    ctx.quadraticCurveTo(x - 18, y - 22, x - 16, y - 5);
    ctx.quadraticCurveTo(x - 17, y + 10, x - 8, y + 18);
    ctx.lineTo(x + 8, y + 18);
    ctx.quadraticCurveTo(x + 17, y + 10, x + 16, y - 5);
    ctx.quadraticCurveTo(x + 18, y - 22, x, y - 25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 头部冠饰（crest） - 头顶突出的装饰
    const crestGrad = ctx.createLinearGradient(x, y - 35, x, y - 20);
    crestGrad.addColorStop(0, lightenColor(c, 0.3));
    crestGrad.addColorStop(1, c);

    ctx.fillStyle = crestGrad;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 24);
    ctx.quadraticCurveTo(x - 8, y - 30, x - 3, y - 35);
    ctx.quadraticCurveTo(x, y - 38, x + 3, y - 35);
    ctx.quadraticCurveTo(x + 8, y - 30, x + 6, y - 24);
    ctx.quadraticCurveTo(x, y - 22, x - 6, y - 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 冠饰发光点
    const crestPulse = 0.6 + Math.sin(this.frame * 0.1) * 0.4;
    ctx.fillStyle = hexToRgba(c, crestPulse * 0.8);
    ctx.shadowColor = c;
    ctx.shadowBlur = 10 * crestPulse;
    ctx.beginPath();
    ctx.arc(x, y - 32, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 头部侧面的红色装饰线
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 16, y - 10);
    ctx.lineTo(x - 14, y + 5);
    ctx.moveTo(x + 16, y - 10);
    ctx.lineTo(x + 14, y + 5);
    ctx.stroke();

    // 眼睛 - 发光椭圆形白色（奥特曼标志性眼睛）
    const eyeGlow = 0.7 + Math.sin(this.frame * 0.06) * 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 18 * eyeGlow;

    // 左眼
    ctx.beginPath();
    ctx.ellipse(x - 7, y - 5, 5, 7, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // 右眼
    ctx.beginPath();
    ctx.ellipse(x + 7, y - 5, 5, 7, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛内部蓝色高光
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(135, 206, 250, 0.6)';
    ctx.beginPath();
    ctx.ellipse(x - 7, y - 3, 2, 3, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 7, y - 3, 2, 3, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛黑边轮廓
    ctx.strokeStyle = 'rgba(60,60,60,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x - 7, y - 5, 5, 7, -0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + 7, y - 5, 5, 7, 0.4, 0, Math.PI * 2);
    ctx.stroke();

    // 嘴部线条（细微）
    ctx.strokeStyle = 'rgba(80,80,80,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 3, y + 10);
    ctx.lineTo(x + 3, y + 10);
    ctx.stroke();

    // 颈部
    const neckGrad = ctx.createLinearGradient(x, y + 15, x, y + 30);
    neckGrad.addColorStop(0, '#d0d0d0');
    neckGrad.addColorStop(1, '#808080');
    ctx.fillStyle = neckGrad;
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 18);
    ctx.quadraticCurveTo(x - 9, y + 26, x - 10, y + 30);
    ctx.lineTo(x + 10, y + 30);
    ctx.quadraticCurveTo(x + 9, y + 26, x + 7, y + 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.stroke();
  }

  // 彩色计时器（胸灯）- 根据血量变色
  drawColorTimer(ctx, x, y, char) {
    const hpRatio = char.hp / char.maxHp;
    const t = this.frame * 0.1;
    const pulse = 0.6 + Math.sin(t) * 0.4;

    // 低血量时红色闪烁，正常蓝色
    let timerColor;
    let glowColor;
    if (hpRatio < 0.3) {
      const blink = Math.sin(t * 3) > 0;
      timerColor = blink ? '#ff3838' : '#ff0000';
      glowColor = '#ff3838';
    } else {
      timerColor = '#00d4ff';
      glowColor = '#00d4ff';
    }

    // 胸灯底座（金色边框）
    const baseGrad = ctx.createRadialGradient(x, y, 2, x, y, 12);
    baseGrad.addColorStop(0, '#ffd700');
    baseGrad.addColorStop(0.7, '#b8860b');
    baseGrad.addColorStop(1, '#654321');

    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a4000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 胸灯主体（椭圆形发光）
    const timerGrad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 8);
    timerGrad.addColorStop(0, '#ffffff');
    timerGrad.addColorStop(0.3, timerColor);
    timerGrad.addColorStop(1, darkenColor(timerColor, 0.5));

    ctx.fillStyle = timerGrad;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20 * pulse;
    ctx.beginPath();
    ctx.ellipse(x, y, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 胸灯内部高光
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ============ 怪兽绘制 - 精细版 ============
  drawMonster(ctx, x, y, char) {
    const c = char.color;
    const t = this.frame * 0.06;
    const bob = Math.sin(t) * 2;

    // ====== 腿部 ======
    this.drawMonsterLeg(ctx, x - 15, y + 30 + bob, c, -0.1);
    this.drawMonsterLeg(ctx, x + 15, y + 30 + bob, c, 0.1);

    // ====== 躯干 ======
    this.drawMonsterTorso(ctx, x, y + bob, c);

    // ====== 手臂 ======
    this.drawMonsterArm(ctx, x - 40, y + 5 + bob, c, 0.3);
    this.drawMonsterArm(ctx, x + 40, y + 5 + bob, c, -0.3);

    // ====== 头部 ======
    this.drawMonsterHead(ctx, x, y - 35 + bob, c);

    // ====== 背部尖刺 ======
    this.drawMonsterSpikes(ctx, x, y - 10 + bob, c);
  }

  // 怪兽腿部
  drawMonsterLeg(ctx, x, y, c, tilt) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    // 粗壮大腿 - 暗色渐变
    const thighGrad = ctx.createLinearGradient(-12, -15, 12, 20);
    thighGrad.addColorStop(0, lightenColor(c, 0.2));
    thighGrad.addColorStop(0.5, c);
    thighGrad.addColorStop(1, darkenColor(c, 0.4));

    ctx.fillStyle = thighGrad;
    ctx.beginPath();
    ctx.moveTo(-12, -18);
    ctx.quadraticCurveTo(-16, 5, -10, 20);
    ctx.lineTo(10, 20);
    ctx.quadraticCurveTo(16, 5, 12, -18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 大腿角质纹理
    ctx.strokeStyle = hexToRgba('#000000', 0.3);
    ctx.lineWidth = 1;
    for (let i = -8; i < 10; i += 5) {
      ctx.beginPath();
      ctx.moveTo(-10 + i * 0.2, i);
      ctx.lineTo(10 - i * 0.2, i);
      ctx.stroke();
    }

    // 小腿（更粗壮）
    const calfGrad = ctx.createLinearGradient(-10, 18, 10, 55);
    calfGrad.addColorStop(0, lightenColor(c, 0.1));
    calfGrad.addColorStop(0.5, darkenColor(c, 0.2));
    calfGrad.addColorStop(1, darkenColor(c, 0.5));

    ctx.fillStyle = calfGrad;
    ctx.beginPath();
    ctx.moveTo(-11, 20);
    ctx.quadraticCurveTo(-18, 35, -10, 50);
    ctx.lineTo(10, 50);
    ctx.quadraticCurveTo(18, 35, 11, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 脚爪（三爪）
    ctx.fillStyle = '#2a2a2a';
    // 脚掌
    ctx.beginPath();
    ctx.ellipse(0, 52, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 爪子
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(-12, 50);
    ctx.lineTo(-15, 60);
    ctx.lineTo(-9, 55);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-2, 50);
    ctx.lineTo(0, 62);
    ctx.lineTo(3, 55);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 50);
    ctx.lineTo(15, 60);
    ctx.lineTo(9, 55);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // 怪兽手臂
  drawMonsterArm(ctx, x, y, c, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 粗壮上臂
    const upperGrad = ctx.createLinearGradient(-10, -20, 10, 15);
    upperGrad.addColorStop(0, lightenColor(c, 0.2));
    upperGrad.addColorStop(0.5, c);
    upperGrad.addColorStop(1, darkenColor(c, 0.4));

    ctx.fillStyle = upperGrad;
    ctx.beginPath();
    ctx.moveTo(-9, -20);
    ctx.quadraticCurveTo(-14, 0, -9, 15);
    ctx.lineTo(9, 15);
    ctx.quadraticCurveTo(14, 0, 9, -20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 前臂（粗壮）
    const foreGrad = ctx.createLinearGradient(-8, 15, 8, 45);
    foreGrad.addColorStop(0, lightenColor(c, 0.15));
    foreGrad.addColorStop(0.5, darkenColor(c, 0.15));
    foreGrad.addColorStop(1, darkenColor(c, 0.5));

    ctx.fillStyle = foreGrad;
    ctx.beginPath();
    ctx.moveTo(-8, 17);
    ctx.quadraticCurveTo(-12, 30, -8, 42);
    ctx.lineTo(8, 42);
    ctx.quadraticCurveTo(12, 30, 8, 17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 尖锐爪子（五指爪）
    ctx.fillStyle = '#1a1a1a';
    // 手掌
    ctx.beginPath();
    ctx.ellipse(0, 45, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 五根尖爪
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.moveTo(i * 3, 48);
      ctx.lineTo(i * 3 + 1, 58 + Math.abs(i));
      ctx.lineTo(i * 3 + 3, 49);
      ctx.closePath();
      ctx.fill();
      // 爪尖高光
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.moveTo(i * 3 + 1, 56 + Math.abs(i));
      ctx.lineTo(i * 3 + 1.5, 58 + Math.abs(i));
      ctx.lineTo(i * 3 + 2, 50);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // 怪兽躯干
  drawMonsterTorso(ctx, x, y, c) {
    // 粗壮不规则身体
    const torsoGrad = ctx.createRadialGradient(x - 5, y - 15, 5, x, y + 5, 45);
    torsoGrad.addColorStop(0, lightenColor(c, 0.25));
    torsoGrad.addColorStop(0.4, c);
    torsoGrad.addColorStop(0.8, darkenColor(c, 0.3));
    torsoGrad.addColorStop(1, darkenColor(c, 0.55));

    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    // 不规则身体轮廓
    ctx.moveTo(x - 30, y - 25);
    ctx.quadraticCurveTo(x - 45, y - 15, x - 38, y + 5);
    ctx.quadraticCurveTo(x - 45, y + 20, x - 30, y + 28);
    ctx.quadraticCurveTo(x - 35, y + 35, x - 20, y + 32);
    ctx.lineTo(x + 20, y + 32);
    ctx.quadraticCurveTo(x + 35, y + 35, x + 30, y + 28);
    ctx.quadraticCurveTo(x + 45, y + 20, x + 38, y + 5);
    ctx.quadraticCurveTo(x + 45, y - 15, x + 30, y - 25);
    ctx.quadraticCurveTo(x, y - 35, x - 30, y - 25);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 胸部坚硬外壳
    const shellGrad = ctx.createLinearGradient(x - 25, y - 15, x + 25, y + 15);
    shellGrad.addColorStop(0, lightenColor(c, 0.15));
    shellGrad.addColorStop(0.5, darkenColor(c, 0.1));
    shellGrad.addColorStop(1, darkenColor(c, 0.3));

    ctx.fillStyle = shellGrad;
    ctx.beginPath();
    ctx.moveTo(x - 25, y - 20);
    ctx.quadraticCurveTo(x - 28, y + 5, x - 20, y + 20);
    ctx.lineTo(x - 10, y + 22);
    ctx.quadraticCurveTo(x - 12, y - 5, x - 10, y - 22);
    ctx.quadraticCurveTo(x, y - 28, x + 10, y - 22);
    ctx.quadraticCurveTo(x + 12, y - 5, x + 10, y + 22);
    ctx.lineTo(x + 20, y + 20);
    ctx.quadraticCurveTo(x + 28, y + 5, x + 25, y - 20);
    ctx.quadraticCurveTo(x, y - 30, x - 25, y - 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 胸甲骨纹
    ctx.strokeStyle = hexToRgba('#000000', 0.4);
    ctx.lineWidth = 1.5;
    // 分割线
    ctx.beginPath();
    ctx.moveTo(x, y - 25);
    ctx.lineTo(x, y + 20);
    ctx.stroke();

    // 横向骨纹
    for (let i = -15; i <= 10; i += 8) {
      ctx.beginPath();
      ctx.moveTo(x - 20, y + i);
      ctx.lineTo(x - 5, y + i - 2);
      ctx.moveTo(x + 5, y + i - 2);
      ctx.lineTo(x + 20, y + i);
      ctx.stroke();
    }

    // 腹部深色区域
    const bellyGrad = ctx.createLinearGradient(x, y + 15, x, y + 35);
    bellyGrad.addColorStop(0, darkenColor(c, 0.3));
    bellyGrad.addColorStop(1, darkenColor(c, 0.6));
    ctx.fillStyle = bellyGrad;
    ctx.beginPath();
    ctx.moveTo(x - 18, y + 18);
    ctx.quadraticCurveTo(x - 25, y + 30, x - 15, y + 33);
    ctx.lineTo(x + 15, y + 33);
    ctx.quadraticCurveTo(x + 25, y + 30, x + 18, y + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 腹部鳞片纹理
    ctx.fillStyle = hexToRgba('#000000', 0.25);
    for (let row = 0; row < 3; row++) {
      for (let col = -2; col <= 2; col++) {
        const sx = x + col * 6 + (row % 2) * 3;
        const sy = y + 22 + row * 5;
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 怪兽头部
  drawMonsterHead(ctx, x, y, c) {
    const t = this.frame * 0.08;

    // 头部主体 - 不规则凶猛形状
    const headGrad = ctx.createRadialGradient(x - 5, y - 8, 3, x, y + 3, 28);
    headGrad.addColorStop(0, lightenColor(c, 0.3));
    headGrad.addColorStop(0.4, c);
    headGrad.addColorStop(0.8, darkenColor(c, 0.3));
    headGrad.addColorStop(1, darkenColor(c, 0.6));

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    // 不规则头部
    ctx.moveTo(x, y - 28);
    ctx.quadraticCurveTo(x - 25, y - 25, x - 22, y - 10);
    ctx.quadraticCurveTo(x - 28, y + 5, x - 18, y + 15);
    ctx.quadraticCurveTo(x - 12, y + 20, x - 5, y + 18);
    ctx.lineTo(x + 5, y + 18);
    ctx.quadraticCurveTo(x + 12, y + 20, x + 18, y + 15);
    ctx.quadraticCurveTo(x + 28, y + 5, x + 22, y - 10);
    ctx.quadraticCurveTo(x + 25, y - 25, x, y - 28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 头顶角/突起
    ctx.fillStyle = darkenColor(c, 0.4);
    // 左角
    ctx.beginPath();
    ctx.moveTo(x - 15, y - 25);
    ctx.quadraticCurveTo(x - 22, y - 38, x - 12, y - 35);
    ctx.quadraticCurveTo(x - 10, y - 28, x - 15, y - 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 右角
    ctx.beginPath();
    ctx.moveTo(x + 15, y - 25);
    ctx.quadraticCurveTo(x + 22, y - 38, x + 12, y - 35);
    ctx.quadraticCurveTo(x + 10, y - 28, x + 15, y - 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 中央突起
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 28);
    ctx.quadraticCurveTo(x, y - 40, x + 5, y - 28);
    ctx.lineTo(x + 3, y - 26);
    ctx.lineTo(x - 3, y - 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 眉骨（突出）
    ctx.fillStyle = darkenColor(c, 0.2);
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 12);
    ctx.quadraticCurveTo(x - 12, y - 18, x - 5, y - 14);
    ctx.lineTo(x - 5, y - 10);
    ctx.quadraticCurveTo(x - 12, y - 13, x - 20, y - 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 20, y - 12);
    ctx.quadraticCurveTo(x + 12, y - 18, x + 5, y - 14);
    ctx.lineTo(x + 5, y - 10);
    ctx.quadraticCurveTo(x + 12, y - 13, x + 20, y - 8);
    ctx.closePath();
    ctx.fill();

    // 眼睛 - 发光红色（邪恶感）
    const eyeGlow = 0.6 + Math.sin(t * 2) * 0.4;
    // 左眼窝
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(x - 10, y - 8, 6, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // 右眼窝
    ctx.beginPath();
    ctx.ellipse(x + 10, y - 8, 6, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 红色发光眼球
    ctx.fillStyle = '#ff3838';
    ctx.shadowColor = '#ff3838';
    ctx.shadowBlur = 15 * eyeGlow;
    ctx.beginPath();
    ctx.arc(x - 10, y - 7, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 10, y - 7, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 瞳孔（黑色纵向）
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x - 10, y - 7, 1.2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 10, y - 7, 1.2, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛高光
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(x - 11, y - 8, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 9, y - 8, 1, 0, Math.PI * 2);
    ctx.fill();

    // 鼻部（突出）
    ctx.fillStyle = darkenColor(c, 0.2);
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 3);
    ctx.lineTo(x - 6, y + 5);
    ctx.lineTo(x + 6, y + 5);
    ctx.lineTo(x + 4, y - 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 鼻孔
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(x - 2, y + 2, 1, 0, Math.PI * 2);
    ctx.arc(x + 2, y + 2, 1, 0, Math.PI * 2);
    ctx.fill();

    // 嘴巴（张开露出獠牙）
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 上排獠牙
    ctx.fillStyle = '#f5f5dc';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 3 - 1, y + 8);
      ctx.lineTo(x + i * 3, y + 14);
      ctx.lineTo(x + i * 3 + 1, y + 8);
      ctx.closePath();
      ctx.fill();
    }

    // 下排獠牙
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 3 - 1, y + 16);
      ctx.lineTo(x + i * 3, y + 11);
      ctx.lineTo(x + i * 3 + 1, y + 16);
      ctx.closePath();
      ctx.fill();
    }

    // 头部鳞片纹理
    ctx.strokeStyle = hexToRgba('#000000', 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 15);
    ctx.lineTo(x - 10, y - 12);
    ctx.lineTo(x - 5, y - 15);
    ctx.moveTo(x + 5, y - 15);
    ctx.lineTo(x + 10, y - 12);
    ctx.lineTo(x + 18, y - 15);
    ctx.stroke();
  }

  // 怪兽背部尖刺
  drawMonsterSpikes(ctx, x, y, c) {
    // 从头顶到背部的一排尖刺
    const spikeColor = darkenColor(c, 0.5);
    const spikeHighlight = lightenColor(c, 0.2);

    for (let i = -2; i <= 2; i++) {
      const sx = x + i * 14;
      const baseY = y - 30 - Math.abs(i) * 5;
      const height = 15 + (2 - Math.abs(i)) * 3;

      // 尖刺主体
      const spikeGrad = ctx.createLinearGradient(sx, baseY - height, sx, baseY + 5);
      spikeGrad.addColorStop(0, spikeHighlight);
      spikeGrad.addColorStop(0.5, c);
      spikeGrad.addColorStop(1, spikeColor);

      ctx.fillStyle = spikeGrad;
      ctx.beginPath();
      ctx.moveTo(sx - 6, baseY + 5);
      ctx.quadraticCurveTo(sx - 8, baseY - 5, sx - 2, baseY - height);
      ctx.quadraticCurveTo(sx, baseY - height - 3, sx + 2, baseY - height);
      ctx.quadraticCurveTo(sx + 8, baseY - 5, sx + 6, baseY + 5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 尖刺高光
      ctx.fillStyle = hexToRgba('#ffffff', 0.3);
      ctx.beginPath();
      ctx.moveTo(sx - 3, baseY - 2);
      ctx.lineTo(sx - 1, baseY - height + 3);
      ctx.lineTo(sx, baseY - height + 5);
      ctx.lineTo(sx - 1, baseY);
      ctx.closePath();
      ctx.fill();
    }

    // 两侧小突起
    for (let i = -1; i <= 1; i += 2) {
      const sx = x + i * 28;
      const sy = y - 15;

      ctx.fillStyle = darkenColor(c, 0.35);
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy + 5);
      ctx.quadraticCurveTo(sx - 5, sy - 5, sx, sy - 12);
      ctx.quadraticCurveTo(sx + 5, sy - 5, sx + 4, sy + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // ============ 加恩Q - 增强版 ============
  drawGanQ(ctx, x, y, char) {
    const t = this.frame * 0.05;
    const pulse = 0.85 + Math.sin(t * 2) * 0.15;

    // ====== 触手（在身体后面） ======
    this.drawGanQTentacles(ctx, x, y + 5, t);

    // ====== 主身体 - 大圆球形 ======
    this.drawGanQBody(ctx, x, y + 5, pulse, t);

    // ====== 大嘴 ======
    this.drawGanQMouth(ctx, x, y + 20, pulse);

    // ====== 中央大眼 ======
    this.drawGanQEye(ctx, x, y - 15, pulse, t);

    // ====== 吸收状态紫色能量漩涡 ======
    if (this.absorbing) {
      this.drawGanQAbsorbGlow(ctx, x, y + 5, t);
    }
  }

  // 加恩Q触手
  drawGanQTentacles(ctx, x, y, t) {
    for (let i = 0; i < 8; i++) {
      const baseAngle = (i / 8) * Math.PI * 2;
      const waveAngle = baseAngle + Math.sin(t + i) * 0.3;
      const dist = 45 + Math.sin(t * 2 + i) * 8;

      const tx = x + Math.cos(waveAngle) * dist;
      const ty = y + Math.sin(waveAngle) * dist * 0.9;

      // 触手身体 - 从中心到尖端的渐变
      const tentGrad = ctx.createLinearGradient(x, y, tx, ty);
      tentGrad.addColorStop(0, '#3d4a4f');
      tentGrad.addColorStop(1, '#1a1f22');

      ctx.strokeStyle = tentGrad;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(baseAngle) * 35, y + Math.sin(baseAngle) * 35);
      // 弯曲的触手
      const midX = x + Math.cos(waveAngle) * dist * 0.6 + Math.sin(t + i * 0.5) * 5;
      const midY = y + Math.sin(waveAngle) * dist * 0.9 * 0.6 + Math.cos(t + i * 0.5) * 5;
      ctx.quadraticCurveTo(midX, midY, tx, ty);
      ctx.stroke();

      // 触手吸盘
      const suckers = 3;
      for (let s = 1; s <= suckers; s++) {
        const sr = s / (suckers + 1);
        const sux = x + Math.cos(waveAngle) * dist * sr + Math.sin(t + i) * 3;
        const suy = y + Math.sin(waveAngle) * dist * 0.9 * sr + Math.cos(t + i) * 3;

        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.arc(sux, suy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff3838';
        ctx.beginPath();
        ctx.arc(sux, suy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 触手尖端（红色尖刺）
      ctx.fillStyle = '#e74c3c';
      ctx.shadowColor = '#ff5555';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(tx, ty, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 尖刺中心
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(tx, ty, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 加恩Q主身体
  drawGanQBody(ctx, x, y, pulse, t) {
    // 外发光
    const outerGlow = ctx.createRadialGradient(x, y, 30, x, y, 65);
    outerGlow.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
    outerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(x, y, 65 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // 主体 - 深色球体
    const bodyGrad = ctx.createRadialGradient(x - 15, y - 15, 5, x, y, 50);
    bodyGrad.addColorStop(0, '#5a6070');
    bodyGrad.addColorStop(0.3, '#3d4555');
    bodyGrad.addColorStop(0.7, '#1f2636');
    bodyGrad.addColorStop(1, '#0d1220');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(x, y, 48 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 身体上的小突起/疙瘩
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + t * 0.1;
      const dist = 38 * pulse;
      const bx = x + Math.cos(angle) * dist;
      const by = y + Math.sin(angle) * dist;

      ctx.fillStyle = '#2a3240';
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0a0a0a';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 疙瘩上的小尖刺
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 身体高光
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(x - 15, y - 18, 10, 15, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // 深色阴影
    const shadowGrad = ctx.createRadialGradient(x + 15, y + 15, 5, x + 15, y + 15, 35);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.arc(x, y, 48 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // 加恩Q大嘴
  drawGanQMouth(ctx, x, y, pulse) {
    // 大嘴外部（深色）
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(x, y, 28, 12 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // 嘴唇（紫红色）
    const lipGrad = ctx.createLinearGradient(x, y - 10, x, y + 10);
    lipGrad.addColorStop(0, '#8b0000');
    lipGrad.addColorStop(0.5, '#e74c3c');
    lipGrad.addColorStop(1, '#8b0000');
    ctx.strokeStyle = lipGrad;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(x, y, 28, 12 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 嘴内红色发光
    const innerGrad = ctx.createRadialGradient(x, y, 2, x, y, 22);
    innerGrad.addColorStop(0, '#ff6b6b');
    innerGrad.addColorStop(0.6, '#c0392b');
    innerGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = innerGrad;
    ctx.shadowColor = '#ff3838';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 9 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 上排尖牙（锋利）
    ctx.fillStyle = '#f5f5dc';
    for (let i = -3; i <= 3; i++) {
      const tx = x + i * 7;
      const ty = y - 8 * pulse;
      ctx.beginPath();
      ctx.moveTo(tx - 3, ty);
      ctx.lineTo(tx, ty + 8 + Math.abs(i));
      ctx.lineTo(tx + 3, ty);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8b7355';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // 下排尖牙
    for (let i = -3; i <= 3; i++) {
      const tx = x + i * 7;
      const ty = y + 8 * pulse;
      ctx.beginPath();
      ctx.moveTo(tx - 3, ty);
      ctx.lineTo(tx, ty - 8 - Math.abs(i));
      ctx.lineTo(tx + 3, ty);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8b7355';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // 嘴中央暗部（咽喉）
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y, 8, 4 * pulse, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 加恩Q中央大眼
  drawGanQEye(ctx, x, y, pulse, t) {
    const eyeGlow = 0.6 + Math.sin(t * 3) * 0.4;

    // 眼眶（深色）
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(x, y, 20 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3d4555';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 眼白部分（红色外圈）
    const eyeGrad = ctx.createRadialGradient(x, y, 5, x, y, 18);
    eyeGrad.addColorStop(0, '#ff5555');
    eyeGrad.addColorStop(0.7, '#e74c3c');
    eyeGrad.addColorStop(1, '#8b0000');
    ctx.fillStyle = eyeGrad;
    ctx.shadowColor = '#ff3838';
    ctx.shadowBlur = 25 * eyeGlow;
    ctx.beginPath();
    ctx.arc(x, y, 16 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 巨大黑瞳
    const pupilGrad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 10);
    pupilGrad.addColorStop(0, '#3d0000');
    pupilGrad.addColorStop(0.6, '#1a0000');
    pupilGrad.addColorStop(1, '#000');
    ctx.fillStyle = pupilGrad;
    ctx.beginPath();
    ctx.arc(x, y, 10 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // 瞳孔内的诡异图案（同心圆）
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.5)';
    ctx.lineWidth = 1;
    for (let r = 3; r <= 8; r += 2) {
      ctx.beginPath();
      ctx.arc(x, y, r * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 中央发光点
    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = '#ff3838';
    ctx.shadowBlur = 12 * eyeGlow;
    ctx.beginPath();
    ctx.arc(x, y, 3 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 瞳孔高光（两点，诡异感）
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 3, y - 4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 2, y - 2, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // 加恩Q吸收状态紫色能量
  drawGanQAbsorbGlow(ctx, x, y, t) {
    // 旋转的紫色能量环
    for (let i = 0; i < 4; i++) {
      const ringAngle = t * 2 + i * (Math.PI / 2);
      const ringRadius = 55 + i * 5;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ringAngle);

      const ringGrad = ctx.createRadialGradient(0, 0, ringRadius - 5, 0, 0, ringRadius + 5);
      ringGrad.addColorStop(0, 'transparent');
      ringGrad.addColorStop(0.5, 'rgba(168, 85, 247, 0.7)');
      ringGrad.addColorStop(1, 'transparent');

      ctx.strokeStyle = ringGrad;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 4;
      ctx.beginPath();
      // 弧线能量环
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 1.3);
      ctx.stroke();
      ctx.restore();
    }

    // 紫色能量粒子从身体扩散
    for (let i = 0; i < 6; i++) {
      const angle = t * 3 + (i / 6) * Math.PI * 2;
      const dist = 40 + Math.sin(t * 4 + i) * 15;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;

      ctx.fillStyle = 'rgba(218, 112, 214, 0.9)';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // ============ 吸收漩涡 ============
  drawAbsorbVortex(ctx, x, y) {
    const t = this.frame * 0.1;
    ctx.save();
    ctx.translate(x, y);

    for (let i = 0; i < 5; i++) {
      const radius = 30 + i * 15 + Math.sin(t + i) * 10;
      const alpha = 0.5 - i * 0.08;
      ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.3) {
        const r = radius + Math.sin(a * 3 + t) * 5;
        const px = Math.cos(a + t * 0.5) * r;
        const py = Math.sin(a + t * 0.5) * r;
        if (a === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ============ 光束特效 ============
  drawBeamEffect(ctx, e) {
    const progress = e.progress || 0;
    const from = e.from;
    const to = e.to;

    ctx.save();

    // 蓄力阶段
    if (progress < 0.3) {
      const charge = progress / 0.3;
      const cx = from.x;
      const cy = from.y;
      const size = 15 + charge * 25;

      ctx.shadowColor = e.color;
      ctx.shadowBlur = 30;
      ctx.fillStyle = hexToRgba(e.color, charge * 0.9);
      ctx.beginPath();
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      ctx.fill();

      if (this.frame % 3 === 0) {
        for (let i = 0; i < 4; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * size;
          this.particles.push({
            x: cx + Math.cos(a) * r,
            y: cy + Math.sin(a) * r,
            vx: Math.cos(a) * 2,
            vy: Math.sin(a) * 2,
            size: 2 + Math.random() * 2,
            life: 400,
            maxLife: 400,
            color: e.color,
            alpha: 1,
            gravity: 0
          });
        }
      }
    } else if (progress < 0.7) {
      const fire = (progress - 0.3) / 0.4;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / dist;
      const ny = dy / dist;

      const beamLen = dist * Math.min(1, fire * 1.5);
      const beamWidth = 8 + Math.sin(fire * 10) * 3;

      const grad = ctx.createLinearGradient(from.x, from.y, from.x + nx * beamLen, from.y + ny * beamLen);
      grad.addColorStop(0, hexToRgba(e.color, 1));
      grad.addColorStop(0.7, hexToRgba(e.color, 0.8));
      grad.addColorStop(1, 'transparent');

      ctx.strokeStyle = grad;
      ctx.lineWidth = beamWidth;
      ctx.lineCap = 'round';
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(from.x + nx * beamLen, from.y + ny * beamLen);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = beamWidth * 0.4;
      ctx.shadowBlur = 15;
      ctx.stroke();

      if (fire > 0.7 && this.frame % 2 === 0) {
        const hitX = to.x;
        const hitY = to.y;
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          this.particles.push({
            x: hitX,
            y: hitY,
            vx: Math.cos(a) * 3,
            vy: Math.sin(a) * 3,
            size: 3,
            life: 500,
            maxLife: 500,
            color: e.color,
            alpha: 1,
            gravity: 0
          });
        }
      }
    } else {
      const fade = 1 - (progress - 0.7) / 0.3;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 20 * fade;
      ctx.fillStyle = hexToRgba(e.color, fade * 0.5);
      ctx.beginPath();
      ctx.arc(to.x, to.y, 30 * (1 - fade * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ============ 爆炸特效 ============
  drawExplosionEffect(ctx, e) {
    const progress = e.progress || 0;
    const x = e.x;
    const y = e.y;

    ctx.save();
    const size = 10 + progress * 60;
    const alpha = Math.max(0, 1 - progress);

    ctx.strokeStyle = hexToRgba(e.color, alpha);
    ctx.lineWidth = 4;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = hexToRgba('#fff', alpha * 0.8);
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ============ 打击特效 ============
  drawStrikeEffect(ctx, e) {
    const progress = e.progress || 0;
    if (progress > 1) return;

    ctx.save();
    const x = e.x;
    const y = e.y;

    ctx.strokeStyle = hexToRgba('#fff', Math.max(0, 1 - progress));
    ctx.lineWidth = 5;
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 15;
    const size = 10 + progress * 40;

    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const len = size * 0.7;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * size * 0.3, y + Math.sin(a) * size * 0.3);
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ============ 播放攻击动画 ============
  async playAttackAnimation(attackerSide, skillName, damage, skillType = 'beam') {
    const attacker = attackerSide === 'left' ? this.leftPos : this.rightPos;
    const defender = attackerSide === 'left' ? this.rightPos : this.leftPos;
    const defenderChar = attackerSide === 'left' ? this.rightChar : this.leftChar;

    this.currentSkillName = skillName;
    const color = attackerSide === 'left' ? this.leftCard.color : this.rightCard.color;

    if (skillType === 'absorb') {
      if (window.gameAudio) window.gameAudio.playAbsorb(1.2, 1);
      await this.playAbsorbAnimation(attackerSide);
      return;
    }

    if (window.gameAudio) {
      if (skillType === 'beam') {
        window.gameAudio.playBeam(0.6, 1);
      } else {
        window.gameAudio.playStrike(0.4, 1);
      }
      if (damage > 180) {
        setTimeout(() => { if (window.gameAudio) window.gameAudio.playCritical(); }, 200);
      }
    }

    const duration = 1100;
    const effect = {
      type: skillType === 'strike' ? 'strike' : 'beam',
      from: { x: attacker.x, y: attacker.y },
      to: { x: defender.x, y: defender.y },
      color: color,
      life: duration,
      duration: duration,
      progress: 0
    };
    this.effects.push(effect);

    const attackerChar = attackerSide === 'left' ? this.leftChar : this.rightChar;
    attackerChar.shake = 5;

    await delay(450);

    defenderChar.hitFlash = 1;
    defenderChar.shake = 10;
    this.shakeIntensity = 12;

    if (window.gameAudio) {
      setTimeout(() => window.gameAudio.playExplosion(0.5, 0.8), 0);
    }

    this.effects.push({
      type: 'explosion',
      x: defender.x,
      y: defender.y,
      color: color,
      life: 500,
      duration: 500,
      progress: 0
    });

    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x: defender.x,
        y: defender.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        life: 600,
        maxLife: 600,
        color: Math.random() > 0.5 ? color : '#fff',
        alpha: 1,
        gravity: 0.15
      });
    }

    const isCrit = damage > 150;
    this.damageFloats.push({
      x: defender.x + (Math.random() - 0.5) * 30,
      y: defender.y - 30,
      text: `-${damage}`,
      color: isCrit ? '#ffd93d' : '#ff6b6b',
      size: isCrit ? 32 : 24,
      life: 900,
      maxLife: 900,
      alpha: 1
    });

    await delay(duration - 450);
  }

  // ============ 吸收动画 ============
  async playAbsorbAnimation(attackerSide) {
    const source = attackerSide === 'left' ? this.rightPos : this.leftPos;
    const target = attackerSide === 'left' ? this.leftPos : this.rightPos;
    const sourceChar = attackerSide === 'left' ? this.rightChar : this.leftChar;

    this.absorbing = true;
    this.absorbSource = attackerSide === 'left' ? 'right' : 'left';
    this.absorbProgress = 0;

    const totalDuration = 1800;
    const startTime = performance.now();

    while (performance.now() - startTime < totalDuration) {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / totalDuration;

      sourceChar.opacity = Math.max(0, 1 - progress);
      sourceChar.scale = Math.max(0.1, 1 - progress * 0.9);

      if (this.frame % 2 === 0) {
        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = 20 + Math.random() * 40;
          const tx = source.x + Math.cos(angle) * r;
          const ty = source.y + Math.sin(angle) * r;
          const dx = target.x - tx;
          const dy = target.y - ty;
          this.particles.push({
            x: tx,
            y: ty,
            vx: dx * 0.02,
            vy: dy * 0.02,
            size: 2 + Math.random() * 3,
            life: 500,
            maxLife: 500,
            color: Math.random() > 0.5 ? '#a855f7' : '#e9d5ff',
            alpha: 1,
            gravity: 0
          });
        }
      }

      this.shakeIntensity = 3 + Math.sin(elapsed * 0.02) * 3;
      await delay(16);
    }

    sourceChar.absorbed = true;
    sourceChar.opacity = 0;
    this.absorbing = false;
    this.shakeIntensity = 20;

    this.effects.push({
      type: 'explosion',
      x: target.x,
      y: target.y,
      color: '#a855f7',
      life: 600,
      duration: 600,
      progress: 0
    });

    await delay(500);
  }

  // ============ 体内攻击动画 ============
  async playBodyAttackAnimation(attackerSide, damage) {
    const target = attackerSide === 'left' ? this.rightPos : this.leftPos;

    const duration = 800;
    const startTime = performance.now();

    while (performance.now() - startTime < duration) {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      if (this.frame % 4 === 0) {
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const r = 10 + Math.random() * 40;
          this.particles.push({
            x: target.x + Math.cos(angle) * r,
            y: target.y + Math.sin(angle) * r,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            size: 3 + Math.random() * 2,
            life: 400,
            maxLife: 400,
            color: Math.random() > 0.5 ? '#a855f7' : '#ff6b6b',
            alpha: 1,
            gravity: 0.1
          });
        }
      }
      this.shakeIntensity = 5 + Math.sin(elapsed * 0.03) * 3;
      await delay(16);
    }

    this.damageFloats.push({
      x: target.x,
      y: target.y - 50,
      text: `-${damage}`,
      color: '#a855f7',
      size: 22,
      life: 900,
      maxLife: 900,
      alpha: 1
    });
  }

  // ============ 逃脱动画 ============
  async playEscapeAnimation(attackerSide, damage) {
    const escaper = attackerSide === 'left' ? this.leftChar : this.rightChar;
    const escaperPos = attackerSide === 'left' ? this.leftPos : this.rightPos;

    this.shakeIntensity = 25;
    this.effects.push({
      type: 'explosion',
      x: escaperPos.x,
      y: escaperPos.y,
      color: '#ffd93d',
      life: 1000,
      duration: 1000,
      progress: 0
    });

    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      this.particles.push({
        x: escaperPos.x,
        y: escaperPos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        life: 800,
        maxLife: 800,
        color: Math.random() > 0.5 ? '#ffd93d' : '#fff',
        alpha: 1,
        gravity: 0.2
      });
    }

    escaper.absorbed = false;
    escaper.opacity = 0;

    await delay(300);
    const fadeDuration = 600;
    const fadeStart = performance.now();
    while (performance.now() - fadeStart < fadeDuration) {
      const p = (performance.now() - fadeStart) / fadeDuration;
      escaper.opacity = Math.min(1, p);
      escaper.scale = 0.3 + p * 0.7;
      await delay(16);
    }

    escaper.opacity = 1;
    escaper.scale = 1;

    if (damage > 0) {
      this.damageFloats.push({
        x: escaperPos.x,
        y: escaperPos.y - 40,
        text: `-${damage}`,
        color: '#ffd93d',
        size: 28,
        life: 1000,
        maxLife: 1000,
        alpha: 1
      });
    }

    await delay(400);
  }

  // ============ KO动画 ============
  async playKOAnimation(loserSide) {
    const loser = loserSide === 'left' ? this.leftChar : this.rightChar;
    const loserPos = loserSide === 'left' ? this.leftPos : this.rightPos;
    const color = loserSide === 'left' ? this.leftCard.color : this.rightCard.color;

    this.shakeIntensity = 20;

    if (window.gameAudio) window.gameAudio.playKO(1.5, 1.2);

    this.effects.push({
      type: 'explosion',
      x: loserPos.x,
      y: loserPos.y,
      color: color,
      life: 1500,
      duration: 1500,
      progress: 0
    });

    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      this.particles.push({
        x: loserPos.x,
        y: loserPos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 3 + Math.random() * 5,
        life: 1200,
        maxLife: 1200,
        color: Math.random() > 0.5 ? color : '#fff',
        alpha: 1,
        gravity: 0.2
      });
    }

    this.damageFloats.push({
      x: loserPos.x,
      y: loserPos.y,
      text: 'KO!',
      color: '#ff3838',
      size: 48,
      life: 2000,
      maxLife: 2000,
      alpha: 1
    });

    const fallDuration = 1000;
    const startTime = performance.now();
    while (performance.now() - startTime < fallDuration) {
      const p = (performance.now() - startTime) / fallDuration;
      loser.opacity = Math.max(0, 1 - p);
      await delay(16);
    }
    loser.opacity = 0;

    await delay(500);
  }
}

// ============ 工具函数 ============
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hexToRgba(hex, alpha) {
  if (hex.startsWith('rgb')) {
    return hex.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
  }
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lightenColor(color, amount) {
  const h = color.replace('#', '');
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + amount * 255);
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + amount * 255);
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + amount * 255);
  return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
}

function darkenColor(color, amount) {
  const h = color.replace('#', '');
  const r = Math.max(0, parseInt(h.substring(0, 2), 16) * (1 - amount));
  const g = Math.max(0, parseInt(h.substring(2, 4), 16) * (1 - amount));
  const b = Math.max(0, parseInt(h.substring(4, 6), 16) * (1 - amount));
  return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
}

// 暴露给全局
window.BattleAnimationEngine = BattleAnimationEngine;
window.hexToRgba = hexToRgba;
window.delay = delay;