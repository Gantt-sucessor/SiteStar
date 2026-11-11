// Aventuras prontas: NPCs e abertura para importar numa campanha com um clique.
import { BESTIARY } from './bestiary';
import { toNpc, blankNpc, buildNonheroic } from '../lib/npcs';

const fromBook = (bookName, name, patch = {}) => {
  const t = BESTIARY.find((b) => b.name === bookName);
  return { ...toNpc(t, name), ...patch };
};

export const ADVENTURES = [
  {
    id: 'preco-de-uma-lenda',
    title: 'O Preço de uma Lenda',
    level: 'Nível 1 · 1 jogador (caçador de recompensas dróide)',
    summary: 'Uma entrega que dá errado, o salão da Guilda em Nar Shaddaa e um contrato bom demais para ser verdade: capturar uma eremita em Dantooine que guarda um sabre de luz de cem anos atrás.',
    scenes: [
      'Cena 1 · A entrega: capangas de Teeko tentam resgatá-lo no hangar. Pagamento de 500 cr (Persuasão CD 15 para +100).',
      'Cena 2 · Nar Shaddaa: o salão da Guilda, a mestra Ssarra, o rival Krrask e três contratos no quadro.',
      'Cena 3 · Investigação: Reunir Informação CD 15 (culto de relíquias), Usar Computador CD 20 (o "cilindro de metal"), Percepção CD 15 (o observador de manto vermelho), Mecânica CD 15 (pino de contenção na "atualização grátis").',
      'Cena 4 · Dantooine: Sobrevivência CD 15 para rastrear Vaela. O truque mental dela falha no dróide. Os cultistas chegam com armas de íon. A escolha: entregar, proteger ou enganar.',
    ],
    crawl: {
      episode: 'EPISÓDIO I',
      title: 'O PREÇO DE UMA LENDA',
      text: [
        'Cem anos se passaram desde a queda da última Ordem. Jedi e Sith tornaram-se histórias de taverna, contadas por velhos espaçonautas a quem ninguém mais dá ouvidos.',
        'Na Orla Exterior, onde a lei é aquilo que se pode pagar, os caçadores de recompensas prosperam. Contratos são publicados, vidas são precificadas e cada crédito tem dono.',
        'Uma máquina de caçar acaba de capturar seu alvo mais recente. Ela ainda não sabe que o próximo contrato a levará ao encontro de algo que a galáxia jurava estar extinto....',
      ].join('\n\n'),
    },
    build() {
      const teeko = buildNonheroic({
        name: 'Teeko', species: 'Rodiano', level: 2,
        abilities: { vig: 9, des: 15, con: 10, int: 12, sab: 9, car: 11 },
        weapons: ['Pistola blaster compacta'], trained: ['Enganar', 'Furtividade', 'Percepção'],
      });
      teeko.notes = 'O alvo capturado, algemado no porão. Golpista falante. Ao ser entregue, grita sobre "a velha do deserto" e o contrato de Nar Shaddaa que paga cem vezes mais.';

      const capanga = (n) => fromBook('Bandido', `Capanga de Teeko ${n}`, { notes: 'Esperam no hangar para resgatar Teeko. Fogem se o outro cair (Persuasão para intimidar vs. Vontade).' });

      const ssarra = fromBook('Caçador de Recompensa', 'Ssarra, mestra da Guilda', {
        type: 'Trandoshana Média, mestra da Guilda de Caçadores',
        notes: 'Veterana trandoshana que administra o salão da Guilda em Nar Shaddaa. Não luta: negocia, cobra taxa de 10% e despreza quem quebra contrato. Respeita resultados, não origens ("uma lata que entrega vale mais que um orgânico que choraminga").',
      });

      const krrask = fromBook('Caçador de Recompensa', 'Krrask, caçador rival', {
        type: 'Trandoshano Médio, caçador de recompensas',
        notes: 'RIVAL RECORRENTE, ND 7: não é para lutar no nível 1. Também quer o contrato da eremita. "Esse é meu, lata. Fique fora." Pode aparecer na sessão 2 querendo o sabre.',
      });

      const kt3 = fromBook('Dróide de Protocolo Série 3PO', 'KT-3, atendente da Guilda', {
        notes: 'Dróide de protocolo nervoso que cuida do quadro de contratos. Fala demais sobre "o contratante anônimo que pagou adiantado em cristais".',
      });

      const vaela = {
        ...blankNpc(), source: 'custom', category: 'custom', hpCurrent: null, condition: 0,
        name: 'Vaela, a eremita', nd: 4, type: 'Humana Média, usuária da Força (remanescente Jedi)',
        init: 4, perception: 12, senses: 'sente a Força ao redor', defenses: { ref: 16, fort: 14, von: 21 },
        hp: 38, threshold: 14, speed: '6 quadrados', bab: 3,
        abilities: { vig: 8, des: 12, con: 10, int: 14, sab: 18, car: 14 },
        attacks: [{ name: 'bengala', bonus: 2, damage: '1d6', melee: true, notes: 'não quer lutar' }],
        skills: [{ name: 'Percepção', mod: 12, notes: '' }, { name: 'Sobrevivência', mod: 11, notes: '' }, { name: 'Conhecimento (Tradições Galácticas)', mod: 9, notes: '' }],
        useTheForce: 12, forcePoints: 6, destiny: 1,
        powers: 'empurrão da Força, truque mental, mover objeto, negar energia, ver à distância',
        options: 'Não ataca para matar. Usa empurrão para afastar e foge para as colinas.',
        gear: 'sabre de luz antigo e desativado (o "cilindro de metal"), túnica gasta, bengala',
        notes: 'Guardiã do último sabre de luz conhecido da região. O truque mental dela NÃO funciona no dróide (dróides são imunes a efeitos mentais): ela fica assustada, "Não sinto você... não há nada aí para a Força tocar." Sabe que o culto quer o sabre, não ela.',
      };

      const cultista = (n) => fromBook('Bandido', `Cultista de manto vermelho ${n}`, {
        type: 'Humano Médio não-heróico 2 (Culto das Relíquias)',
        attacks: [
          { name: 'vibromachado', bonus: 2, damage: '2d10+2', melee: true, notes: '' },
          { name: 'pistola de íon', bonus: 1, damage: '3d6', melee: false, notes: 'dano de íon: contra dróides funciona como atordoamento' },
        ],
        gear: 'pistola de íon, vibromachado, manto vermelho escuro',
        notes: 'Vieram preparados para enfrentar um dróide: armas de íon.',
      });

      const vex = fromBook('Soldado Rebelde de Elite', 'Irmão Vex, líder cultista', {
        type: 'Humano Médio não-heróico 6 (Culto das Relíquias)',
        attacks: [
          { name: 'pistola de íon', bonus: 6, damage: '3d6', melee: false, notes: 'dano de íon' },
          { name: 'granada de íon', bonus: 5, damage: '4d6', melee: false, notes: '2 quadrados de explosão; íon' },
        ],
        gear: 'pistola de íon, 2 granadas de íon, amuleto que pulsa vermelho, chama dróide (ativa pinos de contenção)',
        notes: 'O observador de manto vermelho do salão da Guilda. Ofereceu a "atualização grátis" com pino de contenção. O amuleto pulsa perto do sabre: primeira pista de que algo Sith despertou. Se for enganado (Enganar vs. Vontade 10), aceita um cilindro falso.',
      });

      return [teeko, capanga(1), capanga(2), ssarra, krrask, kt3, vaela, cultista(1), cultista(2), vex];
    },
  },
];
