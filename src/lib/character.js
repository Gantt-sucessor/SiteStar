import {
  ABILITIES, SKILLS, WEAPON_GROUPS, CONDITION_TRACK, ARMOR_PENALTY, FEAT_LEVELS,
  classById, speciesById, armorByName, featByName, FORCE_TREES, DROID_CATEGORIES, DROID_SIZES,
} from '../data/rules.js';
import { anyClassById, treesOfClass, classFeatures, ALL_TREES } from '../data/prestige.js';

export const abilityMod = (score) => Math.floor((score - 10) / 2);

export function newCharacter() {
  return {
    name: '', player: '', concept: '', era: 'rebeliao',
    species: '', classId: '', level: 1, xp: 0, droidCategory: '2', droidSize: 'medio',
    abilityMethod: 'pointbuy',
    base: { vig: 8, des: 8, con: 8, int: 8, sab: 8, car: 8 },
    rolledPool: [],
    increases: { vig: 0, des: 0, con: 0, int: 0, sab: 0, car: 0 },
    classLevels: null,
    trainedSkills: [], feats: [], talents: [], forcePowers: [], forceTechniques: [], forceSecrets: [], languages: [],
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

// Níveis por classe. Fichas antigas (só classId + level) viram { classId: level }.
export function getClassLevels(c) {
  const cl = c.classLevels && Object.keys(c.classLevels).length ? { ...c.classLevels } : {};
  if (!Object.keys(cl).length && c.classId) cl[c.classId] = Math.max(1, Number(c.level) || 1);
  return cl;
}

const babFor = (cls, lvl) => (cls.bab === 'full' ? lvl : Math.floor((lvl * 3) / 4));

export function derive(c) {
  const cls = classById(c.classId);
  const sp = speciesById(c.species);
  const classLevels = getClassLevels(c);
  const classes = Object.entries(classLevels)
    .map(([id, levels]) => ({ cls: anyClassById(id), levels: Number(levels) || 0 }))
    .filter((x) => x.cls && x.levels > 0)
    .sort((a, b) => (a.cls.id === c.classId ? -1 : b.cls.id === c.classId ? 1 : 0));
  const level = Math.max(1, classes.reduce((s, x) => s + x.levels, 0) || Number(c.level) || 1);
  const halfLevel = Math.floor(level / 2);
  const levelOf = (id) => classLevels[id] || 0;
  const classLabel = classes.length ? classes.map((x) => `${x.cls.name} ${x.levels}`).join(' / ') : (cls ? `${cls.name} ${level}` : '—');

  // Dróides: categoria e tamanho fazem o papel da espécie, e não existe Constituição
  const droid = Boolean(sp?.droid);
  const droidCat = droid ? DROID_CATEGORIES.find((x) => x.id === String(c.droidCategory || '2')) ?? DROID_CATEGORIES[1] : null;
  const droidSize = droid ? DROID_SIZES.find((x) => x.id === (c.droidSize || 'medio')) ?? DROID_SIZES[0] : null;
  const spMods = droid ? { ...droidCat.mods } : { ...(sp?.mods ?? {}) };
  if (droid) for (const [k, v] of Object.entries(droidSize.mods)) spMods[k] = (spMods[k] ?? 0) + v;
  const abilities = droid ? ABILITIES.filter((a) => a.id !== 'con') : ABILITIES;
  const spLabel = droid ? `Dróide ${droidSize.name} (${droidCat.name})` : sp?.name;

  const scores = {};
  const mods = {};
  for (const a of ABILITIES) {
    if (droid && a.id === 'con') { scores.con = null; mods.con = 0; continue; }
    scores[a.id] = Math.max(1, (c.base?.[a.id] ?? 10) + (spMods[a.id] ?? 0) + (c.increases?.[a.id] ?? 0));
    mods[a.id] = abilityMod(scores[a.id]);
  }

  // Talentos automáticos: iniciais de classe, de espécie e condicionais
  let startingFeats = cls ? [...cls.startingFeats] : [];
  if (sp?.primitive) startingFeats = startingFeats.filter((f) => !/\((pistolas|rifles|armas pesadas)\)/.test(f));
  const autoFeats = [...startingFeats, ...(sp?.bonusFeats ?? [])];
  if (sp?.conditionalFeat && (c.trainedSkills || []).includes(sp.conditionalFeat.skill)) autoFeats.push(sp.conditionalFeat.feat);
  const feats = [...autoFeats, ...(c.feats || [])];
  const has = (name) => hasPrefix(feats, name);
  const forceSensitive = !droid && has('Sensitividade da Força');
  const talents = c.talents || [];
  const hasTalent = (name) => talents.includes(name);

  const bab = classes.length ? classes.reduce((s, x) => s + babFor(x.cls, x.levels), 0) : 0;
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

  const spDef = droid ? { ref: droidSize.ref } : (sp?.defense ?? {});
  // Bônus de classe nas defesas não acumulam: vale o maior entre as classes
  const clsDef = { ref: 0, fort: 0, von: 0 };
  for (const x of classes) for (const k of ['ref', 'fort', 'von']) clsDef[k] = Math.max(clsDef[k], x.cls.defense?.[k] ?? 0);
  const niman = hasTalent('Niman') && (c.weapons || []).some((w) => w.group === 'sabres') ? 1 : 0;
  const improved = has('Defesas Aprimoradas') ? 1 : 0;
  const martial = ['Artes Marciais I', 'Artes Marciais II', 'Artes Marciais III'].filter(has).length;

  let refBase = level;
  if (armor) {
    refBase = armorRef;
    if (armorProficient && hasTalent('Defesa Blindada Aprimorada')) refBase = Math.max(level + Math.floor(armorRef / 2), armorRef);
    else if (armorProficient && hasTalent('Defesa Blindada')) refBase = Math.max(level, armorRef);
  }

  const defenses = {
    ref: 10 + refBase + dexToRef + clsDef.ref + (spDef.ref ?? 0) + improved + martial + niman + (c.misc?.ref ?? 0) + cp,
    fort: 10 + level + (droid ? mods.vig : mods.con) + clsDef.fort + armorFort + (spDef.fort ?? 0) + improved + (c.misc?.fort ?? 0) + cp,
    von: 10 + level + mods.sab + clsDef.von + (spDef.von ?? 0) + improved + niman + (c.misc?.von ?? 0) + cp,
  };
  const improvedThreshold = feats.filter((f) => f === 'Limiar de Dano Aprimorado').length;
  const threshold = defenses.fort - cp + improvedThreshold * 5 + (c.misc?.threshold ?? 0);

  const vitality = has('Vitalidade') ? level : 0;
  const levelRolls = (c.hp?.levelRolls || []).slice(0, level - 1).reduce((s, v) => s + v, 0);
  const hpComputed = cls ? cls.hp + mods.con + levelRolls + vitality : 0;
  const hpMax = c.hp?.override ?? hpComputed;
  const hpCurrent = c.hp?.current ?? hpMax;

  const forceBoon = feats.filter((f) => f === 'Bênção da Força').length;
  const fpBase = Math.max(5, ...classes.map((x) => x.cls.fpBase ?? 5));
  const fpMax = fpBase + halfLevel + forceBoon * 3;
  const fpCurrent = c.forcePoints ?? fpMax;
  const forceDie = has('Forte na Força') ? 'd8' : 'd6';
  const fpDice = level >= 15 ? 3 : level >= 8 ? 2 : 1;

  let speed = droid ? droidSize.speed : (sp?.speed ?? 6);
  if (armor && armor.category !== 'leve' && !(armorProficient && hasTalent('Juggernauta'))) speed = speed >= 6 ? 4 : 3;
  if (hasTalent('Passo Largo') && (!armor || armor.category === 'leve')) speed += 2;

  const classSkills = new Set(classes.flatMap((x) => x.cls.classSkills || []));
  const trained = new Set(c.trainedSkills || []);
  for (const f of feats) if (f.startsWith('Treinamento em Perícia (')) trained.add(f.slice('Treinamento em Perícia ('.length, -1));
  const focus = new Set(feats.filter((f) => f.startsWith('Foco em Perícia (')).map((f) => f.slice('Foco em Perícia ('.length, -1)));
  const skills = SKILLS.filter((s) => !s.force || forceSensitive).map((s) => {
    const isTrained = trained.has(s.name);
    const usable = !s.trainedOnly || isTrained;
    const mod = halfLevel + mods[s.ability] + (isTrained ? 5 : 0) + (focus.has(s.name) ? 5 : 0)
      + (s.armor ? armorSkillPenalty : 0) + (sp?.skillBonus?.[s.name] ?? 0) + (droid && s.name === 'Furtividade' ? droidSize.stealth : 0) + cp;
    const viaFeat = feats.includes(`Treinamento em Perícia (${s.name})`);
    return { ...s, trained: isTrained, viaFeat, focus: focus.has(s.name), usable, mod, classSkill: classSkills.has(s.name) || (s.force && forceSensitive) };
  });

  const weaponFocus = (group) => has(`Foco em Arma (${WEAPON_GROUPS[group]})`) ? 1 : 0;
  const isProficient = (w) => {
    if (w.name === 'Desarmado') return true;
    if (w.group === 'exoticas') return has('Proficiência em Arma Exótica') || hasTalent('Domínio de Arma Exótica') || (w.name === 'Bowcaster' && sp?.id === 'wookiee' && has('Proficiência em Arma (rifles)'));
    return has(`Proficiência em Arma (${WEAPON_GROUPS[w.group]})`);
  };
  const weapons = (c.weapons || []).map((w) => {
    const finesse = w.melee && (w.light || w.group === 'sabres') && has('Acuidade com Arma');
    const abil = w.melee ? (finesse ? Math.max(mods.des, mods.vig) : mods.vig) : mods.des;
    const proficient = isProficient(w);
    const greaterFocus = w.group === 'sabres' && hasTalent('Foco em Arma Maior (sabres de luz)') ? 1 : 0;
    const attack = bab + abil + weaponFocus(w.group) + greaterFocus + (proficient ? 0 : -5) + (armor && !armorProficient ? ARMOR_PENALTY[armor.category] : 0) + cp + (Number(w.attackBonus) || 0);
    let dmgBonus = halfLevel + (Number(w.damageBonus) || 0);
    if (w.melee) dmgBonus += mods.vig;
    if (w.melee && hasTalent('Colisão Física')) dmgBonus += 1;
    if (w.group === 'sabres' && hasTalent('Especialização em Arma (sabres de luz)')) dmgBonus += 2;
    if (w.group === 'sabres' && hasTalent('Especialização em Arma Maior (sabres de luz)')) dmgBonus += 2;
    if (w.group === 'sabres' && hasTalent('Ataru')) dmgBonus += mods.des - mods.vig;
    if (w.group === 'pistolas') dmgBonus += Math.floor(levelOf('pistoleiro') / 2);
    const damage = dmgBonus ? `${w.damage}${dmgBonus > 0 ? '+' : ''}${dmgBonus}` : w.damage;
    return { ...w, attack, damage, proficient };
  });

  // Contadores de criação / progressão
  const trainedSlots = cls ? Math.max(1, cls.trainedSkills + mods.int) + (sp?.bonusSkill ? 1 : 0) : 0;
  // Talentos: por nível de personagem + humano + bônus das classes heróicas (níveis pares)
  // + 1 talento inicial à escolha por cada classe heróica adicional (multiclasse)
  const heroic = classes.filter((x) => !x.cls.prestige && x.cls.startingFeats);
  const extraClassFeats = heroic.filter((x) => x.cls.id !== c.classId).length;
  const featSlots = FEAT_LEVELS.filter((l) => l <= level).length + (sp?.bonusFeat ? 1 : 0)
    + heroic.reduce((s, x) => s + Math.floor(x.levels / 2), 0) + extraClassFeats;
  const talentSlots = classes.reduce((s, x) => s + (x.cls.talentEveryLevel ? x.levels : Math.ceil(x.levels / 2)), 0);
  const techniqueSlots = classes.reduce((s, x) => s + (x.cls.techniques === 'even' ? Math.floor(x.levels / 2) : 0), 0);
  const secretSlots = classes.reduce((s, x) => s + (x.cls.secrets ? Math.max(0, x.levels - 1) : 0), 0);
  const damageReduction = Math.floor(levelOf('soldado-elite') / 2);
  const features = classes.map((x) => ({ cls: x.cls, list: classFeatures(x.cls, x.levels) })).filter((x) => x.list.length);
  const talentTrees = [];
  const seen = new Set();
  for (const x of classes) for (const t of treesOfClass(x.cls)) if (!seen.has(t.name)) { seen.add(t.name); talentTrees.push({ ...t, from: x.cls.name }); }
  if (forceSensitive) for (const t of FORCE_TREES) if (!seen.has(t.name)) { seen.add(t.name); talentTrees.push({ ...t, from: 'Força' }); }
  const forceTrainings = feats.filter((f) => f === 'Treinamento da Força').length;
  const powerSlots = forceTrainings * Math.max(1, 1 + mods.sab);
  const languageSlots = (sp?.languages?.length ?? 1) + Math.max(0, mods.int) + (has('Lingüística') ? Math.max(1, 1 + mods.int) : 0);

  return {
    cls, sp, level, halfLevel, scores, mods, feats, autoFeats, has, forceSensitive, bab,
    droid, droidCat, droidSize, abilities, spLabel, spMods,
    classes, classLevels, classLabel, levelOf, classSkills, heroic, extraClassFeats,
    techniqueSlots, secretSlots, damageReduction, features, talentTrees,
    condition, armor, armorProficient, defenses, threshold, hpMax, hpCurrent, hpComputed,
    fpMax, fpCurrent, forceDie, fpDice, speed, skills, weapons,
    melee: bab + mods.vig + cp, ranged: bab + mods.des + cp, initiative: skills.find((s) => s.name === 'Iniciativa')?.mod ?? 0,
    trainedSlots, featSlots, talentSlots, powerSlots, languageSlots,
  };
}

// Requisitos de uma classe de prestígio: retorna a lista do que falta.
export function prestigeMissing(pc, d, data) {
  const r = pc.req || {};
  const miss = [];
  const talents = data.talents || [];
  if (r.minLevel && d.level < r.minLevel) miss.push(`Nível de personagem ${r.minLevel}`);
  if (r.minBab && d.bab < r.minBab) miss.push(`BBA +${r.minBab}`);
  for (const sk of r.skills || []) if (!d.skills.find((x) => x.name === sk)?.trained) miss.push(`Treinado em ${sk}`);
  for (const f of r.feats || []) if (!d.has(f)) miss.push(`Talento ${f}`);
  if (r.treeTalents) {
    const names = r.treeTalents.trees.flatMap((t) => (ALL_TREES[t]?.talents || []).map(([n]) => n));
    if (talents.filter((t) => names.includes(t)).length < r.treeTalents.count) miss.push(`${r.treeTalents.count} aptidão(ões) de ${r.treeTalents.trees.join(' / ')}`);
  }
  if (r.forceTalents) {
    const names = FORCE_TREES.flatMap((t) => t.talents.map(([n]) => n));
    if (talents.filter((t) => names.includes(t)).length < r.forceTalents) miss.push(`${r.forceTalents} aptidões da Força`);
  }
  for (const p of r.powers || []) if (!(data.forcePowers || []).includes(p)) miss.push(`Poder ${p}`);
  if (r.techniques && (data.forceTechniques || []).length < r.techniques) miss.push('Uma Técnica da Força');
  if (r.darkSide && (data.darkSide || 0) < d.scores.sab) miss.push('Pontuação do Lado Sombrio igual à Sabedoria');
  return miss;
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
