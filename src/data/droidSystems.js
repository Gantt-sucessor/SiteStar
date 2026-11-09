// Sistemas de dróide (Cap. 11, Tabelas 11-3 a 11-6). Preços com "× fator de custo" usam o tamanho do dróide.
export const DROID_COST_FACTOR = { medio: 1, pequeno: 2 };
export const DROID_STARTING_BUDGET = 1000;

const LOCO_SPEED = {
  andarilho: { pequeno: 4, medio: 6 },
  rodas: { pequeno: 6, medio: 8 },
  esteiras: { pequeno: 4, medio: 6 },
  flutuante: { pequeno: 6, medio: 6 },
  voador: { pequeno: 9, medio: 12 },
};
const LOCO_K = { andarilho: 10, rodas: 5, esteiras: 20, flutuante: 100, voador: 200 };
const EXTRA_LOCO_SURCHARGE = [500, 1000, 2000, 5000];

export const locomotionCost = (type, size) => LOCO_K[type] * DROID_COST_FACTOR[size] * LOCO_SPEED[type][size] ** 2;
export const locomotionSpeed = (type, size) => LOCO_SPEED[type][size];
export const primaryLocomotion = (size) => (size === 'pequeno' ? 'esteiras' : 'andarilho');

const LOCO_TEXT = {
  andarilho: 'Pernas. Sofre a penalidade normal de terreno difícil.',
  rodas: 'Não pode usar Escalar; penalidade de terreno difícil dobrada.',
  esteiras: 'Ignora terreno difícil; -5 em Escalar.',
  flutuante: 'Flutua até 3 m do chão; ignora terreno difícil.',
  voador: 'Voa; ignora qualquer terreno.',
};

// cost(size, ctx): ctx = { cf, extraLocos, walkCost }
export const DROID_SYSTEMS = [
  // ---------- Locomoção adicional ----------
  ...['andarilho', 'rodas', 'esteiras', 'flutuante', 'voador'].map((t) => ({
    id: `loco-${t}`, group: 'Locomoção adicional', name: `Locomoção: ${t}`, locomotion: t,
    cost: (size, ctx) => locomotionCost(t, size) + EXTRA_LOCO_SURCHARGE[Math.min(ctx.extraLocos, 3)] * ctx.cf,
    costText: (size) => `${locomotionCost(t, size).toLocaleString('pt-BR')} + taxa de sistema extra`,
    desc: `Velocidade ${LOCO_SPEED[t].pequeno} (Pequeno) / ${LOCO_SPEED[t].medio} (Médio). ${LOCO_TEXT[t]} Sistema extra: +500/1.000/2.000/5.000 × fator de custo.`,
  })),
  { id: 'garras-escalada', group: 'Locomoção adicional', name: 'Garras de escalada', walkingOnly: true, cost: (s, ctx) => ctx.walkCost, desc: 'Escalar com metade da velocidade; re-rola Escalar e pode escolher 10 mesmo ameaçado. (Dobra o custo do andarilho.)' },
  { id: 'pernas-extras', group: 'Locomoção adicional', name: 'Pernas extras', walkingOnly: true, cost: (s, ctx) => ctx.walkCost, desc: 'Carga +50% e +5 para resistir a ser derrubado. (Dobra o custo do andarilho.)' },
  { id: 'servos-salto', group: 'Locomoção adicional', name: 'Servos de salto', walkingOnly: true, cost: (s, ctx) => ctx.walkCost, desc: 'Todo salto conta como salto em corrida; re-rola Saltar e pode escolher 10 mesmo ameaçado. (Dobra o custo do andarilho.)' },
  { id: 'pes-magneticos', group: 'Locomoção adicional', name: 'Pés magnéticos', cost: (s, ctx) => ctx.walkCost, desc: 'Gruda no casco de naves, mesmo em movimento. Só andarilho, rodas ou esteiras.' },

  // ---------- Apêndices ----------
  { id: 'ap-sonda', group: 'Apêndices', name: 'Sonda', cost: (s, ctx) => 2 * ctx.cf, desc: 'Só empurra ou puxa objetos. Dano desarmado: 1 (Médio).', repeat: true },
  { id: 'ap-instrumento', group: 'Apêndices', name: 'Instrumento', cost: (s, ctx) => 5 * ctx.cf, desc: 'Feito para uma tarefa (ex.: seringa); carga como se Vigor fosse ¼. Dano 1d2 (Médio).', repeat: true },
  { id: 'ap-ferramenta', group: 'Apêndices', name: 'Ferramenta', cost: (s, ctx) => 10 * ctx.cf, desc: 'Destreza CD 15 para segurar o que não foi projetado. Armas instaladas contam como ferramenta. Dano 1d3 (Médio).', repeat: true },
  { id: 'ap-garra', group: 'Apêndices', name: 'Garra', cost: (s, ctx) => 20 * ctx.cf, desc: 'Boa para agarrar; tarefas delicadas pedem Destreza CD 15. Dano 1d4 (Médio).', repeat: true },
  { id: 'ap-mao', group: 'Apêndices', name: 'Mão', cost: (s, ctx) => 50 * ctx.cf, desc: 'Mão de verdade, com polegar opositor. Dano 1d3 (Médio).', repeat: true },
  { id: 'ap-telescopico', group: 'Apêndices', name: 'Apêndice telescópico (mão)', cost: (s, ctx) => 50 * ctx.cf, desc: 'Dobra o alcance de uma mão (2 quadrados para Médio). O preço é o acréscimo: a mão custa o dobro.', repeat: true },
  { id: 'ap-estabilizado', group: 'Apêndices', name: 'Encaixe estabilizado (ferramenta)', cost: (s, ctx) => 40 * ctx.cf, desc: 'A ferramenta segura uma arma maior como se fosse com as duas mãos. O preço é o acréscimo: a ferramenta custa 5×.', repeat: true },

  // ---------- Processadores e energia ----------
  { id: 'proc-heuristico', group: 'Processadores e energia', name: 'Processador heurístico', cost: () => 2000, desc: 'Personalidade e livre-arbítrio: usa perícias sem treinamento e contorna os inibidores. Heróis dróides já começam com um.', starting: true },
  { id: 'bateria-secundaria', group: 'Processadores e energia', name: 'Bateria secundária', cost: () => 400, desc: 'Funciona 200 horas (em vez de 100) antes de recarregar.' },
  { id: 'pino-contencao', group: 'Processadores e energia', name: 'Pino de contenção', cost: () => 5, desc: 'Desliga o impulso motor quando ativado por um chama dróide. (Normalmente instalado contra a vontade do dróide.)' },
  { id: 'autodestruicao', group: 'Processadores e energia', name: 'Sistema de autodestruição', cost: (s) => (s === 'pequeno' ? 24 : 36) * 20, desc: 'Explode destruindo o dróide: 4d6 (Pequeno) ou 6d6 (Médio) em raio de 2 quadrados, ataque de área +5. Restrito.', avail: 'Restrita' },

  // ---------- Comunicações ----------
  { id: 'comlink-interno', group: 'Comunicações', name: 'Comlink interno', cost: () => 250, desc: 'Comlink embutido.' },
  { id: 'vocabulador', group: 'Comunicações', name: 'Vocabulador', cost: () => 50, desc: 'Emula voz para falar outras línguas além do Binário. Padrão em dróides que falam Básico.', starting: true },
  { id: 'diagnostico', group: 'Comunicações', name: 'Pacote de diagnósticos', cost: () => 250, desc: 'Bônus de equipamento em Mecânica para diagnosticar problemas.' },
  { id: 'chama-droide', group: 'Comunicações', name: 'Chama dróide (portátil)', cost: () => 10, desc: 'Transmissor que ativa pinos de contenção.' },
  { id: 'trad-20', group: 'Comunicações', name: 'Unidade de tradução (CD 20)', cost: () => 200, desc: 'Teste de Int CD 20 para entender uma língua nova, inclusive não verbal.' },
  { id: 'trad-15', group: 'Comunicações', name: 'Unidade de tradução (CD 15)', cost: () => 500, desc: 'Teste de Int CD 15 para entender uma língua nova.' },
  { id: 'trad-10', group: 'Comunicações', name: 'Unidade de tradução (CD 10)', cost: () => 1000, desc: 'Teste de Int CD 10 para entender uma língua nova.' },
  { id: 'trad-5', group: 'Comunicações', name: 'Unidade de tradução (CD 5)', cost: () => 2000, desc: 'Teste de Int CD 5 para entender uma língua nova. Nível C-3PO.' },

  // ---------- Sensores ----------
  { id: 'sensores-aprimorados', group: 'Sensores', name: 'Pacote de sensores aprimorados', cost: () => 200, desc: '+2 em Percepção (já somado na ficha) e visão na penumbra.' },
  { id: 'visao-escuro', group: 'Sensores', name: 'Visão no escuro', cost: () => 150, desc: 'Ignora qualquer encobrimento por escuridão.' },

  // ---------- Depósito interno ----------
  { id: 'deposito', group: 'Depósito interno', name: 'Compartimento interno (por kg)', cost: () => 50, desc: 'Guarda itens dentro do chassi. Máximo 5 kg (Pequeno) ou 10 kg (Médio).', repeat: true, maxQty: (s) => (s === 'pequeno' ? 5 : 10) },
  { id: 'molas', group: 'Depósito interno', name: 'Mecanismo com molas', cost: () => 150, desc: 'Ação padrão: lança um item do compartimento (até 4 kg) a até 4 quadrados.' },
  { id: 'acesso-travado', group: 'Depósito interno', name: 'Acesso travado', cost: () => 50, desc: 'Interruptor interno: não pode ser desligado à força, só se estiver desativado. Licenciado.', avail: 'Licenciada' },

  // ---------- Gerador de escudo ----------
  { id: 'escudo-5', group: 'Gerador de escudo', name: 'Gerador de escudo VE 5', shield: 5, cost: (s, ctx) => 2500 * ctx.cf, desc: 'Reduz todo dano em 5. Se o dano ≥ VE, o escudo cai 5. Três ações rápidas + Tolerância CD 20 recuperam 5. Militar.', avail: 'Militar' },
  { id: 'escudo-10', group: 'Gerador de escudo', name: 'Gerador de escudo VE 10', shield: 10, cost: (s, ctx) => 5000 * ctx.cf, desc: 'Como o VE 5, reduzindo 10. Pequeno ou maior. Militar.', avail: 'Militar' },
  { id: 'escudo-15', group: 'Gerador de escudo', name: 'Gerador de escudo VE 15', shield: 15, mediumOnly: true, cost: (s, ctx) => 7500 * ctx.cf, desc: 'Como o VE 5, reduzindo 15. Só Médio ou maior. Militar.', avail: 'Militar' },
];

// Armaduras embutidas (Tabela 11-6): [nome, categoria, custo base × fator, Ref, Des máx, disponibilidade]
export const DROID_ARMORS = [
  ['Casco de plástico de aço', 'leve', 400, 2, 5, ''],
  ['Casco de quadânio', 'leve', 900, 3, 4, ''],
  ['Casco de duraço', 'leve', 1600, 4, 4, ''],
  ['Blindagem de quadânio', 'leve', 2500, 5, 3, 'Licenciada'],
  ['Blindagem de duraço', 'leve', 3600, 6, 3, 'Licenciada'],
  ['Armadura de batalha de quadânio', 'média', 4900, 7, 3, 'Restrita'],
  ['Blindagem de durânio', 'média', 6400, 8, 2, 'Restrita'],
  ['Armadura de batalha de duraço', 'média', 9600, 8, 3, 'Restrita'],
  ['Blindagem de aço Mandalorian', 'pesada', 8100, 9, 3, 'Militar, Rara'],
  ['Armadura de batalha de durânio', 'pesada', 10000, 10, 2, 'Militar'],
  ['Blindagem de neutrônio', 'pesada', 12100, 11, 1, 'Militar'],
].map(([name, category, base, ref, maxDex, avail]) => ({ name, category, base, ref, maxDex, avail }));

export const droidArmorByName = (n) => DROID_ARMORS.find((a) => a.name === n);
export const droidSystemById = (id) => DROID_SYSTEMS.find((s) => s.id === id);

export function systemContext(data) {
  const size = data.droidSize || 'medio';
  const cf = DROID_COST_FACTOR[size];
  const owned = data.droidSystems || [];
  const extraLocos = owned.filter((x) => x.id.startsWith('loco-')).length;
  return { size, cf, extraLocos, walkCost: locomotionCost('andarilho', size) };
}

export function systemCost(item, data) {
  const ctx = systemContext(data);
  return Math.round(item.cost(ctx.size, ctx));
}

export function canInstall(item, data) {
  const size = data.droidSize || 'medio';
  const owned = data.droidSystems || [];
  const has = (id) => owned.some((x) => x.id === id);
  const walking = primaryLocomotion(size) === 'andarilho' || has('loco-andarilho');
  if (item.walkingOnly && !walking) return 'Exige locomoção andarilho';
  if (item.mediumOnly && size !== 'medio') return 'Só para dróides Médios';
  if (item.starting) return 'Já incluído no herói dróide';
  if (item.locomotion && (item.locomotion === primaryLocomotion(size) || has(item.id))) return 'Você já tem essa locomoção';
  if (!item.repeat && has(item.id)) return 'Já instalado';
  if (item.maxQty && owned.filter((x) => x.id === item.id).length >= item.maxQty(size)) return 'Limite do tamanho atingido';
  return null;
}
