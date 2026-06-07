// ============ 奥特曼卡片大战 - 主应用逻辑（重制版）============
// 核心流程：
// 1. 首页（menu-screen）：两个卡片槽位（玩家1/玩家2），点击进入扫描页面
// 2. 扫描页面（camera-screen）：调用摄像头或随机抽取，获取卡片
// 3. 更多菜单（小按钮"..."）：显示卡片图鉴、手动选卡
// 4. 手动选卡页面（select-screen）：先选玩家1，再选玩家2
// 5. 战斗页面（battle-screen）：HUD显示双方信息，使用 BattleAnimationEngine

(function () {
  // ============ 状态管理 ============
  const state = {
    currentScreen: 'menu',
    selectedCards: { player1: null, player2: null },
    currentStep: 1,
    currentFilter: 'all',
    battleEngine: null,
    animationFrame: null,
    capturedCard: null,
    currentScanPlayer: 1,
    battleRunning: false,
    screenTransitioning: false,
    moreMenuOpen: false
  };

  // DOM 引用
  const screens = {
    menu: document.getElementById('menu-screen'),
    select: document.getElementById('select-screen'),
    camera: document.getElementById('camera-screen'),
    collection: document.getElementById('collection-screen'),
    battle: document.getElementById('battle-screen')
  };

  // ============ 工具函数 ============
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function speak(text, priority) {
    if (window.gameAudio) {
      window.gameAudio.speak(text, priority);
    }
  }

  function hexToRgba(hex, alpha) {
    const h = String(hex).replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  // ============ 屏幕切换 ============
  async function showScreen(name) {
    if (state.screenTransitioning) return;
    state.screenTransitioning = true;

    // 停止音乐（根据场景切换）
    if (window.gameAudio && state.currentScreen !== name) {
      if (name === 'battle') {
        window.gameAudio.stopMusic();
      } else if (name === 'menu') {
        window.gameAudio.startMenuMusic();
      } else {
        window.gameAudio.stopMusic();
      }
    }

    // 淡出当前屏幕
    const current = screens[state.currentScreen];
    if (current) {
      current.style.opacity = '0';
      current.style.transform = 'translateY(20px)';
      await delay(250);
      current.classList.remove('active');
      current.style.cssText = '';
    }

    // 淡入新屏幕
    state.currentScreen = name;
    const next = screens[name];
    if (next) {
      next.classList.add('active');
      next.style.opacity = '0';
      next.style.transform = 'translateY(20px)';
      next.style.transition = 'opacity 0.35s ease, transform 0.35s ease';

      // 强制回流
      next.offsetHeight;

      next.style.opacity = '1';
      next.style.transform = 'translateY(0)';

      await delay(400);
      next.style.cssText = next.style.cssText.replace(/opacity[^;]*;?/g, '').replace(/transform[^;]*;?/g, '').replace(/transition[^;]*;?/g, '');
    }

    state.screenTransitioning = false;

    // 屏幕特定逻辑
    if (name === 'select') {
      renderCardGrid();
      updateManualPreview();
    } else if (name === 'collection') {
      renderCollectionGrid();
    } else if (name === 'battle') {
      startBattle();
    } else if (name === 'menu') {
      speak('奥特曼卡片大战！');
      // 刷新主页槽位显示
      renderMenuSlots();
    }
  }

  function goBackToMenu() {
    if (state.animationFrame) {
      cancelAnimationFrame(state.animationFrame);
      state.animationFrame = null;
    }
    if (state.battleEngine) {
      state.battleEngine.stop();
      state.battleEngine = null;
    }
    stopCamera();
    hideScanResult();
    hideMoreMenu();
    if (window.gameAudio) {
      window.gameAudio.stopMusic();
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    state.battleRunning = false;
    state.currentStep = 1;
    state.selectedCards = { player1: null, player2: null };
    showScreen('menu');
  }

  // ============ 卡片形象绘制函数 drawCardOnCanvas ============
  // 在 canvas 上绘制卡片形象（用于扫描结果和卡片详情）
  function drawCardOnCanvas(canvas, card) {
    if (!canvas || !card) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // 清空画布
    ctx.clearRect(0, 0, w, h);

    // 绘制背景光晕
    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 5, w / 2, h / 2, Math.max(w, h) / 2);
    bgGrad.addColorStop(0, hexToRgba(card.color, 0.35));
    bgGrad.addColorStop(0.6, hexToRgba(card.color, 0.1));
    bgGrad.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    const scale = Math.min(w, h) / 200;
    ctx.scale(scale, scale);

    // 根据卡片名称和类型选择绘制方式
    const isGanQ = card.name && card.name.indexOf('加恩Q') !== -1;
    if (isGanQ) {
      drawGanQPreview(ctx, 0, 0, card);
    } else if (card.type === 'hero') {
      drawUltramanPreview(ctx, 0, 0, card);
    } else {
      drawMonsterPreview(ctx, 0, 0, card);
    }

    ctx.restore();

    // 底部添加卡片名称
    ctx.save();
    ctx.font = 'bold ' + Math.max(14, Math.floor(w / 14)) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // 文字阴影
    ctx.fillStyle = card.color || '#00d4ff';
    ctx.shadowColor = card.color || '#00d4ff';
    ctx.shadowBlur = 8;
    ctx.fillText(card.name, w / 2, h - 8);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // 简化版的奥特曼绘制（卡片用）
  function drawUltramanPreview(ctx, x, y, card) {
    const c = card.color || '#00d4ff';

    // 身体
    ctx.fillStyle = '#e8e8e8';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y + 20, 28, 42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 红色胸甲
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x - 22, y);
    ctx.lineTo(x - 28, y + 25);
    ctx.lineTo(x + 28, y + 25);
    ctx.lineTo(x + 22, y);
    ctx.closePath();
    ctx.fill();

    // 头部
    ctx.fillStyle = '#e8e8e8';
    ctx.beginPath();
    ctx.ellipse(x, y - 35, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 头部冠饰
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 38);
    ctx.lineTo(x, y - 55);
    ctx.lineTo(x + 8, y - 38);
    ctx.closePath();
    ctx.fill();

    // 眼睛发光
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(x - 6, y - 35, 5, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 6, y - 35, 5, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 胸灯（彩色计时器）
    const timerColor = card.hp && card.hp < 300 ? '#ff3838' : c;
    ctx.fillStyle = timerColor;
    ctx.shadowColor = timerColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y + 5, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // 简化版的怪兽绘制（卡片用）
  function drawMonsterPreview(ctx, x, y, card) {
    const c = card.color || '#8e44ad';

    // 身体
    ctx.fillStyle = c;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 35, y - 25);
    ctx.quadraticCurveTo(x - 45, y, x - 35, y + 30);
    ctx.lineTo(x + 35, y + 30);
    ctx.quadraticCurveTo(x + 45, y, x + 35, y - 25);
    ctx.quadraticCurveTo(x, y - 40, x - 35, y - 25);
    ctx.fill();
    ctx.stroke();

    // 背部突起
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 12 - 4, y - 28);
      ctx.lineTo(x + i * 12, y - 42);
      ctx.lineTo(x + i * 12 + 4, y - 28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 眼睛 - 发光红色
    ctx.fillStyle = '#ff3838';
    ctx.shadowColor = '#ff3838';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x - 10, y - 12, 4, 0, Math.PI * 2);
    ctx.arc(x + 10, y - 12, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 獠牙
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 2);
    ctx.lineTo(x - 4, y + 8);
    ctx.lineTo(x - 2, y + 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 2);
    ctx.lineTo(x + 4, y + 8);
    ctx.lineTo(x + 2, y + 2);
    ctx.fill();

    // 角（如果有）
    ctx.fillStyle = c;
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 30);
    ctx.lineTo(x - 22, y - 50);
    ctx.lineTo(x - 12, y - 35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 18, y - 30);
    ctx.lineTo(x + 22, y - 50);
    ctx.lineTo(x + 12, y - 35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 简化版的加恩Q绘制（卡片用）
  function drawGanQPreview(ctx, x, y, card) {
    // 主身体
    ctx.fillStyle = '#2d3436';
    ctx.strokeStyle = '#636e72';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y + 5, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 大嘴
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(x, y + 18, 25, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 嘴内发光
    ctx.fillStyle = '#e74c3c';
    ctx.shadowColor = '#e74c3c';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.ellipse(x, y + 18, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 尖牙
    ctx.fillStyle = '#fff';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 8, y + 12);
      ctx.lineTo(x + i * 8 - 2, y + 9);
      ctx.lineTo(x + i * 8 + 2, y + 9);
      ctx.closePath();
      ctx.fill();
    }

    // 核心大眼
    ctx.fillStyle = '#e74c3c';
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(x, y - 15, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 瞳孔
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x, y - 15, 8, 0, Math.PI * 2);
    ctx.fill();

    // 高光
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 3, y - 18, 3, 0, Math.PI * 2);
    ctx.fill();

    // 周围触手
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const tx = x + Math.cos(angle) * 48;
      const ty = y + 5 + Math.sin(angle) * 48;
      ctx.fillStyle = '#2d3436';
      ctx.beginPath();
      ctx.arc(tx, ty, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ============ 首页卡片槽位渲染 ============
  function renderMenuSlots() {
    renderPlayerSlot(1);
    renderPlayerSlot(2);
    updateBattleButton();
  }

  function renderPlayerSlot(playerNum) {
    const slotEl = document.querySelector('.player-slot[data-player="' + playerNum + '"]');
    if (!slotEl) return;

    const cardScan = slotEl.querySelector('.card-scan');
    if (!cardScan) return;

    const card = state.selectedCards['player' + playerNum];
    const scanEmpty = cardScan.querySelector('.scan-empty');
    const scanResult = cardScan.querySelector('.scan-result');
    const rescanBtn = cardScan.querySelector('.rescan-btn');

    if (card) {
      // 已扫描状态
      if (scanEmpty) scanEmpty.style.display = 'none';
      if (scanResult) {
        scanResult.style.display = 'flex';
        const canvas = scanResult.querySelector('canvas.card-portrait');
        if (canvas) {
          canvas.width = 120;
          canvas.height = 120;
          drawCardOnCanvas(canvas, card);
        }
        // 填充卡片信息
        const nameEl = scanResult.querySelector('.card-name');
        const rarityEl = scanResult.querySelector('.card-rarity');
        const stats = scanResult.querySelectorAll('.stat-item');

        if (nameEl) {
          nameEl.textContent = card.name;
          nameEl.style.color = card.color;
          nameEl.style.textShadow = '0 0 8px ' + card.color;
        }
        if (rarityEl) rarityEl.textContent = '稀有度: ' + (card.rarity || 'SR');

        if (stats && stats.length >= 4) {
          const statVals = [card.hp, card.atk, card.def, card.spd];
          const statLabels = ['HP', 'ATK', 'DEF', 'SPD'];
          for (let i = 0; i < stats.length && i < 4; i++) {
            const labelEl = stats[i].querySelector('.stat-label');
            const valEl = stats[i].querySelector('.stat-val');
            if (labelEl) labelEl.textContent = statLabels[i];
            if (valEl) valEl.textContent = statVals[i];
          }
        }
      }
      if (rescanBtn) rescanBtn.style.display = 'block';
    } else {
      // 未扫描状态
      if (scanEmpty) scanEmpty.style.display = 'flex';
      if (scanResult) scanResult.style.display = 'none';
      if (rescanBtn) rescanBtn.style.display = 'none';
    }
  }

  function updateBattleButton() {
    const btn = document.getElementById('btn-start-battle');
    if (!btn) return;
    const hasBoth = state.selectedCards.player1 && state.selectedCards.player2;
    btn.disabled = !hasBoth;
  }

  // ============ 点击卡片槽位处理 ============
  function onSlotClick(playerNum) {
    if (window.gameAudio) window.gameAudio.playClick();
    state.currentScanPlayer = playerNum;
    speak('玩家' + playerNum + '，扫描你的卡片');
    showScreen('camera');
    setTimeout(initCamera, 200);
  }

  function onRescanClick(playerNum) {
    if (window.gameAudio) window.gameAudio.playClick();
    state.selectedCards['player' + playerNum] = null;
    state.currentScanPlayer = playerNum;
    speak('重新扫描玩家' + playerNum + '的卡片');
    renderPlayerSlot(playerNum);
    updateBattleButton();
    showScreen('camera');
    setTimeout(initCamera, 200);
  }

  // ============ 更多菜单 ============
  function toggleMoreMenu() {
    if (window.gameAudio) window.gameAudio.playClick();
    const menu = document.getElementById('more-menu');
    if (!menu) return;
    state.moreMenuOpen = !state.moreMenuOpen;
    menu.style.display = state.moreMenuOpen ? 'flex' : 'none';
  }

  function hideMoreMenu() {
    const menu = document.getElementById('more-menu');
    if (menu) menu.style.display = 'none';
    state.moreMenuOpen = false;
  }

  function openCollection() {
    if (window.gameAudio) window.gameAudio.playClick();
    hideMoreMenu();
    state.currentFilter = 'all';
    speak('查看卡片图鉴');
    showScreen('collection');
  }

  function openManualSelect() {
    if (window.gameAudio) window.gameAudio.playClick();
    hideMoreMenu();
    state.selectedCards = { player1: null, player2: null };
    state.currentStep = 1;
    speak('请玩家1选择你的卡片');
    showScreen('select');
  }

  // ============ 卡片网格渲染（手动选卡）============
  function renderCardGrid() {
    const grid = document.getElementById('card-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let cards = window.ALL_CARDS;
    if (state.currentFilter !== 'all') {
      cards = cards.filter(function (c) { return c.type === state.currentFilter; });
    }

    for (let i = 0; i < cards.length; i++) {
      const cardEl = renderCardCard(cards[i], handleCardSelect, false);
      grid.appendChild(cardEl);
    }
  }

  function renderCollectionGrid() {
    const grid = document.getElementById('collection-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let cards = window.ALL_CARDS;
    if (state.currentFilter !== 'all') {
      cards = cards.filter(function (c) { return c.type === state.currentFilter; });
    }

    // 更新图鉴计数
    const countEl = document.getElementById('dex-count');
    if (countEl) countEl.textContent = '共 ' + cards.length + ' 张';

    for (let i = 0; i < cards.length; i++) {
      const cardEl = renderCardCard(cards[i], handleViewCardDetail);
      grid.appendChild(cardEl);
    }
  }

  // 通用卡片渲染（用于选卡网格和图鉴）
  function renderCardCard(card, onclick, selected) {
    const cardEl = document.createElement('div');
    cardEl.className = 'game-card rarity-' + card.rarity;
    cardEl.dataset.id = card.id;
    if (selected) cardEl.classList.add('selected');

    cardEl.innerHTML =
      '<div class="card-art">' +
      '<canvas width="200" height="200"></canvas>' +
      '</div>' +
      '<div class="card-info">' +
      '<div class="card-name">' + card.name + '</div>' +
      '<div class="card-rarity-badge">' + card.rarity + '</div>' +
      '<div class="card-stats">' +
      '<div class="stat-mini"><span class="label">HP</span><span class="value">' + card.hp + '</span></div>' +
      '<div class="stat-mini"><span class="label">ATK</span><span class="value">' + card.atk + '</span></div>' +
      '<div class="stat-mini"><span class="label">DEF</span><span class="value">' + card.def + '</span></div>' +
      '<div class="stat-mini"><span class="label">SPD</span><span class="value">' + card.spd + '</span></div>' +
      '</div>' +
      '</div>';

    // 绘制卡片艺术图
    setTimeout(function () {
      const canvas = cardEl.querySelector('canvas');
      if (canvas) drawCardOnCanvas(canvas, card);
    }, 0);

    if (onclick) {
      cardEl.addEventListener('click', function () { onclick(card, cardEl); });
    }

    return cardEl;
  }

  // ============ 手动选卡：选择处理 ============
  function handleCardSelect(card, cardEl) {
    const key = 'player' + state.currentStep;
    state.selectedCards[key] = card;

    if (window.gameAudio) window.gameAudio.playSelect();
    speak('玩家' + state.currentStep + '选择' + card.name);

    // 切换到下一步
    if (state.currentStep === 1) {
      state.currentStep = 2;
      speak('现在请玩家2选择你的卡片');
    } else {
      state.currentStep = 1;
    }

    // 重新渲染以显示选中状态
    renderCardGrid();
    updateManualPreview();
  }

  function updateManualPreview() {
    updateManualSlot('ready-p1', state.selectedCards.player1, '玩家 1');
    updateManualSlot('ready-p2', state.selectedCards.player2, '玩家 2');

    const btnStart = document.getElementById('btn-start-battle-2');
    if (btnStart) {
      btnStart.disabled = !(state.selectedCards.player1 && state.selectedCards.player2);
    }

    // 更新当前选择指示
    const turnP1 = document.getElementById('turn-p1');
    const turnP2 = document.getElementById('turn-p2');
    if (turnP1) turnP1.classList.toggle('active', state.currentStep === 1);
    if (turnP2) turnP2.classList.toggle('active', state.currentStep === 2);
  }

  function updateManualSlot(slotId, card, label) {
    const slotEl = document.getElementById(slotId);
    if (!slotEl) return;

    slotEl.innerHTML = '';

    const labelEl = document.createElement('div');
    labelEl.className = 'slot-label';
    labelEl.textContent = label;
    slotEl.appendChild(labelEl);

    if (card) {
      slotEl.classList.add('selected');
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      slotEl.appendChild(canvas);
      drawCardOnCanvas(canvas, card);

      const nameEl = document.createElement('div');
      nameEl.className = 'slot-card-name';
      nameEl.style.color = card.color;
      nameEl.style.textShadow = '0 0 10px ' + card.color;
      nameEl.textContent = card.name;
      slotEl.appendChild(nameEl);
    } else {
      slotEl.classList.remove('selected');
      const empty = document.createElement('div');
      empty.className = 'slot-content empty';
      empty.textContent = '等待选择';
      slotEl.appendChild(empty);
    }
  }

  // ============ 卡片详情弹窗 ============
  function handleViewCardDetail(card) {
    if (window.gameAudio) window.gameAudio.playClick();
    showCardModal(card);
    speak(card.name);
  }

  function showCardModal(card) {
    const modal = document.getElementById('card-modal');
    const content = document.getElementById('card-detail-content');
    if (!modal || !content) return;

    const typeName = card.type === 'hero' ? '奥特曼' : '怪兽';
    const evaluation = window.evaluateCard ? window.evaluateCard(card) : { level: 'B', desc: '标准级' };

    content.innerHTML =
      '<div class="detail-header">' +
      '<div class="game-card rarity-' + card.rarity + '" style="max-width:200px;margin:0 auto 16px;cursor:default;">' +
      '<div class="card-art"><canvas width="200" height="200"></canvas></div>' +
      '<div class="card-info">' +
      '<div class="card-name">' + card.name + '</div>' +
      '<div class="card-rarity-badge">' + card.rarity + '</div>' +
      '</div>' +
      '</div>' +
      '<div class="detail-name">' + card.name + '</div>' +
      '<div class="detail-type">' + typeName + ' · ' + card.rarity + ' · ' + evaluation.level + '级 (' + evaluation.desc + ')</div>' +
      '</div>' +
      '<div class="detail-section">' +
      '<div class="detail-section-title">◆ 属性值</div>' +
      '<div class="detail-stats">' +
      '<div class="detail-stat"><span class="label">生命值 HP</span><span class="value">' + card.hp + '</span></div>' +
      '<div class="detail-stat"><span class="label">攻击力 ATK</span><span class="value">' + card.atk + '</span></div>' +
      '<div class="detail-stat"><span class="label">防御力 DEF</span><span class="value">' + card.def + '</span></div>' +
      '<div class="detail-stat"><span class="label">速度 SPD</span><span class="value">' + card.spd + '</span></div>' +
      '</div>' +
      '</div>' +
      '<div class="detail-section">' +
      '<div class="detail-section-title">⚔ 技能组</div>' +
      '<div class="detail-skills">' +
      card.skills.map(function (s) {
        return '<div class="skill-item ' + s.type + '">' +
          '<div class="skill-name">' + s.name + (s.critical ? ' ⚡ 暴击' : '') + '</div>' +
          '<div class="skill-info">' +
          '<span class="skill-dmg">伤害: ' + s.damage + '</span>' +
          '<span class="skill-type">' + (s.type === 'beam' ? '光线' : s.type === 'absorb' ? '吸收' : '物理') + '</span>' +
          '<span class="skill-cost">能量: ' + s.energyCost + '</span>' +
          '</div>' +
          '</div>';
      }).join('') +
      '</div>' +
      '</div>';

    modal.style.display = 'flex';

    // 绘制详情卡片的艺术图
    setTimeout(function () {
      const canvas = content.querySelector('canvas');
      if (canvas) drawCardOnCanvas(canvas, card);
    }, 10);
  }

  function hideCardModal() {
    const modal = document.getElementById('card-modal');
    if (modal) modal.style.display = 'none';
  }

  // ============ 扫描卡片功能 ============
  let currentStream = null;

  async function initCamera() {
    const video = document.getElementById('camera-video');
    const hint = document.getElementById('camera-hint');

    // ✅ 增强：每次调用前清理 fallback 元素
    const existingFallback = document.getElementById('camera-fallback');
    if (existingFallback) existingFallback.remove();
    if (video) video.style.display = '';

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('当前环境不支持摄像头 API');
      }

      // ✅ 增强：先尝试后置摄像头（环境摄像头），失败时降级为任意摄像头
      const constraints = [
        { video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        { video: true, audio: false }
      ];

      let stream = null;
      let lastError = null;

      for (let i = 0; i < constraints.length; i++) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints[i]);
          if (stream) break;
        } catch (e) {
          lastError = e;
        }
      }

      if (!stream) {
        throw lastError || new Error('无法访问摄像头');
      }

      currentStream = stream;
      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', '');
        video.setAttribute('autoplay', '');
        video.muted = true;
      }
      if (hint) hint.style.display = 'block';
    } catch (err) {
      console.warn('摄像头访问失败:', err.message);
      if (hint) hint.style.display = 'none';
      // 摄像头失败时显示友好提示，引导用户点击"随机抽取"
      if (video && video.parentNode) {
        const parent = video.parentNode;
        video.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.id = 'camera-fallback';
        fallback.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:linear-gradient(135deg,#1a1a2e,#16213e);color:#fff;padding:20px;text-align:center;border-radius:8px;';
        // 区分不同的错误原因
        let reason = '请点击下方"随机抽取"按钮获取卡片';
        if (err.message.indexOf('Permission') >= 0 || err.message.indexOf('权限') >= 0 || err.name === 'NotAllowedError') {
          reason = '未授予摄像头权限，请在系统设置中允许';
        } else if (err.message.indexOf('not found') >= 0 || err.message.indexOf('找不到') >= 0 || err.name === 'NotFoundError') {
          reason = '未检测到摄像头设备';
        } else if (err.message.indexOf('not supported') >= 0 || err.message.indexOf('不支持') >= 0) {
          reason = '当前浏览器不支持摄像头';
        } else if (err.message.indexOf('HTTPS') >= 0 || err.message.indexOf('secure') >= 0) {
          reason = '需要 HTTPS 环境才能使用摄像头';
        }
        fallback.innerHTML =
          '<div style="font-size:56px;margin-bottom:16px;">📷</div>' +
          '<div style="font-size:18px;margin-bottom:12px;font-weight:bold;color:#7ee8fa;">摄像头暂不可用</div>' +
          '<div style="font-size:13px;color:#b0b0b0;">' + reason + '</div>';
        parent.appendChild(fallback);
      }
    }
  }

  function stopCamera() {
    if (currentStream) {
      try {
        currentStream.getTracks().forEach(function (track) { track.stop(); });
      } catch (e) {}
      currentStream = null;
    }
    // 恢复 video 显示
    const video = document.getElementById('camera-video');
    const fallback = document.getElementById('camera-fallback');
    if (video) video.style.display = '';
    if (fallback) fallback.remove();
  }

  function captureCardImage() {
    if (window.gameAudio) window.gameAudio.playClick();
    const card = window.getRandomCard();
    speak('识别成功！获得' + card.name + '卡片！');
    showScanResult(card);
  }

  function randomPickCard() {
    if (window.gameAudio) window.gameAudio.playClick();
    const card = window.getRandomCard();
    speak('获得' + card.name + '卡片！');
    showScanResult(card);
  }

  function showScanResult(card) {
    const scannedEl = document.getElementById('scanned-card');
    const inner = document.getElementById('scanned-inner');
    if (!scannedEl || !inner) return;

    inner.innerHTML = '';
    const cardEl = renderCardCard(card, null);
    cardEl.style.cursor = 'default';
    inner.appendChild(cardEl);

    scannedEl.style.display = 'block';
    state.capturedCard = card;
  }

  function hideScanResult() {
    const scannedEl = document.getElementById('scanned-card');
    if (scannedEl) scannedEl.style.display = 'none';
    state.capturedCard = null;
  }

  function confirmCapturedCard() {
    if (!state.capturedCard) return;
    if (window.gameAudio) window.gameAudio.playSelect();

    // 将扫描到的卡片分配给当前扫描玩家
    const key = 'player' + state.currentScanPlayer;
    state.selectedCards[key] = state.capturedCard;

    stopCamera();
    hideScanResult();

    // 检查是否两个玩家都已选择
    if (state.selectedCards.player1 && state.selectedCards.player2) {
      speak('两位选手已准备好，战斗即将开始！');
      // 回到首页显示战斗按钮可点击
      showScreen('menu');
      setTimeout(function () {
        // 直接进入战斗
        if (state.currentScreen === 'menu') {
          showScreen('battle');
        }
      }, 1000);
    } else {
      speak('玩家' + state.currentScanPlayer + '获得' + state.capturedCard.name + '！');
      showScreen('menu');
    }
  }

  // ============ 战斗系统 ============
  async function startBattle() {
    const card1 = state.selectedCards.player1;
    const card2 = state.selectedCards.player2;

    if (!card1 || !card2) {
      // 如果没有卡片，先回到首页
      showScreen('menu');
      return;
    }

    state.battleRunning = true;

    // 更新HUD
    updateFighterInfo('left', card1);
    updateFighterInfo('right', card2);

    // 清空日志
    const logEl = document.getElementById('battle-log');
    if (logEl) logEl.innerHTML = '';
    addBattleLog('⚡ 战斗开始！', 'highlight');

    // 隐藏重玩按钮
    const replayBtn = document.getElementById('btn-replay');
    if (replayBtn) replayBtn.style.display = 'none';

    // 创建战斗引擎
    const canvas = document.getElementById('battle-canvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);

      state.battleEngine = new window.BattleAnimationEngine(canvas, card1, card2);
      state.battleEngine.start();

      // 启动渲染循环
      if (state.animationFrame) {
        cancelAnimationFrame(state.animationFrame);
      }
      animate();
    }

    // 播放开始音效和语音
    if (window.gameAudio) {
      window.gameAudio.playBattleStart();
      window.gameAudio.startBattleMusic();
    }
    speak(card1.name + '对战' + card2.name + '，战斗开始！');

    await delay(1500);

    // 生成战斗事件并播放
    const events = window.generateBattleEvents(card1, card2);
    await playBattleEvents(events);

    state.battleRunning = false;
  }

  function animate() {
    if (state.currentScreen !== 'battle') return;
    if (state.battleEngine) {
      state.battleEngine.render();
    }
    state.animationFrame = requestAnimationFrame(animate);
  }

  async function playBattleEvents(events) {
    for (let i = 0; i < events.length; i++) {
      if (state.currentScreen !== 'battle') return;
      const event = events[i];
      await playSingleEvent(event);
    }
  }

  async function playSingleEvent(event) {
    const leftCard = state.selectedCards.player1;
    const rightCard = state.selectedCards.player2;

    if (event.type === 'battle-start') {
      addBattleLog('⚡ ' + leftCard.name + ' VS ' + rightCard.name, 'highlight');
      return;
    }

    if (event.type === 'battle-end') {
      if (event.result === 'draw') {
        addBattleLog('⚔ 双方势均力敌，打成平手！', 'highlight');
        if (window.gameAudio) window.gameAudio.playStrike();
      } else {
        const winner = event.result === 'left-wins' ? leftCard : rightCard;
        const loser = event.result === 'left-wins' ? rightCard : leftCard;
        if (window.gameAudio) {
          window.gameAudio.stopMusic();
          setTimeout(function () { window.gameAudio.playVictory(); }, 800);
        }
        addBattleLog('🏆 ' + winner.name + ' 击败 ' + loser.name + '，获得胜利！', 'winner');
        speak(winner.name + '获得胜利！太棒了！');
      }
      // 显示结果弹窗
      showResultModal(event);
      const replayBtn = document.getElementById('btn-replay');
      if (replayBtn) replayBtn.style.display = 'flex';
      return;
    }

    // 战斗攻击事件
    const attacker = event.attackerSide === 'left' ? leftCard : rightCard;
    const defender = event.attackerSide === 'left' ? rightCard : leftCard;

    if (event.type === 'attack') {
      if (window.gameAudio) {
        if (event.skillType === 'beam') {
          window.gameAudio.playBeam(0.6, event.critical ? 1.2 : 1);
        } else {
          window.gameAudio.playStrike(0.4, event.critical ? 1.2 : 1);
        }
        if (event.critical) window.gameAudio.playCritical();
      }

      if (state.battleEngine) {
        await state.battleEngine.playAttackAnimation(event.attackerSide, event.skillName, event.damage, event.skillType);
      }

      const logText = event.critical
        ? '⚡ ' + attacker.name + ' 使用【' + event.skillName + '】 对 ' + defender.name + ' 造成 ' + event.damage + ' 点暴击伤害！'
        : attacker.name + ' 使用【' + event.skillName + '】 对 ' + defender.name + ' 造成 ' + event.damage + ' 点伤害';
      addBattleLog(logText, event.critical ? 'critical' : 'normal');
      speak(attacker.name + '使用' + event.skillName + '，造成' + event.damage + '点伤害' + (event.critical ? '暴击！' : ''));

      updateHUDHealth(event);

    } else if (event.type === 'absorb') {
      if (window.gameAudio) window.gameAudio.playAbsorb(1.2, 1);
      if (state.battleEngine) {
        await state.battleEngine.playAbsorbAnimation(event.attackerSide);
      }

      addBattleLog('💜 ' + attacker.name + ' 将 ' + defender.name + ' 吸进体内！', 'absorb');
      speak(attacker.name + '将' + defender.name + '吸进了体内！');
      updateHUDAbsorb(event.attackerSide);

    } else if (event.type === 'body-attack') {
      if (window.gameAudio) window.gameAudio.playStrike(0.5, 1);
      if (state.battleEngine) {
        await state.battleEngine.playBodyAttackAnimation(event.attackerSide === 'left' ? 'right' : 'left', event.damage);
      }

      addBattleLog('💥 ' + attacker.name + ' 在 ' + defender.name + ' 体内发动攻击！造成 ' + event.damage + ' 点伤害！', 'absorb');
      speak(attacker.name + '在体内发起反击！');
      updateHUDHealth(event, true);

    } else if (event.type === 'escape') {
      if (window.gameAudio) window.gameAudio.playEscape(0.8, 1.2);
      if (state.battleEngine) {
        await state.battleEngine.playEscapeAnimation(event.attackerSide === 'left' ? 'right' : 'left', event.damage);
      }

      addBattleLog('✨ ' + attacker.name + ' 冲破了 ' + defender.name + ' 的束缚，挣脱出来！', 'absorb');
      speak(attacker.name + '成功挣脱！');
      resetHUD();
    }

    await delay(300);
  }

  function updateHUDHealth(event, reverse) {
    const defenderSide = event.attackerSide === 'left' ? 'right' : 'left';

    if (event.defenderHp !== undefined && event.defenderMaxHp !== undefined) {
      const bar = document.getElementById('hp-fill-' + defenderSide);
      const value = document.getElementById('hp-value-' + defenderSide);
      if (bar) {
        const percent = Math.max(0, (event.defenderHp / event.defenderMaxHp) * 100);
        bar.style.width = percent + '%';
        if (percent < 30) {
          bar.style.background = 'linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)';
        }
      }
      if (value) {
        value.textContent = Math.max(0, event.defenderHp) + '/' + event.defenderMaxHp;
      }
    }

    if (event.attackerEnergy !== undefined && event.attackerMaxEnergy !== undefined) {
      const bar = document.getElementById('energy-fill-' + event.attackerSide);
      const value = document.getElementById('energy-value-' + event.attackerSide);
      if (bar) {
        bar.style.width = (event.attackerEnergy / event.attackerMaxEnergy * 100) + '%';
      }
      if (value) {
        value.textContent = Math.max(0, Math.floor(event.attackerEnergy)) + '/' + event.attackerMaxEnergy;
      }
    }
  }

  function updateHUDAbsorb(attackerSide) {
    const defenderSide = attackerSide === 'left' ? 'right' : 'left';
    const hudAvatar = document.getElementById('hud-avatar-' + defenderSide);
    const hudName = document.getElementById('hud-name-' + defenderSide);
    if (hudAvatar) {
      hudAvatar.style.opacity = '0.3';
      hudAvatar.style.filter = 'blur(2px)';
    }
    if (hudName) {
      hudName.style.color = '#a855f7';
    }
  }

  function resetHUD() {
    const sides = ['left', 'right'];
    for (let i = 0; i < sides.length; i++) {
      const side = sides[i];
      const hudAvatar = document.getElementById('hud-avatar-' + side);
      const hudName = document.getElementById('hud-name-' + side);
      if (hudAvatar) {
        hudAvatar.style.opacity = '1';
        hudAvatar.style.filter = '';
      }
      if (hudName) {
        const card = side === 'left' ? state.selectedCards.player1 : state.selectedCards.player2;
        hudName.style.color = card.color;
      }
    }
  }

  function updateFighterInfo(side, card) {
    const avatarEl = document.getElementById('hud-avatar-' + side);
    const nameEl = document.getElementById('hud-name-' + side);
    const hpFill = document.getElementById('hp-fill-' + side);
    const hpValue = document.getElementById('hp-value-' + side);
    const energyFill = document.getElementById('energy-fill-' + side);
    const energyValue = document.getElementById('energy-value-' + side);

    if (avatarEl) {
      avatarEl.innerHTML = '';
      const canvas = document.createElement('canvas');
      canvas.width = 80;
      canvas.height = 80;
      avatarEl.appendChild(canvas);
      drawCardOnCanvas(canvas, card);
      avatarEl.style.borderColor = card.color;
      avatarEl.style.boxShadow = '0 0 15px ' + card.color + '50';
      avatarEl.style.opacity = '1';
      avatarEl.style.filter = '';
    }

    if (nameEl) {
      nameEl.textContent = card.name;
      nameEl.style.color = card.color;
      nameEl.style.textShadow = '0 0 8px ' + card.color + '80';
    }

    if (hpFill) hpFill.style.width = '100%';
    if (hpValue) hpValue.textContent = card.hp + '/' + card.hp;
    if (energyFill) energyFill.style.width = '100%';
    if (energyValue) energyValue.textContent = card.energy + '/' + card.energy;
  }

  function addBattleLog(text, type) {
    const logEl = document.getElementById('battle-log');
    if (!logEl) return;

    const entry = document.createElement('div');
    entry.className = 'log-line';
    if (type === 'critical') entry.classList.add('critical');
    if (type === 'highlight') entry.classList.add('highlight');
    if (type === 'absorb') entry.classList.add('absorb');
    if (type === 'winner') entry.classList.add('winner');
    entry.textContent = text;

    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }

  // ============ 结果弹窗 ============
  function showResultModal(event) {
    const modal = document.getElementById('result-modal');
    const titleEl = document.getElementById('result-title');
    const winnerEl = document.getElementById('result-winner');
    const subEl = document.getElementById('result-sub');
    if (!modal) return;

    if (event.result === 'draw') {
      if (titleEl) titleEl.innerHTML = '<span class="result-text" style="color:#ffd93d;text-shadow:0 0 20px #ffd93d;">⚔ 平手 ⚔</span>';
      if (winnerEl) winnerEl.textContent = '双方势均力敌！';
      if (subEl) subEl.textContent = '再来一局一决高下！';
    } else {
      const winner = event.result === 'left-wins' ? state.selectedCards.player1 : state.selectedCards.player2;
      const loser = event.result === 'left-wins' ? state.selectedCards.player2 : state.selectedCards.player1;
      if (titleEl) titleEl.innerHTML = '<span class="result-text" style="color:#ffd93d;text-shadow:0 0 20px #ffd93d,0 0 40px #ffd93d;">🏆 胜利 🏆</span>';
      if (winnerEl) {
        winnerEl.textContent = winner.name + ' 击败 ' + loser.name;
        winnerEl.style.color = winner.color;
        winnerEl.style.textShadow = '0 0 10px ' + winner.color;
      }
      if (subEl) subEl.textContent = '恭喜获胜！再来一局吧！';
    }

    modal.style.display = 'flex';
  }

  function hideResultModal() {
    const modal = document.getElementById('result-modal');
    if (modal) modal.style.display = 'none';
  }

  // ============ 事件绑定 ============
  function bindEvents() {
    // ===== 首页：更多菜单按钮 =====
    const btnMore = document.getElementById('btn-more');
    if (btnMore) {
      btnMore.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleMoreMenu();
      });
    }

    // 点击菜单外部关闭
    document.addEventListener('click', function (e) {
      const menu = document.getElementById('more-menu');
      const btn = document.getElementById('btn-more');
      if (menu && state.moreMenuOpen) {
        if (!menu.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
          hideMoreMenu();
        }
      }
    });

    // ===== 隐藏菜单项目 =====
    const btnCollection = document.getElementById('btn-collection');
    if (btnCollection) btnCollection.addEventListener('click', openCollection);

    const btnManualSelect = document.getElementById('btn-manual-select');
    if (btnManualSelect) btnManualSelect.addEventListener('click', openManualSelect);

    // ===== 首页：卡片槽位扫描按钮 =====
    const playerSlots = document.querySelectorAll('.player-slot');
    for (let i = 0; i < playerSlots.length; i++) {
      const slot = playerSlots[i];
      const playerNum = parseInt(slot.dataset.player, 10);

      // 点击扫描区进入扫描页面
      const scanEmpty = slot.querySelector('.scan-empty');
      if (scanEmpty) {
        scanEmpty.addEventListener('click', function () { onSlotClick(playerNum); });
      }

      // 重新扫描按钮
      const rescanBtn = slot.querySelector('.rescan-btn');
      if (rescanBtn) {
        rescanBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          onRescanClick(playerNum);
        });
      }
    }

    // ===== 首页：战斗按钮 =====
    const btnStartBattle = document.getElementById('btn-start-battle');
    if (btnStartBattle) {
      btnStartBattle.addEventListener('click', function () {
        if (window.gameAudio) window.gameAudio.playClick(1.1, 0.8);
        showScreen('battle');
      });
    }

    // ===== 返回按钮（扫描页面）=====
    const btnBackMenu = document.getElementById('btn-back-menu');
    if (btnBackMenu) {
      btnBackMenu.addEventListener('click', function () {
        stopCamera();
        hideScanResult();
        showScreen('menu');
      });
    }

    // ===== 扫描：识别/随机按钮 =====
    const btnCapture = document.getElementById('btn-capture');
    if (btnCapture) btnCapture.addEventListener('click', captureCardImage);

    const btnRandomCard = document.getElementById('btn-random-card');
    if (btnRandomCard) btnRandomCard.addEventListener('click', randomPickCard);

    const btnRescan = document.getElementById('btn-rescan');
    if (btnRescan) btnRescan.addEventListener('click', hideScanResult);

    const btnConfirmCard = document.getElementById('btn-confirm-card');
    if (btnConfirmCard) btnConfirmCard.addEventListener('click', confirmCapturedCard);

    // ===== 手动选卡页面：过滤按钮 =====
    const selectFilterBtns = document.querySelectorAll('#select-screen .filter-chip');
    for (let i = 0; i < selectFilterBtns.length; i++) {
      selectFilterBtns[i].addEventListener('click', function () {
        if (window.gameAudio) window.gameAudio.playClick(0.9, 0.4);
        document.querySelectorAll('#select-screen .filter-chip').forEach(function (b) { b.classList.remove('active'); });
        selectFilterBtns[i].classList.add('active');
        state.currentFilter = selectFilterBtns[i].dataset.filter;
        renderCardGrid();
      });
    }

    // 手动选卡页面返回按钮
    const btnBackMenu2 = document.getElementById('btn-back-menu-2');
    if (btnBackMenu2) {
      btnBackMenu2.addEventListener('click', function () { goBackToMenu(); });
    }

    // 手动选卡页面战斗按钮
    const btnStartBattle2 = document.getElementById('btn-start-battle-2');
    if (btnStartBattle2) {
      btnStartBattle2.addEventListener('click', function () {
        if (window.gameAudio) window.gameAudio.playClick(1.1, 0.8);
        showScreen('battle');
      });
    }

    // ===== 图鉴页面：过滤按钮 =====
    const collectionFilterBtns = document.querySelectorAll('#collection-screen .filter-chip');
    for (let i = 0; i < collectionFilterBtns.length; i++) {
      collectionFilterBtns[i].addEventListener('click', function () {
        if (window.gameAudio) window.gameAudio.playClick(0.9, 0.4);
        document.querySelectorAll('#collection-screen .filter-chip').forEach(function (b) { b.classList.remove('active'); });
        collectionFilterBtns[i].classList.add('active');
        state.currentFilter = collectionFilterBtns[i].dataset.filter;
        renderCollectionGrid();
      });
    }

    // 图鉴返回按钮
    const btnBackMenu3 = document.getElementById('btn-back-menu-3');
    if (btnBackMenu3) btnBackMenu3.addEventListener('click', goBackToMenu);

    // ===== 战斗页面控制 =====
    const btnExitBattle = document.getElementById('btn-exit-battle');
    if (btnExitBattle) btnExitBattle.addEventListener('click', goBackToMenu);

    const btnReplay = document.getElementById('btn-replay');
    if (btnReplay) {
      btnReplay.addEventListener('click', function () {
        if (window.gameAudio) window.gameAudio.playClick();
        if (state.animationFrame) {
          cancelAnimationFrame(state.animationFrame);
          state.animationFrame = null;
        }
        if (state.battleEngine) {
          state.battleEngine.stop();
          state.battleEngine = null;
        }
        startBattle();
      });
    }

    // ===== 结果弹窗关闭 =====
    const btnModalClose = document.getElementById('btn-modal-close');
    if (btnModalClose) btnModalClose.addEventListener('click', hideResultModal);

    // ===== 卡片详情弹窗 =====
    const btnCardClose = document.getElementById('btn-card-close');
    if (btnCardClose) btnCardClose.addEventListener('click', hideCardModal);

    // 点击弹窗背景关闭
    const resultModal = document.getElementById('result-modal');
    if (resultModal) {
      resultModal.addEventListener('click', function (e) {
        if (e.target === resultModal || e.target.classList && e.target.classList.contains('modal-bg')) {
          hideResultModal();
        }
      });
    }

    const cardModal = document.getElementById('card-modal');
    if (cardModal) {
      cardModal.addEventListener('click', function (e) {
        if (e.target === cardModal || e.target.classList && e.target.classList.contains('modal-bg')) {
          hideCardModal();
        }
      });
    }
  }

  // ============ 背景粒子效果 ============
  function initBackgroundParticles() {
    const canvas = document.getElementById('bg-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const particles = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.5,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.5 ? '#00d4ff' : '#a855f7',
        pulse: Math.random() * Math.PI * 2
      });
    }

    function animateParticles() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < 0 || p.x > canvas.width) {
          p.vx *= -1;
        }

        const pulseAlpha = p.alpha * (0.7 + Math.sin(p.pulse) * 0.3);
        ctx.globalAlpha = pulseAlpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      requestAnimationFrame(animateParticles);
    }

    animateParticles();
  }

  // ============ 初始化 ============
  function init() {
    bindEvents();
    initBackgroundParticles();

    // 启动菜单音乐
    setTimeout(function () {
      if (window.gameAudio) {
        window.gameAudio.init();
        window.gameAudio.startMenuMusic();
      }
    }, 500);

    // 渲染首页槽位
    renderMenuSlots();

    speak('奥特曼卡片大战！');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 页面可见性变化处理
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state.currentScreen === 'battle') {
      if (state.animationFrame) {
        cancelAnimationFrame(state.animationFrame);
        state.animationFrame = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
    } else if (!document.hidden && state.currentScreen === 'battle') {
      if (!state.animationFrame) {
        animate();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
    }
  });

  // 窗口大小变化处理
  window.addEventListener('resize', function () {
    if (state.currentScreen === 'battle' && state.battleEngine) {
      const canvas = document.getElementById('battle-canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
          canvas.width = Math.floor(rect.width);
          canvas.height = Math.floor(rect.height);
        }
      }
    }
  });
})();
