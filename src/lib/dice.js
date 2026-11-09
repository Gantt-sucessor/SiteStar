// Rolagem de dados: aceita expressões como "1d20+5", "3d6+2", "2d8+1d6-1", "4d6kh3".

function rand(sides) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % sides) + 1;
}

const TERM = /([+-]?)\s*(?:(\d*)d(\d+)(?:kh(\d+))?|(\d+))/gi;

export function parseFormula(formula) {
  const clean = String(formula).replace(/\s+/g, '').toLowerCase();
  if (!clean) return null;
  const terms = [];
  let consumed = '';
  for (const m of clean.matchAll(TERM)) {
    consumed += m[0];
    const sign = m[1] === '-' ? -1 : 1;
    if (m[3]) {
      const count = Math.min(parseInt(m[2] || '1', 10), 100);
      const sides = Math.min(parseInt(m[3], 10), 1000);
      if (!count || !sides) return null;
      terms.push({ type: 'dice', sign, count, sides, keep: m[4] ? parseInt(m[4], 10) : null });
    } else {
      terms.push({ type: 'mod', sign, value: parseInt(m[5], 10) });
    }
  }
  if (consumed.replace(/\s/g, '') !== clean) return null;
  return terms.length ? terms : null;
}

export function roll(formula) {
  const terms = parseFormula(formula);
  if (!terms) throw new Error(`Fórmula inválida: ${formula}`);
  let total = 0;
  const parts = terms.map((t) => {
    if (t.type === 'mod') {
      total += t.sign * t.value;
      return { type: 'mod', value: t.sign * t.value };
    }
    const rolls = Array.from({ length: t.count }, () => rand(t.sides));
    let kept = rolls.map((_, i) => i);
    if (t.keep && t.keep < rolls.length) {
      kept = rolls.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, t.keep).map(([, i]) => i);
    }
    const sum = kept.reduce((s, i) => s + rolls[i], 0);
    total += t.sign * sum;
    return { type: 'dice', sign: t.sign, count: t.count, sides: t.sides, rolls, kept, sum: t.sign * sum };
  });
  const d20 = parts.find((p) => p.type === 'dice' && p.sides === 20 && p.count === 1);
  return {
    formula: normalize(formula),
    total,
    parts,
    natural: d20 ? d20.rolls[0] : null,
  };
}

export function normalize(formula) {
  return String(formula).replace(/\s+/g, '').replace(/\+-/g, '-');
}

export const fmtMod = (n) => (n >= 0 ? `+${n}` : `${n}`);

export function d20Formula(mod) {
  return mod === 0 ? '1d20' : `1d20${fmtMod(mod)}`;
}
