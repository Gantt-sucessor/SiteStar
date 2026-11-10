import { derive } from './character.js';
import { CONDITION_TRACK } from '../data/rules.js';

export const VEHICLE_CATEGORIES = [
  ['todos', 'Todos'],
  ['terrestre', 'Terrestres e speeders'],
  ['caca', 'Caças estelares'],
  ['transporte', 'Transportes'],
  ['capital', 'Naves capitais'],
];

export function vehicleCategory(v) {
  const t = v.type.toLowerCase();
  if (t.includes('nave capital')) return 'capital';
  if (t.includes('transportador') || t.includes('transporte') || t.includes('nave de apoio')) return 'transporte';
  if (t.includes('caça')) return 'caca';
  return 'terrestre';
}

const mod = (score) => (score == null ? 0 : Math.floor((score - 10) / 2));

// Cria uma instância de veículo para a campanha a partir de uma ficha do livro
export function newVehicle(template, name) {
  return {
    uid: crypto.randomUUID(),
    kind: 'vehicle',
    template: template.name,
    ...JSON.parse(JSON.stringify(template)),
    name: name || template.name,
    hpCurrent: null,
    shieldsCurrent: null,
    condition: 0,
    crew: { pilot: '', copilot: '', gunners: {} },
    notes: '',
  };
}

// Calcula os números do veículo considerando a tripulação de personagens jogadores
// crewChars: { [charId]: row } com as fichas da campanha
export function deriveVehicle(v, crewChars = {}) {
  const dexMod = mod(v.abilities?.des);
  const intMod = mod(v.abilities?.int);
  const cond = CONDITION_TRACK[v.condition || 0] ?? CONDITION_TRACK[0];
  const cp = cond.penalty;
  const member = (id) => {
    const row = id && crewChars[id];
    return row ? { row, d: derive(row.data) } : null;
  };
  const pilot = member(v.crew?.pilot);
  const copilot = member(v.crew?.copilot);

  // Reflexo: 10 + Des + tamanho + (armadura ou nível heróico do piloto, o maior)
  const ref = pilot ? 10 + dexMod + v.sizeMod + Math.max(v.armor || 0, pilot.d.level) + cp : (v.ref || 10) + cp;
  const fort = (v.fort || 10) + cp;

  // Piloto soma tamanho e Des do veículo em Iniciativa e Pilotar
  let init = (v.init || 0) + cp;
  let pilotCheck = (v.skills && /Pilotar ([+-]?\d+)/.exec(v.skills)) ? Number(/Pilotar ([+-]?\d+)/.exec(v.skills)[1]) + cp : init;
  if (pilot) {
    const pil = pilot.d.skills.find((s) => s.name === 'Pilotar');
    const ini = pilot.d.skills.find((s) => s.name === 'Iniciativa');
    pilotCheck = (pil?.mod ?? 0) + v.sizeMod + dexMod + cp;
    init = Math.max(ini?.mod ?? 0, pil?.trained ? pil.mod : -99) + v.sizeMod + dexMod + cp;
  }

  const weapons = (v.weapons || []).map((w, i) => {
    let who = null;
    if (/co-piloto/.test(w.role)) who = copilot;
    else if (/piloto/.test(w.role)) who = pilot;
    else who = member(v.crew?.gunners?.[i]);
    const atk = (who ? who.d.bab + intMod : w.atk) + cp;
    const damage = w.dice ? `${w.dice}${w.mult > 1 ? `×${w.mult}` : ''}` : '';
    return { ...w, idx: i, atk, damage, operator: who ? who.row.data.name || who.row.name : null };
  });

  const hpMax = Number(v.hp) || 1;
  const hpCurrent = v.hpCurrent ?? hpMax;
  const shieldsMax = Number(v.shields) || 0;
  const shieldsCurrent = v.shieldsCurrent ?? shieldsMax;
  const destroyed = Boolean(v.destroyed);
  return {
    ref, fort, init, pilotCheck, weapons, intMod, dexMod, cond, hpMax, hpCurrent, shieldsMax, shieldsCurrent, destroyed,
    pilotName: pilot ? (pilot.row.data.name || pilot.row.name) : null,
  };
}

// Aplica dano seguindo o livro: escudo (VE) reduz e cai 5 se o dano ≥ VE; depois a RD; dano ≥ limiar desce a condição
export function applyVehicleDamage(v, rawDamage) {
  const dv = deriveVehicle(v);
  let dmg = Math.max(0, Number(rawDamage) || 0);
  const log = [];
  let shields = dv.shieldsCurrent;
  if (shields > 0) {
    const absorbed = Math.min(dmg, shields);
    if (dmg >= shields) { log.push(`escudo VE ${shields} absorveu ${absorbed} e caiu 5`); shields = Math.max(0, shields - 5); } else log.push(`escudo VE ${shields} absorveu tudo`);
    dmg -= absorbed;
  }
  if (dmg > 0 && v.dr) {
    const r = Math.min(dmg, v.dr);
    dmg -= r;
    log.push(`RD ${v.dr} reduziu ${r}`);
  }
  const patch = { shieldsCurrent: shields };
  if (dmg > 0) {
    const hp = Math.max(0, dv.hpCurrent - dmg);
    patch.hpCurrent = hp;
    log.push(`${dmg} de dano no casco`);
    if (dmg >= v.threshold) {
      patch.condition = Math.min(5, (v.condition || 0) + 1);
      log.push('passou do limiar: -1 passo na condição');
      if (hp === 0) { patch.destroyed = true; log.push('DESTRUÍDO: ocupantes sofrem metade do dano'); }
    }
    if (hp === 0 && !patch.destroyed) { patch.condition = 5; log.push('0 PV: desativado'); }
  }
  return { patch, log };
}
