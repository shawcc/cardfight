const ULTRAMAN_CARDS = [
  {
    id: 'tiga',
    name: '迪迦奥特曼',
    type: 'hero',
    rarity: 'SSR',
    hp: 850,
    atk: 85,
    def: 60,
    spd: 75,
    energy: 100,
    color: '#c0392b',
    skills: [
      { name: '哉佩利敖光线', damage: 150, type: 'beam', energyCost: 50 },
      { name: '闪耀爆裂', damage: 80, type: 'strike', energyCost: 20 },
      { name: '迪拉修姆光流', damage: 200, type: 'beam', energyCost: 80, critical: true }
    ]
  },
  {
    id: 'dyna',
    name: '戴拿奥特曼',
    type: 'hero',
    rarity: 'SSR',
    hp: 820,
    atk: 90,
    def: 55,
    spd: 80,
    energy: 100,
    color: '#e67e22',
    skills: [
      { name: '索尔捷特光线', damage: 160, type: 'beam', energyCost: 50 },
      { name: '闪亮光刀', damage: 90, type: 'strike', energyCost: 20 },
      { name: '加尔奈特轰炸', damage: 210, type: 'beam', energyCost: 85, critical: true }
    ]
  },
  {
    id: 'gaia',
    name: '盖亚奥特曼',
    type: 'hero',
    rarity: 'SSR',
    hp: 900,
    atk: 80,
    def: 75,
    spd: 65,
    energy: 100,
    color: '#e74c3c',
    skills: [
      { name: '光子冰刀', damage: 145, type: 'beam', energyCost: 45 },
      { name: '量子流线', damage: 180, type: 'beam', energyCost: 60 },
      { name: '光子粉碎机', damage: 230, type: 'strike', energyCost: 90, critical: true }
    ]
  },
  {
    id: 'zero',
    name: '赛罗奥特曼',
    type: 'hero',
    rarity: 'UR',
    hp: 880,
    atk: 95,
    def: 65,
    spd: 90,
    energy: 100,
    color: '#1abc9c',
    skills: [
      { name: '艾梅利姆光线', damage: 130, type: 'beam', energyCost: 40 },
      { name: '赛罗飞踢', damage: 95, type: 'strike', energyCost: 20 },
      { name: '终极赛罗之剑', damage: 250, type: 'strike', energyCost: 90, critical: true }
    ]
  },
  {
    id: 'cosmos',
    name: '高斯奥特曼',
    type: 'hero',
    rarity: 'SR',
    hp: 780,
    atk: 70,
    def: 70,
    spd: 85,
    energy: 100,
    color: '#2ecc71',
    skills: [
      { name: '满月波', damage: 120, type: 'beam', energyCost: 40 },
      { name: '高斯重击', damage: 85, type: 'strike', energyCost: 20 },
      { name: '未来光流', damage: 190, type: 'beam', energyCost: 70, critical: true }
    ]
  },
  {
    id: 'nexus',
    name: '奈克瑟斯奥特曼',
    type: 'hero',
    rarity: 'SSR',
    hp: 830,
    atk: 88,
    def: 62,
    spd: 78,
    energy: 100,
    color: '#3498db',
    skills: [
      { name: '十字光流', damage: 135, type: 'beam', energyCost: 45 },
      { name: '青年形态踢', damage: 88, type: 'strike', energyCost: 20 },
      { name: '终极光流', damage: 215, type: 'beam', energyCost: 80, critical: true }
    ]
  },
  {
    id: 'mebius',
    name: '梦比优斯奥特曼',
    type: 'hero',
    rarity: 'SSR',
    hp: 800,
    atk: 82,
    def: 60,
    spd: 82,
    energy: 100,
    color: '#f39c12',
    skills: [
      { name: '梦比姆射线', damage: 140, type: 'beam', energyCost: 45 },
      { name: '梦比姆光弹', damage: 85, type: 'strike', energyCost: 20 },
      { name: '梦比姆光剑', damage: 200, type: 'strike', energyCost: 75, critical: true }
    ]
  },
  {
    id: 'taiga',
    name: '泰迦奥特曼',
    type: 'hero',
    rarity: 'SR',
    hp: 840,
    atk: 87,
    def: 63,
    spd: 80,
    energy: 100,
    color: '#e74c3c',
    skills: [
      { name: '斯特利姆光线', damage: 142, type: 'beam', energyCost: 45 },
      { name: '泰迦轰炸', damage: 92, type: 'strike', energyCost: 22 },
      { name: '泰迦炸弹', damage: 220, type: 'beam', energyCost: 85, critical: true }
    ]
  },
  {
    id: 'zett',
    name: '泽塔奥特曼',
    type: 'hero',
    rarity: 'UR',
    hp: 870,
    atk: 92,
    def: 68,
    spd: 88,
    energy: 100,
    color: '#27ae60',
    skills: [
      { name: '泽斯帝姆光线', damage: 155, type: 'beam', energyCost: 50 },
      { name: '泽塔光剑', damage: 98, type: 'strike', energyCost: 25 },
      { name: '德尔塔天爪', damage: 260, type: 'strike', energyCost: 95, critical: true }
    ]
  },
  {
    id: 'man',
    name: '初代奥特曼',
    type: 'hero',
    rarity: 'SSR',
    hp: 820,
    atk: 80,
    def: 65,
    spd: 70,
    energy: 100,
    color: '#d35400',
    skills: [
      { name: '斯派修姆光线', damage: 140, type: 'beam', energyCost: 45 },
      { name: '八分光轮', damage: 88, type: 'strike', energyCost: 20 },
      { name: '超级斯派修姆', damage: 210, type: 'beam', energyCost: 85, critical: true }
    ]
  },
  {
    id: 'seven',
    name: '赛文奥特曼',
    type: 'hero',
    rarity: 'SSR',
    hp: 800,
    atk: 85,
    def: 70,
    spd: 72,
    energy: 100,
    color: '#c0392b',
    skills: [
      { name: '艾梅利姆光线', damage: 135, type: 'beam', energyCost: 40 },
      { name: '头镖攻击', damage: 92, type: 'strike', energyCost: 22 },
      { name: '集束光线', damage: 220, type: 'beam', energyCost: 85, critical: true }
    ]
  },
  {
    id: 'jack',
    name: '杰克奥特曼',
    type: 'hero',
    rarity: 'SR',
    hp: 810,
    atk: 82,
    def: 63,
    spd: 70,
    energy: 100,
    color: '#e74c3c',
    skills: [
      { name: '斯派修姆光线', damage: 135, type: 'beam', energyCost: 45 },
      { name: '奥特手镯', damage: 90, type: 'strike', energyCost: 22 },
      { name: '希奈拉马射线', damage: 205, type: 'beam', energyCost: 80, critical: true }
    ]
  },
  {
    id: 'ace',
    name: '艾斯奥特曼',
    type: 'hero',
    rarity: 'SR',
    hp: 790,
    atk: 85,
    def: 60,
    spd: 75,
    energy: 100,
    color: '#9b59b6',
    skills: [
      { name: '梅塔利姆光线', damage: 138, type: 'beam', energyCost: 45 },
      { name: '艾斯切割', damage: 95, type: 'strike', energyCost: 22 },
      { name: '究极断头刀', damage: 225, type: 'strike', energyCost: 85, critical: true }
    ]
  },
  {
    id: 'leo',
    name: '雷欧奥特曼',
    type: 'hero',
    rarity: 'SSR',
    hp: 850,
    atk: 95,
    def: 60,
    spd: 85,
    energy: 100,
    color: '#c0392b',
    skills: [
      { name: '射击光线', damage: 130, type: 'beam', energyCost: 40 },
      { name: '雷欧飞踢', damage: 110, type: 'strike', energyCost: 25 },
      { name: '宇宙幻兽拳', damage: 240, type: 'strike', energyCost: 90, critical: true }
    ]
  },
  {
    id: 'astral',
    name: '阿斯特拉',
    type: 'hero',
    rarity: 'SR',
    hp: 820,
    atk: 92,
    def: 58,
    spd: 83,
    energy: 100,
    color: '#e67e22',
    skills: [
      { name: '射击光束', damage: 125, type: 'beam', energyCost: 40 },
      { name: '阿斯特拉踢', damage: 100, type: 'strike', energyCost: 22 },
      { name: '双重光线', damage: 195, type: 'beam', energyCost: 75, critical: true }
    ]
  },
  {
    id: 'tigadark',
    name: '黑暗迪迦',
    type: 'hero',
    rarity: 'UR',
    hp: 900,
    atk: 100,
    def: 70,
    spd: 75,
    energy: 100,
    color: '#2c3e50',
    skills: [
      { name: '黑暗哉佩利敖', damage: 170, type: 'beam', energyCost: 55 },
      { name: '黑暗爆裂', damage: 115, type: 'strike', energyCost: 30 },
      { name: '暗黑毁灭', damage: 280, type: 'beam', energyCost: 95, critical: true }
    ]
  }
];

const MONSTER_CARDS = [
  {
    id: 'golza',
    name: '哥尔赞',
    type: 'monster',
    rarity: 'SR',
    hp: 880,
    atk: 85,
    def: 75,
    spd: 60,
    energy: 100,
    color: '#8e44ad',
    skills: [
      { name: '超音波光线', damage: 130, type: 'beam', energyCost: 45 },
      { name: '撕裂爪击', damage: 95, type: 'strike', energyCost: 22 },
      { name: '黑暗火焰', damage: 200, type: 'beam', energyCost: 80, critical: true }
    ]
  },
  {
    id: 'melba',
    name: '美尔巴',
    type: 'monster',
    rarity: 'SR',
    hp: 750,
    atk: 80,
    def: 50,
    spd: 90,
    energy: 100,
    color: '#795548',
    skills: [
      { name: '眼部光束', damage: 120, type: 'beam', energyCost: 40 },
      { name: '俯冲撞击', damage: 90, type: 'strike', energyCost: 20 },
      { name: '毁灭之翼', damage: 180, type: 'beam', energyCost: 70, critical: true }
    ]
  },
  {
    id: 'gan-q',
    name: '加恩Q',
    type: 'monster',
    rarity: 'SSR',
    hp: 1100,
    atk: 78,
    def: 85,
    spd: 70,
    energy: 110,
    color: '#607d8b',
    specialAbility: 'absorb',
    skills: [
      { name: '眼部光线', damage: 125, type: 'beam', energyCost: 42 },
      { name: '触手缠绕', damage: 88, type: 'strike', energyCost: 22 },
      { name: '深渊吸收', damage: 210, type: 'absorb', energyCost: 90, critical: true }
    ]
  },
  {
    id: 'gazort',
    name: '加佐特',
    type: 'monster',
    rarity: 'SR',
    hp: 780,
    atk: 82,
    def: 55,
    spd: 85,
    energy: 100,
    color: '#5d6d7e',
    skills: [
      { name: '等离子光弹', damage: 128, type: 'beam', energyCost: 42 },
      { name: '闪电咬击', damage: 90, type: 'strike', energyCost: 22 },
      { name: '超级等离子', damage: 195, type: 'beam', energyCost: 75, critical: true }
    ]
  },
  {
    id: 'reicubas',
    name: '雷丘巴斯',
    type: 'monster',
    rarity: 'SSR',
    hp: 900,
    atk: 88,
    def: 72,
    spd: 65,
    energy: 100,
    color: '#3498db',
    skills: [
      { name: '极寒光线', damage: 145, type: 'beam', energyCost: 50 },
      { name: '冰冻撕咬', damage: 98, type: 'strike', energyCost: 25 },
      { name: '绝对零度', damage: 225, type: 'beam', energyCost: 85, critical: true }
    ]
  },
  {
    id: 'satan-beetle',
    name: '撒旦比索',
    type: 'monster',
    rarity: 'SSR',
    hp: 870,
    atk: 90,
    def: 70,
    spd: 70,
    energy: 100,
    color: '#27ae60',
    skills: [
      { name: '甲虫射线', damage: 140, type: 'beam', energyCost: 50 },
      { name: '角击', damage: 105, type: 'strike', energyCost: 25 },
      { name: '宇宙甲虫爆击', damage: 230, type: 'beam', energyCost: 90, critical: true }
    ]
  },
  {
    id: 'baltan',
    name: '巴尔坦星人',
    type: 'monster',
    rarity: 'SSR',
    hp: 800,
    atk: 85,
    def: 55,
    spd: 95,
    energy: 100,
    color: '#16a085',
    skills: [
      { name: '钳制光线', damage: 135, type: 'beam', energyCost: 45 },
      { name: '分身袭击', damage: 100, type: 'strike', energyCost: 25 },
      { name: '亿兆分身', damage: 215, type: 'beam', energyCost: 85, critical: true }
    ]
  },
  {
    id: 'red-king',
    name: '红王',
    type: 'monster',
    rarity: 'SSR',
    hp: 920,
    atk: 95,
    def: 75,
    spd: 55,
    energy: 100,
    color: '#c0392b',
    skills: [
      { name: '强力爆裂', damage: 150, type: 'beam', energyCost: 55 },
      { name: '碎骨拳', damage: 115, type: 'strike', energyCost: 30 },
      { name: '岩浆毁灭', damage: 245, type: 'strike', energyCost: 90, critical: true }
    ]
  },
  {
    id: 'gomora',
    name: '哥莫拉',
    type: 'monster',
    rarity: 'SSR',
    hp: 930,
    atk: 92,
    def: 78,
    spd: 58,
    energy: 100,
    color: '#d35400',
    skills: [
      { name: '超振动波', damage: 148, type: 'beam', energyCost: 50 },
      { name: '尾鞭攻击', damage: 105, type: 'strike', energyCost: 25 },
      { name: '爆发超振动', damage: 240, type: 'beam', energyCost: 90, critical: true }
    ]
  },
  {
    id: 'eleking',
    name: '艾雷王',
    type: 'monster',
    rarity: 'SR',
    hp: 780,
    atk: 85,
    def: 55,
    spd: 78,
    energy: 100,
    color: '#f1c40f',
    skills: [
      { name: '电光射线', damage: 130, type: 'beam', energyCost: 45 },
      { name: '鞭尾电击', damage: 95, type: 'strike', energyCost: 25 },
      { name: '高电压毁灭', damage: 205, type: 'beam', energyCost: 80, critical: true }
    ]
  },
  {
    id: 'bemstar',
    name: '贝蒙斯坦',
    type: 'monster',
    rarity: 'SSR',
    hp: 870,
    atk: 82,
    def: 80,
    spd: 55,
    energy: 100,
    color: '#9b59b6',
    skills: [
      { name: '腹部吸收', damage: 135, type: 'beam', energyCost: 45 },
      { name: '能量光线', damage: 95, type: 'strike', energyCost: 25 },
      { name: '吞噬黑暗', damage: 215, type: 'beam', energyCost: 85, critical: true }
    ]
  },
  {
    id: 'kingjoe',
    name: '金古桥',
    type: 'monster',
    rarity: 'SSR',
    hp: 950,
    atk: 88,
    def: 85,
    spd: 50,
    energy: 100,
    color: '#7f8c8d',
    skills: [
      { name: '佩丹元素炮', damage: 145, type: 'beam', energyCost: 55 },
      { name: '铁拳轰击', damage: 110, type: 'strike', energyCost: 30 },
      { name: '分离四体攻击', damage: 240, type: 'strike', energyCost: 90, critical: true }
    ]
  },
  {
    id: 'geronimon',
    name: '杰罗尼蒙',
    type: 'monster',
    rarity: 'SR',
    hp: 790,
    atk: 80,
    def: 60,
    spd: 75,
    energy: 100,
    color: '#8e44ad',
    skills: [
      { name: '毒烟喷射', damage: 120, type: 'beam', energyCost: 40 },
      { name: '毒牙撕咬', damage: 88, type: 'strike', energyCost: 20 },
      { name: '毒雾爆发', damage: 190, type: 'beam', energyCost: 75, critical: true }
    ]
  },
  {
    id: 'pestar',
    name: '佩斯塔',
    type: 'monster',
    rarity: 'SR',
    hp: 770,
    atk: 82,
    def: 55,
    spd: 80,
    energy: 100,
    color: '#2980b9',
    skills: [
      { name: '火焰喷射', damage: 125, type: 'beam', energyCost: 42 },
      { name: '石油爆发', damage: 92, type: 'strike', energyCost: 22 },
      { name: '海底烈焰', damage: 195, type: 'beam', energyCost: 78, critical: true }
    ]
  },
  {
    id: 'gubila',
    name: '古维拉',
    type: 'monster',
    rarity: 'SR',
    hp: 810,
    atk: 85,
    def: 62,
    spd: 65,
    energy: 100,
    color: '#34495e',
    skills: [
      { name: '鼻刺撞击', damage: 130, type: 'strike', energyCost: 45 },
      { name: '钻头攻击', damage: 98, type: 'strike', energyCost: 25 },
      { name: '深海冲刺', damage: 200, type: 'strike', energyCost: 80, critical: true }
    ]
  },
  {
    id: 'zetton',
    name: '杰顿',
    type: 'monster',
    rarity: 'UR',
    hp: 950,
    atk: 100,
    def: 80,
    spd: 70,
    energy: 100,
    color: '#1a1a1a',
    skills: [
      { name: '一兆度火球', damage: 170, type: 'beam', energyCost: 55 },
      { name: '光波反弹', damage: 110, type: 'strike', energyCost: 30 },
      { name: '终极光波', damage: 280, type: 'beam', energyCost: 95, critical: true }
    ]
  }
];

const ALL_CARDS = [...ULTRAMAN_CARDS, ...MONSTER_CARDS];

function getCardById(id) {
  return ALL_CARDS.find(c => c.id === id);
}

function getRandomCard() {
  return ALL_CARDS[Math.floor(Math.random() * ALL_CARDS.length)];
}

function getRandomByType(type) {
  const pool = type === 'hero' ? ULTRAMAN_CARDS : MONSTER_CARDS;
  return pool[Math.floor(Math.random() * pool.length)];
}

window.ULTRAMAN_CARDS = ULTRAMAN_CARDS;
window.MONSTER_CARDS = MONSTER_CARDS;
window.ALL_CARDS = ALL_CARDS;
window.getCardById = getCardById;
window.getRandomCard = getRandomCard;
window.getRandomByType = getRandomByType;
