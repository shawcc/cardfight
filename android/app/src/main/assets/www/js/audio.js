// ============ 音效系统 - 使用 Web Audio API 程序化生成音效 ============

class AudioSystem {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.enabled = true;
    this.initialized = false;
    this.currentMusic = null;
    this.voiceEnabled = true;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.6;
      this.masterGain.connect(this.audioContext.destination);

      this.musicGain = this.audioContext.createGain();
      this.musicGain.gain.value = 0.25;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.audioContext.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext 初始化失败:', e.message);
    }
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // ============ 基础音效生成 ============

  // 生成光线/光束音效 - 带颤音的明亮音效
  playBeam(duration = 0.5, intensity = 1) {
    if (!this.enabled) return;
    this.init();
    this.resume();
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;

    // 主振荡器 - 高频锯齿波
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(440, now + duration);

    // 第二振荡器 - 方波提供冲击感
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(1320, now);
    osc2.frequency.exponentialRampToValueAtTime(660, now + duration);

    // LFO 颤音
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 50;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    // 包络
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3 * intensity, now + 0.05);
    gain.gain.setValueAtTime(0.3 * intensity, now + duration - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // 低通滤波
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 3;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
    lfo.stop(now + duration);
  }

  // 生成物理打击/爆炸音效 - 噪音 + 低频冲击
  playStrike(duration = 0.3, intensity = 1) {
    if (!this.enabled) return;
    this.init();
    this.resume();
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;

    // 低频冲击
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + duration);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.5 * intensity, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration);

    // 噪音爆裂
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 800;
    noiseFilter.Q.value = 1;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.4 * intensity;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  // 爆炸音效 - 厚重噪音 + 低频冲击
  playExplosion(duration = 0.8, intensity = 1) {
    if (!this.enabled) return;
    this.init();
    this.resume();
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;

    // 白色噪音
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // 多级滤波器
    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(1500, now);
    filter1.frequency.exponentialRampToValueAtTime(200, now + duration);

    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'highpass';
    filter2.frequency.value = 50;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6 * intensity, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter1);
    filter1.connect(filter2);
    filter2.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);

    // 低频震荡波
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + duration * 0.8);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.4 * intensity, now);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration);
  }

  // 吸收/吸入音效 - 频率上升的吸入感
  playAbsorb(duration = 1.2, intensity = 1) {
    if (!this.enabled) return;
    this.init();
    this.resume();
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;

    // 主吸入音 - 频率上升
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(200, now);
    osc1.frequency.exponentialRampToValueAtTime(800, now + duration * 0.7);
    osc1.frequency.exponentialRampToValueAtTime(1200, now + duration);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(300, now);
    osc2.frequency.exponentialRampToValueAtTime(1500, now + duration);

    // LFO 调制
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(2, now);
    lfo.frequency.linearRampToValueAtTime(20, now + duration);
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35 * intensity, now + 0.1);
    gain.gain.setValueAtTime(0.35 * intensity, now + duration - 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + duration);
    filter.Q.value = 5;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
    lfo.stop(now + duration);

    // 吸入结束的爆裂声
    setTimeout(() => this.playExplosion(0.4, 0.6), duration * 800);
  }

  // 挣脱/破体音效 - 高音爆炸
  playEscape(duration = 0.6, intensity = 1) {
    if (!this.enabled) return;
    this.init();
    this.resume();
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;

    // 蓄力上升
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(1500, now + duration * 0.6);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4 * intensity, now + duration * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration);

    // 随后的大爆炸
    setTimeout(() => this.playExplosion(1.0, 1.2), duration * 500);
  }

  // KO 音效 - 下行音阶 + 大爆炸
  playKO(duration = 1.5, intensity = 1) {
    if (!this.enabled) return;
    this.playExplosion(1.2, intensity);

    setTimeout(() => {
      this.init();
      this.resume();
      const ctx = this.audioContext;
      if (!ctx) return;
      const now = ctx.currentTime;

      const notes = [523, 440, 349, 262]; // C5, A4, F4, C4 下行
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = freq;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now + i * 0.15);
        gain.gain.linearRampToValueAtTime(0.15 * intensity, now + i * 0.15 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.35);
      });
    }, 300);
  }

  // 选择/点击音效
  playClick(pitch = 1, intensity = 0.6) {
    if (!this.enabled) return;
    this.init();
    this.resume();
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 600 * pitch;
    osc.frequency.exponentialRampToValueAtTime(900 * pitch, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2 * intensity, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // UI 选择音效（卡片选中）
  playSelect() {
    this.playClick(1.3, 0.7);
    setTimeout(() => this.playClick(1.6, 0.5), 80);
  }

  // 战斗开始 - 上升音阶 + 冲击
  playBattleStart() {
    if (!this.enabled) return;
    this.init();
    this.resume();
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [262, 330, 392, 523, 659]; // C E G C E

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const startTime = now + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.25);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 3000;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });

    // 最后的冲击
    setTimeout(() => this.playStrike(0.4, 1), 550);
  }

  // 胜利音效 - 上升琶音
  playVictory() {
    if (!this.enabled) return;
    this.init();
    this.resume();
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;
    // C大调胜利琶音: C E G C E G C
    const notes = [523, 659, 784, 1047, 1319, 1568, 2093];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;

      const gain = ctx.createGain();
      const startTime = now + i * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startTime);
      osc2.start(startTime);
      osc.stop(startTime + 0.4);
      osc2.stop(startTime + 0.4);
    });

    // 最后和弦
    setTimeout(() => {
      [523, 659, 784].forEach(freq => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const gain = ctx.createGain();
        const t = ctx.currentTime;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t);
        osc.stop(t + 0.85);
      });
    }, 900);
  }

  // 暴击/特殊音效 - 闪光
  playCritical() {
    if (!this.enabled) return;
    this.init();
    this.resume();
    const ctx = this.audioContext;
    if (!ctx) return;

    const now = ctx.currentTime;

    // 高频闪烁
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 1500 + i * 300;

      const gain = ctx.createGain();
      const startTime = now + i * 0.05;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startTime);
      osc.stop(startTime + 0.12);
    }
  }

  // 背景BGM - 简单的循环低音脉冲 + 旋律
  startBattleMusic() {
    if (!this.enabled) return;
    this.init();
    this.resume();
    const ctx = this.audioContext;
    if (!ctx) return;

    this.stopMusic();

    // 低音脉冲
    const bassOsc = ctx.createOscillator();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.value = 80;

    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 300;

    const bassGain = ctx.createGain();
    bassGain.gain.value = 0;

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(this.musicGain);

    // 节奏控制
    const tempo = 0.5;
    const bassPattern = [1, 0, 0.6, 0, 1, 0, 0.6, 0.4];
    let beatIndex = 0;

    const pulseBass = () => {
      if (!this.currentMusic) return;
      const now = ctx.currentTime;
      const intensity = bassPattern[beatIndex % bassPattern.length];
      if (intensity > 0) {
        bassGain.gain.cancelScheduledValues(now);
        bassGain.gain.setValueAtTime(0, now);
        bassGain.gain.linearRampToValueAtTime(0.2 * intensity, now + 0.05);
        bassGain.gain.exponentialRampToValueAtTime(0.01, now + tempo * 0.8);
      }

      // 旋律音符
      const melody = [523, 0, 659, 0, 784, 659, 523, 0];
      const note = melody[beatIndex % melody.length];
      if (note > 0) {
        const melOsc = ctx.createOscillator();
        melOsc.type = 'triangle';
        melOsc.frequency.value = note;

        const melGain = ctx.createGain();
        melGain.gain.setValueAtTime(0, now);
        melGain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        melGain.gain.exponentialRampToValueAtTime(0.01, now + tempo * 0.7);

        const melFilter = ctx.createBiquadFilter();
        melFilter.type = 'lowpass';
        melFilter.frequency.value = 2000;

        melOsc.connect(melFilter);
        melFilter.connect(melGain);
        melGain.connect(this.musicGain);

        melOsc.start(now);
        melOsc.stop(now + tempo);
      }

      beatIndex++;
    };

    bassOsc.start();
    this.currentMusic = {
      oscillators: [bassOsc],
      interval: setInterval(pulseBass, tempo * 1000)
    };
  }

  startMenuMusic() {
    if (!this.enabled) return;
    this.init();
    this.resume();
    const ctx = this.audioContext;
    if (!ctx) return;

    this.stopMusic();

    // 氛围音乐 - 缓慢的 pad 音色
    const padOsc1 = ctx.createOscillator();
    padOsc1.type = 'sine';
    padOsc1.frequency.value = 130.81; // C3

    const padOsc2 = ctx.createOscillator();
    padOsc2.type = 'sine';
    padOsc2.frequency.value = 196.00; // G3

    const padOsc3 = ctx.createOscillator();
    padOsc3.type = 'triangle';
    padOsc3.frequency.value = 261.63; // C4

    const padGain = ctx.createGain();
    padGain.gain.value = 0.06;

    // 缓慢颤音 LFO
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.3;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(padGain.gain);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    padOsc1.connect(filter);
    padOsc2.connect(filter);
    padOsc3.connect(filter);
    filter.connect(padGain);
    padGain.connect(this.musicGain);

    padOsc1.start();
    padOsc2.start();
    padOsc3.start();
    lfo.start();

    this.currentMusic = {
      oscillators: [padOsc1, padOsc2, padOsc3, lfo],
      interval: null
    };
  }

  stopMusic() {
    if (this.currentMusic) {
      if (this.currentMusic.interval) {
        clearInterval(this.currentMusic.interval);
      }
      const ctx = this.audioContext;
      if (ctx) {
        const now = ctx.currentTime;
        this.currentMusic.oscillators.forEach(osc => {
          try {
            osc.stop(now + 0.1);
          } catch (e) {}
        });
      }
      this.currentMusic = null;
    }
  }

  // ============ 语音播报 ============
  speak(text, priority = false) {
    if (!this.voiceEnabled || !window.speechSynthesis) return;

    try {
      if (priority) {
        window.speechSynthesis.cancel();
      }
      if (window.speechSynthesis.speaking && !priority) {
        return;
      }

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'zh-CN';
      utter.rate = 1.15;
      utter.pitch = 1.1;
      utter.volume = 0.9;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.log('语音播报失败:', e.message);
    }
  }

  setMasterVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  toggleEnabled() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopMusic();
    }
    return this.enabled;
  }
}

// 全局实例
window.AudioSystem = AudioSystem;
window.gameAudio = new AudioSystem();
