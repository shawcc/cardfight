// 战斗系统核心逻辑
function createFighter(card) {
  return {
    ...card,
    currentHp: card.hp,
    currentEnergy: card.energy,
    maxHp: card.hp,
    maxEnergy: card.energy,
    isDead: false,
    isAbsorbed: false,
    absorbedBy: null,
    absorbEscapeTurns: 0,
    animationState: 'idle'
  };
}

// 计算实际伤害
function calculateDamage(attacker, defender, skill) {
  const baseDamage = skill.damage;
  const atkFactor = attacker.atk / 100;
  const defFactor = defender.def / 100;
  const speedBonus = (attacker.spd - defender.spd) / 200;

  let rawDamage = baseDamage * (1 + atkFactor) * (1 - defFactor * 0.6);
  rawDamage = rawDamage * (1 + speedBonus);

  if (skill.critical) {
    rawDamage = rawDamage * (1.15 + Math.random() * 0.2);
  } else {
    rawDamage = rawDamage * (0.9 + Math.random() * 0.2);
  }

  const variance = 0.9 + Math.random() * 0.2;
  rawDamage = rawDamage * variance;

  return Math.max(5, Math.floor(rawDamage));
}

// 决定回合顺序 - 速度快的先手
function determineTurnOrder(fighter1, fighter2) {
  const spdDiff = fighter1.spd - fighter2.spd;
  if (spdDiff > 10) {
    return [fighter1, fighter2];
  } else if (spdDiff < -10) {
    return [fighter2, fighter1];
  } else {
    return Math.random() > 0.5 ? [fighter1, fighter2] : [fighter2, fighter1];
  }
}

// 选择技能 (AI逻辑)
function selectSkill(fighter, isSpecialEnabled, isFirstTurn) {
  const availableSkills = fighter.skills.filter(s => s.energyCost <= fighter.currentEnergy);

  if (availableSkills.length === 0) {
    return { name: '普通攻击', damage: Math.floor(fighter.atk * 1.2), type: 'strike', energyCost: 0 };
  }

  // 如果有吸收能力且可以使用，高概率触发（尤其在开始几回合）
  if (isSpecialEnabled && fighter.specialAbility === 'absorb' && !fighter.hasAbsorbedThisBattle) {
    const absorbSkill = availableSkills.find(s => s.type === 'absorb');
    if (absorbSkill && fighter.currentEnergy >= absorbSkill.energyCost) {
      // 前5回合高概率触发吸收
      if (isFirstTurn || Math.random() > 0.25) {
        fighter.hasAbsorbedThisBattle = true;
        return absorbSkill;
      }
    }
  }

  // 被吸收时，使用高伤害技能从体内攻击
  if (fighter.isAbsorbed) {
    const powerful = availableSkills.filter(s => s.critical);
    if (powerful.length > 0 && fighter.currentEnergy >= 50) {
      return powerful[Math.floor(Math.random() * powerful.length)];
    }
  }

  const criticalSkills = availableSkills.filter(s => s.critical && s.type !== 'absorb');
  const normalSkills = availableSkills.filter(s => !s.critical);

  if (criticalSkills.length > 0 && fighter.currentEnergy >= 70 && Math.random() > 0.4) {
    return criticalSkills[Math.floor(Math.random() * criticalSkills.length)];
  } else if (normalSkills.length > 0) {
    return normalSkills[Math.floor(Math.random() * normalSkills.length)];
  } else {
    return availableSkills[0];
  }
}

// 执行一次攻击
function performAttack(attacker, defender, isSpecialEnabled, round) {
  // 记录攻击前是否在体内
  const wasInBody = attacker.isAbsorbed && attacker.absorbedBy === defender;

  const skill = selectSkill(attacker, isSpecialEnabled, round <= 5);
  let damage = calculateDamage(attacker, defender, skill);
  let isAbsorb = skill.type === 'absorb';
  let absorbTriggered = false;

  attacker.currentEnergy = Math.max(0, attacker.currentEnergy - skill.energyCost);

  // 在体内攻击，伤害更高
  if (wasInBody) {
    damage = Math.floor(damage * 1.5);
  }

  defender.currentHp = Math.max(0, defender.currentHp - damage);

  if (defender.currentHp <= 0) {
    defender.isDead = true;
  }

  // 触发吸收
  if (isAbsorb && !defender.isDead && !defender.isAbsorbed) {
    absorbTriggered = true;
    defender.isAbsorbed = true;
    defender.absorbedBy = attacker;
    defender.absorbEscapeTurns = 3 + Math.floor(Math.random() * 3);
  }

  // 检查被吸收者能否破体而出
  let justEscaped = false;
  if (wasInBody) {
    attacker.absorbEscapeTurns--;
    if (attacker.absorbEscapeTurns <= 0 && !defender.isDead) {
      attacker.isAbsorbed = false;
      attacker.absorbedBy = null;
      justEscaped = true;
    }
  }

  attacker.currentEnergy = Math.min(attacker.maxEnergy, attacker.currentEnergy + 15);

  return {
    attackerName: attacker.name,
    defenderName: defender.name,
    skillName: skill.name,
    skillType: skill.type,
    damage: damage,
    critical: skill.critical || false,
    defenderHp: defender.currentHp,
    defenderMaxHp: defender.maxHp,
    attackerEnergy: attacker.currentEnergy,
    attackerMaxEnergy: attacker.maxEnergy,
    isKilled: defender.isDead,
    isAbsorb: absorbTriggered,
    isInBody: wasInBody,
    escapedBody: justEscaped
  };
}

// 生成战斗事件序列
function generateBattleEvents(card1, card2) {
  const f1 = createFighter(card1);
  const f2 = createFighter(card2);
  const events = [];
  const hasGanQ = (f1.id === 'gan-q' || f2.id === 'gan-q');

  events.push({
    type: 'battle-start',
    message: '战斗开始！',
    fighters: [
      { name: f1.name, hp: f1.currentHp, maxHp: f1.maxHp, energy: f1.currentEnergy, maxEnergy: f1.maxEnergy, color: f1.color },
      { name: f2.name, hp: f2.currentHp, maxHp: f2.maxHp, energy: f2.currentEnergy, maxEnergy: f2.maxEnergy, color: f2.color }
    ]
  });

  let round = 1;
  const maxRounds = 18;

  function processAttackResult(result, attacker, defender, isLeftAttacker) {
    result.attackerSide = isLeftAttacker ? 'left' : 'right';
    result.round = round;

    // 确定事件类型
    if (result.escapedBody) {
      result.type = 'escape';
      result.message = `${attacker.name} 冲破 ${defender.name} 的身体，挣脱出来！`;
    } else if (result.isAbsorb) {
      result.type = 'absorb';
      result.message = `${defender.name} 被 ${attacker.name} 吸入体内！`;
    } else if (result.isInBody) {
      result.type = 'body-attack';
      result.message = `${attacker.name} 在 ${defender.name} 体内发起攻击！`;
    } else {
      result.type = 'attack';
    }

    events.push(result);
  }

  while (!f1.isDead && !f2.isDead && round <= maxRounds) {
    const [first, second] = determineTurnOrder(f1, f2);
    const other = first === f1 ? f2 : f1;

    // 先手攻击 - performAttack 直接修改了 fighter 对象的状态
    const firstAttack = performAttack(first, other, hasGanQ, round);
    processAttackResult(firstAttack, first, other, first === f1);

    if (f1.isDead || f2.isDead) break;

    // 后手攻击
    const secondAttack = performAttack(other, first, hasGanQ, round);
    processAttackResult(secondAttack, other, first, other === f1);

    round++;
  }

  // 战斗结束
  let winner, loser;
  if (f1.isDead && f2.isDead) {
    events.push({ type: 'battle-end', message: '双方同归于尽！平手！', result: 'draw' });
  } else if (f1.isDead) {
    events.push({ type: 'battle-end', message: `${f2.name} 获得胜利！`, result: 'right-wins', winner: f2.name });
  } else {
    events.push({ type: 'battle-end', message: `${f1.name} 获得胜利！`, result: 'left-wins', winner: f1.name });
  }

  return events;
}

// 计算卡片实力评价
function evaluateCard(card) {
  const score = card.hp * 0.3 + card.atk * 3 + card.def * 2 + card.spd * 1.5;
  if (score >= 800) return { level: 'S', desc: '传说级' };
  if (score >= 700) return { level: 'A', desc: '精英级' };
  if (score >= 600) return { level: 'B', desc: '强韧级' };
  if (score >= 500) return { level: 'C', desc: '标准级' };
  return { level: 'D', desc: '基础级' };
}

window.createFighter = createFighter;
window.calculateDamage = calculateDamage;
window.performAttack = performAttack;
window.generateBattleEvents = generateBattleEvents;
window.evaluateCard = evaluateCard;
