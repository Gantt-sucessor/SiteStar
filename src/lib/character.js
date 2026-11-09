import {
  ABILITIES, SKILLS, WEAPON_GROUPS, CONDITION_TRACK, ARMOR_PENALTY, FEAT_LEVELS,
  classById, speciesById, armorByName, featByName,
} from '../data/rules.js';

export const abilityMod = (score) => Math.floor((score - 10) / 2);

export function newCharacter() {
  return {
    name: '', player: '', concept: '', era: 'rebeliao',
    species: '', classId: '', level: 1, xp: 0,
    abilityMethod: 'pointbuy',
    base: { vig: 8, des: 8, con: 8, int: 8, sab: 8, car: 8 },
    rolledPool: [],
    increases: { vig: 0, des: 0, con: 0, int: 0, sab: 0, car: 0 },
    trainedSkills: [], feats: [], talents: [], forcePowers: [], languages: [],
    weapons: [], armor: null, gear: [], credits: 0, creditsRolled: false,
    hp: { current: null, levelRolls: [], override: null },
    condition: 0, persistent: false,
    forcePoints: null, destinyPoints: 1, darkSide: 0,
    misc: { ref: 0, fort: 0, von: 0, threshold: 0 },
    details: { age: '', gender: '', height: '', weight: '', eyes: '', hair: '', skin: '', homeworld: '', appearance: '', personality: '', background: '' },
    notes: '',
  };
}

const hasPrefix = (list, name) => list.some((f) => f === name || f.startsWith(name + ' ('));

export function derive(c) {
  const cls = classById(c.classId);
  const sp = speciesById(c.species);
  const level = Math.max(1, Number(c.level) || 1);
  const halfLevel = Math.floor(level / 2);

  const scores = {};
  const mods = {};
  for (const a of ABILITIES) {
    scores[a.id] = (c.base?.[a.id] ?? 10) + (sp?.mods?.[a.id] ?? 0) + (c.increases?.[a.id] ?? 0);
    mods[a.id] = abilityMod(scores[a.id]);
  }

  // Talentos automáticos: iniciais de classe, de espécie e condicionais
  let startingFeats = cls ? [...cls.startingFeats] : [];
  if (sp?.primitive) startingFeats = startingFeats.filter((f) => !/\((pistolas|rifles|armas pesadas)\)/.test(f));
  const autoFeats = [...startingFeats, ...(sp?.bonusFeats ?? [])];
  if (sp?.conditionalFeat && (c.trainedSkills || []).includes(sp.conditionalFeat.skill)) autoFeats.push(sp.conditionalFeat.feat);
  const feats = [...autoFeats, ...(c.feats || [])];
  const has = (name) => hasPrefix(feats, name);
  const forceSensitive = has('Sensitividade da Força');
  const talents = c.talents || [];
  const hasTalent = (name) => talents.includes(name);

  const bab = !cls ? 0 : cls.bab === 'full' ? level : Math.floor((level * 3) / 4);
  const condition = CONDITION_TRACK[c.condition || 0] ?? CONDITION_TRACK[0];
  const cp = condition.penalty;

  const armor = c.armor ? armorByName(c.armor) : null;
  const armorProficient = armor ? has(`Proficiência em Armadura (${armor.category})`) : true;
  const armorSkillPenalty = armor && !armorProficient ? ARMOR_PENALTY[armor.category] : 0;
  const secondSkin = armor && armorProficient && hasTalent('Segunda Pele') ? 1 : 0;
  const armorRef = armor ? armor.ref + secondSkin : 0;
  const armorFort = armor ? armor.fort + (armor.fort ? secondSkin : 0) : 0;
  const maxDex = armor ? armor.maxDex + (armorProficient && hasTalent('Domínio de Armadura') ? 1 : 0) : Infinity;
  const dexToRef = Math.min(mods.des, maxDex);

  const spDef = sp?.defense ?? {};
  const clsDef = cls?.defense ?? {};
  const improved = has('Defesas Aprimoradas') ? 1 : 0;
  const martial = ['Artes Marciais I', 'Artes Marciais II', 'Artes Marciais III'].filter(has).length;

  let refBase = level;
  if (armor) {
    refBase = armorRef;
    if (armorProficient && hasTalent('Defesa Blindada Aprimorada')) refBase = Math.max(level + Math.floor(armorRef / 2), armorRef);
    else if (armorProficient && hasTalent('Defesa Blindada')) refBase = Math.max(level, armorRef);
  }

  const defenses = {
    ref: 10 + refBase + dexToRef + (clsDef.ref ?? 0) + (spDef.ref ?? 0) + improved + martial + (c.misc?.ref ?? 0) + cp,
    fort: 10 + level + mods.con + (clsDef.fort ?? 0) + armorFort + (spDef.fort ?? 0) + improved + (c.misc?.fort ?? 0) + cp,
    von: 10 + level + mods.sab + (clsDef.von ?? 0) + (spDef.von ?? 0) + improved + (c.misc?.von ?? 0) + cp,
  };
  const improvedThreshold = feats.filter((f) => f === 'Limiar de Dano Aprimorado').length;
  const threshold = defenses.fort - cp + improvedThreshold * 5 + (c.misc?.threshold ?? 0);

  const vitality = has('Vitalidade') ? level : 0;
  const levelRolls = (c.hp?.levelRolls || []).slice(0, level - 1).reduce((s, v) => s + v, 0);
  const hpComputed = cls ? cls.hp + mods.con + levelRolls + vitality : 0;
  const hpMax = c.hp?.override ?? hpComputed;
  const hpCurrent = c.hp?.current ?? hpMax;

  const forceBoon = feats.filter((f) => f === 'Bênção da Força').length;
  const fpMax = 5 + halfLevel + forceBoon * 3;
  const fpCurrent = c.forcePoints ?? fpMax;
  const forceDie = has('Forte na Força') ? 'd8' : 'd6';
  const fpDice = level >= 15 ? 3 : level >= 8 ? 2 : 1;

  let speed = sp?.speed ?? 6;
  if (armor && armor.category !== 'leve' && !(armorProficient && hasTalent('Juggernauta'))) speed = speed >= 6 ? 4 : 3;
  if (hasTalent('Passo Largo') && (!armor || armor.category === 'leve')) speed += 2;

  const trained = new Set(c.trainedSkills || []);
  for (const f of feats) if (f.startsWith('Treinamento em Perícia (')) trained.add(f.slice('Treinamento em Perícia ('.length, -1));
  const focus = new Set(feats.filter((f) => f.startsWith('Foco em Perícia (')).map((f) => f.slice('Foco em Perícia ('.length, -1)));
  const skills = SKILLS.filter((s) => !s.force || forceSensitive).map((s) => {
    const isTrained = trained.has(s.name);
    const usable = !s.trainedOnly || isTrained;
    const mod = halfLevel + mods[s.ability] + (isTrained ? 5 : 0) + (focus.has(s.name) ? 5 : 0)
      + (s.armor ? armorSkillPenalty : 0) + (sp?.skillBonus?.[s.name] ?? 0) + cp;
    const viaFeat = feats.includes(`Treinamento em Perícia (${s.name})`);
    return { ...s, trained: isTrained, viaFeat, focus: focus.has(s.name), usable, mod, classSkill: cls?.classSkills.includes(s.name) || (s.force && forceSensitive) };
  });

  const weaponFocus = (group) => has(`Foco em Arma (${WEAPON_GROUPS[group]})`) ? 1 : 0;
  const isProficient = (w) => {
    if (w.name === 'Desarmado') return true;
    if (w.group === 'exoticas') return has('Proficiência em Arma Exótica') || (w.name === 'Bowcaster' && sp?.id === 'wookiee' && has('Proficiência em Arma (rifles)'));
    return has(`Proficiência em Arma (${WEAPON_GROUPS[w.group]})`);
  };
  const weapons = (c.weapons || []).map((w) => {
    const finesse = w.melee && (w.light || w.group === 'sabres') && has('Acuidade com Arma');
    const abil = w.melee ? (finesse ? Math.max(mods.des, mods.vig) : mods.vig) : mods.des;
    const proficient = isProficient(w);
    const attack = bab + abil + weaponFocus(w.group) + (proficient ? 0 : -5) + (armor && !armorProficient ? ARMOR_PENALTY[armor.category] : 0) + cp + (Number(w.attackBonus) || 0);
    let dmgBonus = halfLevel + (Number(w.damageBonus) || 0);
    if (w.melee) dmgBonus += mods.vig;
    if (w.melee && hasTalent('Colisão Física')) dmgBonus += 1;
    if (w.group === 'sabres' && hasTalent('Especialização em Arma (sabres de luz)')) dmgBonus += 2;
    const damage = dmgBonus ? `${w.damage}${dmgBonus > 0 ? '+' : ''}${dmgBonus}` : w.damage;
    return { ...w, attack, damage, proficient };
  });

  // Contadores de criação / progressão
  const trainedSlots = cls ? Math.max(1, cls.trainedSkills + mods.int) + (sp?.bonusSkill ? 1 : 0) : 0;
  const featSlots = FEAT_LEVELS.filter((l) => l <= level).length + (sp?.bonusFeat ? 1 : 0) + (cls ? Math.floor(level / 2) : 0);
  const talentSlots = cls ? Math.ceil(level / 2) : 0;
  const forceTrainings = feats.filter((f) => f === 'Treinamento da Força').length;
  const powerSlots = forceTrainings * Math.max(1, 1 + mods.sab);
  const languageSlots = (sp?.languages?.length ?? 1) + Math.max(0, mods.int) + (has('Lingüística') ? Math.max(1, 1 + mods.int) : 0);

  return {
    cls, sp, level, halfLevel, scores, mods, feats, autoFeats, has, forceSensitive, bab,
    condition, armor, armorProficient, defenses, threshold, hpMax, hpCurrent, hpComputed,
    fpMax, fpCurrent, forceDie, fpDice, speed, skills, weapons,
    melee: bab + mods.vig + cp, ranged: bab + mods.des + cp, initiative: skills.find((s) => s.name === 'Iniciativa')?.mod ?? 0,
    trainedSlots, featSlots, talentSlots, powerSlots, languageSlots,
  };
}

export function featIsKnown(name) {
  return Boolean(featByName(name));
}

export function rollStats() {
  const one = () => {
    const r = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => b - a);
    return r[0] + r[1] + r[2];
  };
  return Array.from({ length: 6 }, one).sort((a, b) => b - a);
}
