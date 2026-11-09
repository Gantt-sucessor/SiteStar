import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { abilityMod } from './character';
import { SKILLS, WEAPONS, ARMORS } from '../data/rules';

export const XP_BY_ND = (nd) => Math.max(0, nd) * 200; // Tabela 14-1

export function blankNpc() {
  return {
    name: 'Novo NPC', nd: 1, category: 'custom', type: 'Humano Médio não-heróico 1',
    init: 0, perception: 0, senses: '', defenses: { ref: 10, fort: 10, von: 10 }, defenseNotes: '',
    hp: 5, threshold: 10, dr: 0, speed: '6 quadrados', bab: 0, grapple: null,
    abilities: { vig: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 },
    attacks: [], skills: [], useTheForce: null, forcePoints: 0, destiny: 0, darkSide: 0,
    languages: 'Básico', immune: '', weakness: '', space: '', options: '', powers: '', secrets: '', techniques: '',
    talents: '', feats: '', gear: '', qualities: '', specials: [],
  };
}

// Prepara uma ficha do livro (ou do gerador) para virar NPC da campanha
export function toNpc(template, name) {
  return {
    ...blankNpc(),
    ...JSON.parse(JSON.stringify(template)),
    name: name ?? template.name,
    hpCurrent: null, condition: 0, notes: '', source: template.category === 'custom' ? 'custom' : 'livro',
  };
}

// ---------- Gerador de personagem não heróico (Cap. 16, p. 277) ----------
// Não heróicos: 1d4 PV/nível, não somam nível nas defesas, BBA ¾, sem aptidões nem Pontos de Força.
const NONHEROIC_BAB = [0, 0, 1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15];

export function buildNonheroic({ name, species = 'Humano', level = 1, abilities, armor, weapons = [], trained = [] }) {
  const lvl = Math.max(1, Math.min(20, Number(level) || 1));
  const mods = Object.fromEntries(Object.entries(abilities).map(([k, v]) => [k, abilityMod(Number(v) || 10)]));
  const half = Math.floor(lvl / 2);
  const bab = NONHEROIC_BAB[lvl];
  const arm = ARMORS.find((a) => a.name === armor);
  const ref = 10 + (arm ? arm.ref + Math.min(mods.des, arm.maxDex) : mods.des);
  const fort = 10 + mods.con + (arm?.fort ?? 0);
  const von = 10 + mods.sab;
  const hp = Math.max(1, Math.floor(lvl * (2.5 + mods.con)));
  const skillMod = (s) => half + mods[s.ability] + (trained.includes(s.name) ? 5 : 0);
  const skills = SKILLS.filter((s) => trained.includes(s.name) && !s.force).map((s) => ({ name: s.name, mod: skillMod(s), notes: '' }));
  const attacks = [{ name: 'desarmado', bonus: bab + mods.vig, damage: `1d4${half + mods.vig ? (half + mods.vig > 0 ? '+' : '') + (half + mods.vig) : ''}`, melee: true, notes: '' }];
  for (const wn of weapons) {
    const w = WEAPONS.find((x) => x.name === wn);
    if (!w || w.name === 'Desarmado') continue;
    const dmgMod = half + (w.melee ? mods.vig : 0);
    attacks.push({
      name: w.name.toLowerCase(), bonus: bab + (w.melee ? mods.vig : mods.des), melee: w.melee,
      damage: `${w.damage}${dmgMod ? (dmgMod > 0 ? '+' : '') + dmgMod : ''}`, notes: w.notes,
    });
  }
  const perc = SKILLS.find((s) => s.name === 'Percepção');
  const ini = SKILLS.find((s) => s.name === 'Iniciativa');
  return {
    ...blankNpc(),
    name: name || `${species} não-heróico`,
    nd: Math.max(1, Math.ceil(lvl / 4)),
    type: `${species} Médio não-heróico ${lvl}`,
    init: skillMod(ini), perception: skillMod(perc),
    defenses: { ref, fort, von }, hp, threshold: fort, bab, grapple: bab + Math.max(mods.vig, mods.des),
    abilities: Object.fromEntries(Object.entries(abilities).map(([k, v]) => [k, Number(v) || 10])),
    attacks, skills,
    gear: [arm?.name, ...weapons].filter(Boolean).join(', '),
    feats: 'Talentos iniciais (escolha 3): proficiências em armadura/armas, Foco ou Treinamento em Perícia',
    category: 'custom',
  };
}

// ---------- Dificuldade do encontro (Cap. 14, p. 247) ----------
export function encounterDifficulty(npcs, partyLevels) {
  const n = partyLevels.length;
  if (!npcs.length) return null;
  const sumNd = npcs.reduce((s, x) => s + (Number(x.data.nd) || 0), 0);
  const avg = n ? partyLevels.reduce((a, b) => a + b, 0) / n : 1;
  const effective = Math.floor(sumNd / 3) - (n ? n - 4 : 0);
  const diff = effective - Math.round(avg);
  let label = 'Fácil'; let tone = 'green';
  if (diff >= -1 && diff <= 1) { label = 'Desafio justo'; tone = 'yellow'; }
  if (diff >= 2 && diff <= 3) { label = 'Difícil'; tone = 'red'; }
  if (diff >= 4) { label = 'Mortal'; tone = 'red'; }
  if (npcs.length === 1 && Number(npcs[0].data.nd) >= Math.round(avg)) { label = diff >= 4 ? 'Mortal' : 'Chefe: difícil'; tone = 'red'; }
  const xp = npcs.reduce((s, x) => {
    const nd = Number(x.data.nd) || 0;
    const tenth = n && nd <= avg - 5;
    return s + (tenth ? XP_BY_ND(nd) / 10 : XP_BY_ND(nd));
  }, 0);
  return { sumNd, effective, avg, diff, label, tone, xp, xpEach: n ? Math.floor(xp / n) : xp };
}

// ---------- Persistência ----------
export function useNpcs(campaignId) {
  const [npcs, setNpcs] = useState(null);
  const [error, setError] = useState('');
  const timers = useRef({});
  const pending = useRef({});

  useEffect(() => {
    if (!campaignId) return;
    supabase.from('npcs').select('*').eq('campaign_id', campaignId).order('created_at').then(({ data, error: e }) => {
      if (e) { setError(e.message); setNpcs([]); return; }
      setNpcs(data || []);
    });
    return () => {
      Object.entries(timers.current).forEach(([id, t]) => { clearTimeout(t); flush(id); });
    };
  }, [campaignId]);

  const flush = async (id) => {
    const p = pending.current[id];
    if (!p) return;
    delete pending.current[id];
    const { error: e } = await supabase.from('npcs').update(p).eq('id', id);
    if (e) setError(e.message);
  };

  const update = (id, patch) => {
    setNpcs((list) => list.map((x) => (x.id === id ? { ...x, ...patch, data: patch.data ? { ...x.data, ...patch.data } : x.data } : x)));
    setNpcs((list) => {
      const row = list.find((x) => x.id === id);
      if (row) pending.current[id] = { data: row.data, in_scene: row.in_scene };
      return list;
    });
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(() => { delete timers.current[id]; flush(id); }, 600);
  };

  const add = async (items, inScene = false) => {
    const rows = items.map((data) => ({ campaign_id: campaignId, data, in_scene: inScene }));
    const { data, error: e } = await supabase.from('npcs').insert(rows).select();
    if (e) { setError(e.message); return []; }
    setNpcs((list) => [...(list || []), ...data]);
    return data;
  };

  const remove = async (ids) => {
    setNpcs((list) => list.filter((x) => !ids.includes(x.id)));
    const { error: e } = await supabase.from('npcs').delete().in('id', ids);
    if (e) setError(e.message);
  };

  return { npcs, error, update, add, remove };
}
