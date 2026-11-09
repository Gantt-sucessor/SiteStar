// Regras extraídas do Star Wars RPG — Edição Saga (Livro de Regras Revisado, tradução v1.05).
// Terminologia da tradução: "Talento" = feat, "Aptidão" = talent, "Vigor" = Força (Str).

export const ABILITIES = [
  { id: 'vig', name: 'Vigor', short: 'VIG' },
  { id: 'des', name: 'Destreza', short: 'DES' },
  { id: 'con', name: 'Constituição', short: 'CON' },
  { id: 'int', name: 'Inteligência', short: 'INT' },
  { id: 'sab', name: 'Sabedoria', short: 'SAB' },
  { id: 'car', name: 'Carisma', short: 'CAR' },
];

export const POINT_BUY_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 6, 15: 8, 16: 10, 17: 13, 18: 16 };
export const POINT_BUY_TOTAL = 25;
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export const ERAS = [
  { id: 'velha-republica', name: 'Era da Velha República', desc: 'Milhares de anos antes da Batalha de Yavin. Jedi e Sith em guerra aberta.' },
  { id: 'ascensao-imperio', name: 'Era da Ascensão do Império', desc: 'As Guerras Clônicas e a queda da Ordem Jedi.' },
  { id: 'rebeliao', name: 'Era da Rebelião', desc: 'A Aliança Rebelde contra o Império Galáctico.' },
  { id: 'nova-republica', name: 'Era da Nova República', desc: 'Após a queda do Imperador, a galáxia se reconstrói.' },
  { id: 'legado', name: 'Era do Legado', desc: 'Um século após Yavin. Um novo Império e uma nova Ordem Sith.' },
];

export const SPECIES = [
  {
    id: 'humano', name: 'Humano', mods: {}, speed: 6, size: 'Médio',
    languages: ['Básico'],
    bonusSkill: true, bonusFeat: true,
    desc: 'A espécie dominante da galáxia: versátil, adaptável e ambiciosa.',
    traits: [
      ['Perícia Treinada Bônus', 'Escolhe uma perícia treinada adicional da lista de classe.'],
      ['Talento Bônus', 'Recebe um talento bônus no 1º nível.'],
    ],
  },
  {
    id: 'bothan', name: 'Bothan', mods: { des: 2, con: -2 }, speed: 6, size: 'Médio',
    languages: ['Básico', 'Bothês'], defense: { von: 2 },
    conditionalFeat: { skill: 'Reunir Informação', feat: 'Foco em Perícia (Reunir Informação)' },
    desc: 'Espiões natos da Bothan SpyNet, ágeis e astutos.',
    traits: [
      ['Vontade de Ferro', '+2 de bônus de espécie na Defesa de Vontade.'],
      ['Talento Bônus Condicional', 'Treinado em Reunir Informação → Foco em Perícia (Reunir Informação).'],
    ],
  },
  {
    id: 'cereano', name: 'Cereano', mods: { int: 2, sab: 2, des: -2 }, speed: 6, size: 'Médio',
    languages: ['Básico', 'Cereano'],
    conditionalFeat: { skill: 'Iniciativa', feat: 'Foco em Perícia (Iniciativa)' },
    desc: 'Mentes binárias capazes de processar várias ideias ao mesmo tempo.',
    traits: [
      ['Iniciativa Intuitiva', 'Pode re-rolar testes de Iniciativa (aceita o novo resultado).'],
      ['Talento Bônus Condicional', 'Treinado em Iniciativa → Foco em Perícia (Iniciativa).'],
    ],
  },
  {
    id: 'duros', name: 'Duros', mods: { des: 2, int: 2, con: -2 }, speed: 6, size: 'Médio',
    languages: ['Básico', 'Durês'],
    desc: 'Viajantes espaciais natos e pilotos lendários.',
    traits: [['Piloto Especialista', 'Pode re-rolar testes de Pilotar (aceita o novo resultado).']],
  },
  {
    id: 'ewok', name: 'Ewok', mods: { des: 2, vig: -2 }, speed: 4, size: 'Pequeno',
    languages: ['Ewokês'], defense: { ref: 1 }, skillBonus: { Furtividade: 5 },
    conditionalFeat: { skill: 'Sobrevivência', feat: 'Foco em Perícia (Sobrevivência)' },
    primitive: true,
    desc: 'Pequenos guerreiros tribais das florestas da lua de Endor.',
    traits: [
      ['Tamanho Pequeno', '+1 na Defesa de Reflexo e +5 em Furtividade.'],
      ['Primitivo', 'Não recebe Proficiência em pistolas, rifles ou armas pesadas como talentos iniciais.'],
      ['Rastro', 'Faro apurado: ignora encobrimento a até 10 quadrados para Percepção.'],
      ['Furtivo', 'Pode re-rolar testes de Furtividade.'],
      ['Talento Bônus Condicional', 'Treinado em Sobrevivência → Foco em Perícia (Sobrevivência).'],
    ],
  },
  {
    id: 'gamorreano', name: 'Gamorreano', mods: { vig: 2, des: -2, int: -2 }, speed: 6, size: 'Médio',
    languages: ['Gamorreano'], defense: { fort: 2 }, bonusFeats: ['Limiar de Dano Aprimorado'],
    desc: 'Brutamontes porcinos, guardas favoritos dos Hutts.',
    traits: [
      ['Grande Fortitude', '+2 de bônus de espécie na Defesa de Fortitude.'],
      ['Talento Bônus', 'Limiar de Dano Aprimorado.'],
    ],
  },
  {
    id: 'gungan', name: 'Gungan', mods: { des: 2, int: -2, car: -2 }, speed: 6, size: 'Médio',
    languages: ['Básico', 'Gunganês'], defense: { ref: 2 },
    desc: 'Anfíbios de Naboo, desajeitados em terra mas surpreendentemente ágeis.',
    traits: [
      ['Reflexo Relâmpago', '+2 de bônus de espécie na Defesa de Reflexo.'],
      ['Nadador Especialista', 'Re-rola testes de Nadar; pode escolher 10 mesmo ameaçado. Natação 4 quadrados.'],
      ['Segurar Fôlego', 'Prende a respiração por 25 × Con rodadas.'],
      ['Visão na Penumbra', 'Ignora encobrimento (não total) da escuridão.'],
    ],
  },
  {
    id: 'ithoriano', name: 'Ithoriano', mods: { sab: 2, car: 2, des: -2 }, speed: 6, size: 'Médio',
    languages: ['Básico', 'Ithorês'], defense: { von: 2 },
    conditionalFeat: { skill: 'Conhecimento (Ciências Biológicas)', feat: 'Foco em Perícia (Conhecimento (Ciências Biológicas))' },
    desc: 'Os "cabeças-de-martelo", grandes ecologistas pacifistas.',
    traits: [
      ['Vontade de Ferro', '+2 de bônus de espécie na Defesa de Vontade.'],
      ['Berro', 'Ação padrão: 1d20 + nível vs. Fortitude num cone de 6 quadrados, 3d6 sônico. Custa -1 passo na condição.'],
      ['Instinto de Sobrevivência', 'Pode re-rolar testes de Sobrevivência.'],
    ],
  },
  {
    id: 'keldor', name: 'Kel Dor', mods: { des: 2, sab: 2, con: -2 }, speed: 6, size: 'Médio',
    languages: ['Básico', 'Kel Dor'],
    desc: 'Nativos de Dorin, dependem de máscaras respiratórias fora de casa.',
    traits: [
      ['Percepção da Força Apurada', 'Re-rola Usar a Força para buscar sentimentos ou sentir a Força, fica com o melhor.'],
      ['Visão na Penumbra', 'Ignora encobrimento (não total) da escuridão.'],
      ['Equipamento Especial', 'Começa com máscara antioxidante e óculos; sem eles fica cego e sufoca.'],
    ],
  },
  {
    id: 'moncal', name: 'Mon Calamariano', mods: { int: 2, sab: 2, con: -2 }, speed: 6, size: 'Médio',
    languages: ['Básico', 'Mon Calamariano'],
    conditionalFeat: { skill: 'Percepção', feat: 'Foco em Perícia (Percepção)' },
    desc: 'Construtores das maiores naves de guerra da Aliança. "É uma armadilha!"',
    traits: [
      ['Respiração Subaquática', 'Não se afoga na água. Natação 4 quadrados.'],
      ['Nadador Especialista', 'Re-rola testes de Nadar; pode escolher 10 mesmo ameaçado.'],
      ['Visão na Penumbra', 'Ignora encobrimento (não total) da escuridão.'],
      ['Talento Bônus Condicional', 'Treinado em Percepção → Foco em Perícia (Percepção).'],
    ],
  },
  {
    id: 'quarren', name: 'Quarren', mods: { con: 2, sab: -2, car: -2 }, speed: 6, size: 'Médio',
    languages: ['Básico', 'Quarrenês'],
    conditionalFeat: { skill: 'Persuasão', feat: 'Foco em Perícia (Persuasão)' },
    desc: 'Habitantes das profundezas de Mon Cala, resistentes e desconfiados.',
    traits: [
      ['Respiração Subaquática', 'Não se afoga na água. Natação 4 quadrados.'],
      ['Nadador Especialista', 'Re-rola testes de Nadar; pode escolher 10 mesmo ameaçado.'],
      ['Visão na Penumbra', 'Ignora encobrimento (não total) da escuridão.'],
      ['Talento Bônus Condicional', 'Treinado em Persuasão → Foco em Perícia (Persuasão).'],
    ],
  },
  {
    id: 'rodiano', name: 'Rodiano', mods: { des: 2, sab: -2, car: -2 }, speed: 6, size: 'Médio',
    languages: ['Básico', 'Rodês'],
    conditionalFeat: { skill: 'Sobrevivência', feat: 'Foco em Perícia (Sobrevivência)' },
    desc: 'Caçadores de recompensas de Rodia. Greedo mandou lembranças.',
    traits: [
      ['Consciência Aumentada', 'Pode re-rolar testes de Percepção.'],
      ['Visão na Penumbra', 'Ignora encobrimento (não total) da escuridão.'],
      ['Talento Bônus Condicional', 'Treinado em Sobrevivência → Foco em Perícia (Sobrevivência).'],
    ],
  },
  {
    id: 'sullustano', name: 'Sullustano', mods: { des: 2, con: -2 }, speed: 6, size: 'Médio',
    languages: ['Básico', 'Sullustês'],
    desc: 'Navegadores subterrâneos de Sullust, ótimos pilotos e atiradores.',
    traits: [
      ['Visão no Escuro', 'Ignora qualquer encobrimento da escuridão (não distingue cores).'],
      ['Escalador Especialista', 'Pode escolher 10 em Escalar mesmo ameaçado.'],
      ['Consciência Aumentada', 'Pode re-rolar testes de Percepção.'],
    ],
  },
  {
    id: 'trandoshano', name: 'Trandoshano', mods: { vig: 2, des: -2 }, speed: 6, size: 'Médio',
    languages: ['Básico', 'Dosh'], defense: { ref: 1 }, bonusFeats: ['Vitalidade'],
    desc: 'Caçadores reptilianos que regeneram membros. Bossk aprova.',
    traits: [
      ['Visão no Escuro', 'Ignora qualquer encobrimento da escuridão (não distingue cores).'],
      ['Regeneração de Membros', 'Membros perdidos crescem em 1d10 dias.'],
      ['Armadura Natural', '+1 de armadura natural na Defesa de Reflexo (acumula com armadura).'],
      ['Talento Bônus', 'Vitalidade.'],
    ],
  },
  {
    id: 'twilek', name: "Twi'lek", mods: { car: 2, sab: -2 }, speed: 6, size: 'Médio',
    languages: ['Básico', 'Ryl'], defense: { fort: 2 },
    desc: 'Carismáticos e diplomáticos, com seus inconfundíveis lekku.',
    traits: [
      ['Enganador', 'Pode re-rolar testes de Enganar.'],
      ['Grande Fortitude', '+2 de bônus de espécie na Defesa de Fortitude.'],
      ['Visão na Penumbra', 'Ignora encobrimento (não total) da escuridão.'],
    ],
  },
  {
    id: 'wookiee', name: 'Wookiee', mods: { vig: 4, con: 2, des: -2, sab: -2, car: -2 }, speed: 6, size: 'Médio',
    languages: ['Shyriiwook'],
    desc: 'Gigantes peludos de Kashyyyk. Nunca deixe um Wookiee perder no dejarik.',
    traits: [
      ['Recuperação Extraordinária', 'Recupera pontos de vida com o dobro da velocidade.'],
      ['Fúria', '1/dia, ação rápida: +2 em ataque e dano físicos por 5 + Con rodadas; depois -1 passo persistente.'],
      ['Familiaridade com Armas', 'Proficiência em rifles inclui a bowcaster.'],
      ['Perícias', 'Pode escolher 10 em Escalar; re-rola Persuasão para intimidar.'],
    ],
  },
  {
    id: 'zabrak', name: 'Zabrak', mods: {}, speed: 6, size: 'Médio',
    languages: ['Básico', 'Zabrak'], defense: { ref: 1, fort: 1, von: 1 },
    desc: 'Determinados e resilientes, marcados por seus chifres e tatuagens.',
    traits: [
      ['Consciência Aumentada', 'Pode re-rolar testes de Percepção.'],
      ['Defesas Superiores', '+1 de bônus de espécie em todas as defesas.'],
    ],
  },
];

export const SKILLS = [
  { name: 'Acrobacia', ability: 'des', armor: true },
  { name: 'Conhecimento (Burocracia)', ability: 'int', knowledge: true },
  { name: 'Conhecimento (Ciências Biológicas)', ability: 'int', knowledge: true },
  { name: 'Conhecimento (Ciências Físicas)', ability: 'int', knowledge: true },
  { name: 'Conhecimento (Ciências Humanas)', ability: 'int', knowledge: true },
  { name: 'Conhecimento (Táticas)', ability: 'int', knowledge: true },
  { name: 'Conhecimento (Tecnologia)', ability: 'int', knowledge: true },
  { name: 'Conhecimento (Tradições Galácticas)', ability: 'int', knowledge: true },
  { name: 'Enganar', ability: 'car' },
  { name: 'Escalar', ability: 'vig', armor: true },
  { name: 'Furtividade', ability: 'des', armor: true },
  { name: 'Iniciativa', ability: 'des', armor: true },
  { name: 'Mecânica', ability: 'int', trainedOnly: true },
  { name: 'Montar', ability: 'des', armor: true },
  { name: 'Nadar', ability: 'vig', armor: true },
  { name: 'Percepção', ability: 'sab' },
  { name: 'Persuasão', ability: 'car' },
  { name: 'Pilotar', ability: 'des' },
  { name: 'Reunir Informação', ability: 'car' },
  { name: 'Saltar', ability: 'vig', armor: true },
  { name: 'Sobrevivência', ability: 'sab' },
  { name: 'Tolerância', ability: 'con', armor: true },
  { name: 'Tratar Ferimento', ability: 'sab' },
  { name: 'Usar a Força', ability: 'car', trainedOnly: true, force: true },
  { name: 'Usar Computador', ability: 'int' },
];

const ALL_KNOWLEDGE = SKILLS.filter((s) => s.knowledge).map((s) => s.name);

export const CLASSES = [
  {
    id: 'jedi', name: 'Jedi', color: 'var(--saber-blue)',
    desc: 'Guardiões da paz e da justiça, mestres do sabre de luz e da Força.',
    keyAbilities: 'Destreza, Sabedoria e Carisma',
    hp: 30, hitDie: 10, bab: 'full', defense: { ref: 1, fort: 1, von: 1 },
    trainedSkills: 2, credits: { dice: '3d4', mult: 100 },
    classSkills: ['Acrobacia', ...ALL_KNOWLEDGE, 'Iniciativa', 'Tolerância', 'Mecânica', 'Percepção', 'Pilotar', 'Saltar', 'Usar a Força'],
    startingFeats: ['Sensitividade da Força', 'Proficiência em Arma (sabres de luz)', 'Proficiência em Arma (armas simples)'],
    startingGear: ['Sabre de luz'],
    bonusFeats: ['Ataque Acrobático', 'Trespassar', 'Reflexos de Combate', 'Esquiva', 'Ataque Duplo', 'Domínio de Armas Duplas I', 'Domínio de Armas Duplas II', 'Domínio de Armas Duplas III', 'Trespassar Maior', 'Investida Aprimorada', 'Desarme Aprimorado', 'Artes Marciais I', 'Artes Marciais II', 'Artes Marciais III', 'Defesa de Ataque Físico', 'Mobilidade', 'Saque Rápido', 'Ataque Poderoso', 'Investida Poderosa', 'Ataque Rápido', 'Ataque em Corrida', 'Foco em Perícia', 'Treinamento em Perícia', 'Forte na Força', 'Ataque Triplo', 'Triplo Crítico', 'Acuidade com Arma', 'Foco em Arma (sabres de luz)'],
    trees: [
      {
        name: 'Cônsul Jedi', talents: [
          ['Negociador Adepto', 'Ação padrão: Persuasão vs. Vontade do alvo; se vencer, ele desce -1 passo na condição (não cai desmaiado; deixa de atacar você).'],
          ['Persuasão da Força', 'Usa Usar a Força no lugar de Persuasão.', ['Negociador Adepto']],
          ['Negociador Mestre', 'Negociador Adepto move o alvo -1 passo adicional.', ['Negociador Adepto']],
          ['Conselheiro Habilidoso', 'Rodada completa: aliado recebe +5 no próximo teste de perícia (+10 gastando 1 PF).'],
        ],
      },
      {
        name: 'Guardião Jedi', talents: [
          ['Recuperação Acrobática', 'Ao ser derrubado, Acrobacia CD 20 para ficar de pé.'],
          ['Meditação de Batalha', 'Rodada completa + 1 PF: você e aliados a 6 quadrados recebem +1 de intuição em ataques no encontro.'],
          ['Alvo Elusivo', 'Em combate corpo a corpo, quem atira em você sofre -5 adicional.'],
          ['Intuição da Força', 'Usa Usar a Força no lugar de Iniciativa.'],
          ['Resistência', 'Rodada completa: sobe +2 passos na condição.'],
        ],
      },
      {
        name: 'Sentinela Jedi', talents: [
          ['Clarear a Mente', 'Re-rola Usar a Força para evitar ser detectado por usuários da Força.'],
          ['Sentir o Lado Sombrio', 'Re-rola Usar a Força para sentir criaturas com Pontuação do Lado Sombrio ≥ 1.'],
          ['Flagelo do Lado Sombrio', 'Dano extra igual ao bônus de Car (mín. +1) contra criaturas do lado sombrio.', ['Sentir o Lado Sombrio']],
          ['Névoa da Força', 'Ação padrão + 1 PF: esconde aliados (até nível de classe) com encobrimento total por 1 minuto.', ['Clarear a Mente']],
          ['Resistir ao Lado Sombrio', '+5 nas defesas contra poderes [lado sombrio] e usuários do lado sombrio.', ['Sentir o Lado Sombrio']],
        ],
      },
      {
        name: 'Combate com Sabre de Luz', talents: [
          ['Bloquear', 'Reação: nega um ataque físico com Usar a Força (CD = ataque). -5 cumulativo por uso.'],
          ['Defletir', 'Reação: nega um ataque à distância com Usar a Força (CD = ataque). -5 cumulativo por uso.'],
          ['Defesa com Sabre de Luz', 'Ação rápida: +1 de deflexão na Reflexo até seu próximo turno (pode pegar até 3 vezes).'],
          ['Especialização em Arma (sabres de luz)', '+2 no dano físico com sabres de luz.', ['Foco em Arma (sabres de luz)']],
          ['Arremessar Sabre de Luz', 'Arremessa o sabre como ação padrão; recupera com Usar a Força CD 20.'],
          ['Redirecionar Disparo', '1/rodada, após defletir, faz um ataque à distância com o disparo contra outro alvo.', ['Defletir', 'BBA +5']],
        ],
      },
    ],
  },
  {
    id: 'nobre', name: 'Nobre', color: 'var(--sw-yellow)',
    desc: 'Líderes, diplomatas e senadores que vencem com palavras e influência.',
    keyAbilities: 'Inteligência e Carisma',
    hp: 18, hitDie: 6, bab: 'medium', defense: { ref: 1, von: 2 },
    trainedSkills: 6, credits: { dice: '3d4', mult: 400 },
    classSkills: [...ALL_KNOWLEDGE, 'Enganar', 'Iniciativa', 'Montar', 'Percepção', 'Persuasão', 'Pilotar', 'Reunir Informação', 'Tratar Ferimento', 'Usar Computador'],
    startingFeats: ['Lingüística', 'Proficiência em Arma (pistolas)', 'Proficiência em Arma (armas simples)'],
    bonusFeats: ['Proficiência em Armadura (leve)', 'Cirurgia Cibernética', 'Proficiência em Arma Exótica', 'Lingüística', 'Defesa de Ataque Físico', 'Foco em Perícia', 'Treinamento em Perícia', 'Especialização Cirúrgica', 'Acuidade com Arma', 'Proficiência em Arma (armas de ataque físico avançadas)', 'Proficiência em Arma (rifles)'],
    trees: [
      {
        name: 'Influência', talents: [
          ['Presença', 'Intimida com Persuasão como ação padrão.'],
          ['Exigir Rendição', '1/encontro: Persuasão vs. Vontade de um oponente com metade dos PV ou menos; ele se rende.', ['Presença']],
          ['Enfraquecer Decisão', 'Ao causar dano ≥ limiar, Persuasão vs. Vontade: o alvo foge aterrorizado.', ['Presença']],
          ['Enfraquecer Decisão Aprimorada', 'Como Enfraquecer Decisão, mas o alvo não para de fugir se ferido.', ['Enfraquecer Decisão']],
        ],
      },
      {
        name: 'Inspiração', talents: [
          ['Animar Aliado', 'Ação padrão: aliado sobe +1 passo na condição e ganha PV temporários = nível dele.'],
          ['Inspirar Confiança', 'Ação padrão: aliados recebem +1 de moral em ataques e perícias no encontro.'],
          ['Inspirar Agilidade', 'Ação rápida: aliado faz um teste de perícia de ação padrão como ação de movimento.'],
          ['Inflamar Fervor', 'Ao acertar um ataque, aliado ganha bônus de dano = nível dele no próximo ataque.', ['Animar Aliado', 'Inspirar Confiança']],
          ['Inspirar Zelo', 'Ataques de aliados que derrubam a condição movem -1 passo extra.', ['Animar Aliado', 'Inspirar Confiança', 'Inflamar Fervor']],
        ],
      },
      {
        name: 'Liderança', talents: [
          ['Líder Nato', '1/encontro, ação rápida: aliados em linha de visão recebem +1 de intuição em ataques.'],
          ['Coordenar', 'Ação padrão: aliados ganham +1 extra ao prestar auxílio (até +5, cumulativo).'],
          ['Comando a Distância', 'Aliados não perdem Líder Nato ao perder a linha de visão.', ['Líder Nato']],
          ['Líder Destemido', 'Ação rápida: aliados recebem +5 de moral na Vontade contra medo.', ['Líder Nato']],
          ['Reagrupar', '1/encontro: aliados abaixo da metade dos PV ganham +2 em Ref, Von e dano.', ['Líder Nato', 'Comando a Distância']],
          ['Confiança', 'Abre mão da ação padrão para dar uma ação padrão/movimento a um aliado.', ['Líder Nato', 'Coordenar']],
        ],
      },
      {
        name: 'Linhagem', talents: [
          ['Conexões', 'Obtém equipamento restrito sem taxa até nível × 1.000 créditos.'],
          ['Educado', 'Faz qualquer teste de Conhecimento sem treinamento.'],
          ['Perícia Espontânea', '1/dia, usa uma perícia não treinada como se fosse treinada.', ['Educado']],
          ['Riqueza', 'A cada nível recebe 5.000 × nível de nobre em créditos.'],
        ],
      },
    ],
  },
  {
    id: 'vigarista', name: 'Vigarista', color: 'var(--blaster-red)',
    desc: 'Contrabandistas, trapaceiros e patifes de coração (às vezes) de ouro.',
    keyAbilities: 'Destreza, Inteligência e Carisma',
    hp: 18, hitDie: 6, bab: 'medium', defense: { ref: 2, von: 1 },
    trainedSkills: 4, credits: { dice: '3d4', mult: 250 },
    classSkills: ['Acrobacia', ...ALL_KNOWLEDGE, 'Enganar', 'Furtividade', 'Iniciativa', 'Mecânica', 'Percepção', 'Persuasão', 'Pilotar', 'Reunir Informação', 'Usar Computador'],
    startingFeats: ['Tiro à Queima Roupa', 'Proficiência em Arma (pistolas)', 'Proficiência em Arma (armas simples)'],
    bonusFeats: ['Mira Fatal', 'Esquiva', 'Defesa de Ataque Físico', 'Mobilidade', 'Tiro Preciso', 'Saque Rápido', 'Tiro Rápido', 'Ataque em Corrida', 'Foco em Perícia', 'Treinamento em Perícia', 'Combate Veicular', 'Proficiência em Arma (armas de ataque físico avançadas)'],
    trees: [
      {
        name: 'Fortuna', talents: [
          ['Sorte do Tolo', 'Ação padrão + 1 PF: +1 de sorte em todas as defesas no encontro.'],
          ['Favorecimento da Fortuna', 'Ao conseguir um crítico, ganha uma ação padrão extra.'],
          ['Jogador', '+2 de competência em Sabedoria em jogos de azar (cumulativo).'],
          ['Jeito', '1/dia, re-rola um teste de perícia e fica com o melhor.'],
          ['Jogada de Sorte', '1/dia, re-rola um ataque e fica com o melhor.', ['Jeito']],
        ],
      },
      {
        name: 'Azar', talents: [
          ['Ataque Traiçoeiro', 'Acertar alvo sem bônus de Des na Reflexo move ele -1 passo na condição.'],
          ['Perturbador', 'Duas ações rápidas: cancela bônus de moral e intuição dos inimigos.'],
          ['Escaramuçador', 'Mover 2+ quadrados antes de atacar dá +1 no ataque.'],
          ['Ataque Furtivo', '+1d6 de dano contra alvos desprevenidos (até 6 quadrados à distância).'],
          ['Andar na Linha', 'Ação padrão: inimigos a 6 quadrados sofrem -2 nas defesas.', ['Perturbador']],
        ],
      },
      {
        name: 'Invasor de Sistemas', talents: [
          ['Artifício Rápido', 'Comando de rotina em computador como ação rápida.'],
          ['Mestre em Invasões', 'Re-rola Usar Computador para melhorar acesso, fica com o melhor.', ['Artifício Rápido']],
          ['Sondar', 'Usa Usar Computador no lugar de Reunir Informação em redes.'],
        ],
      },
      {
        name: 'Viajante Espacial', talents: [
          ['Hiperdrive', '1/dia a bordo de nave: soma nível de vigarista a uma rolagem.'],
          ['Lobo do Espaço', 'Sem penalidades em gravidade zero; proficiente em armas de nave.'],
          ['Assaltante de Naves', '+1 em ataques a bordo de naves.', ['Lobo do Espaço']],
          ['Guerreiro Estelar', '20 natural em ataque a bordo de nave dá 1 Ponto de Força temporário.', ['Lobo do Espaço']],
        ],
      },
    ],
  },
  {
    id: 'batedor', name: 'Batedor', color: 'var(--saber-green)',
    desc: 'Exploradores, rastreadores e sobreviventes das fronteiras da galáxia.',
    keyAbilities: 'Sabedoria, Destreza e Constituição',
    hp: 24, hitDie: 8, bab: 'medium', defense: { ref: 2, fort: 1 },
    trainedSkills: 5, credits: { dice: '3d4', mult: 250 },
    classSkills: [...ALL_KNOWLEDGE, 'Escalar', 'Furtividade', 'Iniciativa', 'Mecânica', 'Montar', 'Nadar', 'Percepção', 'Pilotar', 'Saltar', 'Sobrevivência', 'Tolerância'],
    startingFeats: ['Se Livrar', 'Proficiência em Arma (pistolas)', 'Proficiência em Arma (rifles)', 'Proficiência em Arma (armas simples)'],
    bonusFeats: ['Proficiência em Armadura (leve)', 'Proficiência em Armadura (média)', 'Proficiência em Armadura (pesada)', 'Tiro Cuidadoso', 'Mira Fatal', 'Esquiva', 'Tiro Longo', 'Lingüística', 'Mobilidade', 'Tiro à Queima Roupa', 'Tiro Preciso', 'Tiro Rápido', 'Ataque em Corrida', 'Foco em Perícia', 'Treinamento em Perícia', 'Atirador de Elite', 'Combate Veicular', 'Proficiência em Arma (armas de ataque físico avançadas)'],
    trees: [
      {
        name: 'Consciência', talents: [
          ['Sentidos Aguçados', 'Pode re-rolar testes de Percepção.'],
          ['Rastreador Especialista', 'Sem penalidade para rastrear em velocidade normal.', ['Sentidos Aguçados']],
          ['Iniciativa Aprimorada', 'Pode re-rolar testes de Iniciativa.', ['Sentidos Aguçados']],
          ['Tiro Certo', 'Ignora penalidade de encobrimento (não total).', ['Sentidos Aguçados']],
          ['Esquiva Sobrenatural I', 'Mantém Des na Reflexo mesmo desprevenido.', ['Sentidos Aguçados', 'Iniciativa Aprimorada']],
          ['Esquiva Sobrenatural II', 'Não pode ser flanqueado.', ['Sentidos Aguçados', 'Iniciativa Aprimorada', 'Esquiva Sobrenatural I']],
        ],
      },
      {
        name: 'Camuflagem', talents: [
          ['Furtividade Aprimorada', 'Pode re-rolar testes de Furtividade.'],
          ['Movimento Oculto', 'Sem penalidade de Furtividade ao mover na velocidade normal.'],
          ['Encobrimento Total', 'Encobrimento vira encobrimento total para você.', ['Movimento Oculto', 'Furtividade Aprimorada']],
        ],
      },
      {
        name: 'Marginal', talents: [
          ['Permutador', 'Re-rola Persuasão para pechinchar.'],
          ['Recuperação Marginal', '20 natural em perícia durante encontro dá 1 PF temporário.'],
          ['Passo Largo', '+2 quadrados de velocidade sem armadura ou com armadura leve.'],
          ['Conserto Improvisado', 'Re-rola Mecânica para reparos improvisados.'],
        ],
      },
      {
        name: 'Sobrevivente', talents: [
          ['Evasão', 'Ataques de área: metade do dano se acertar, nada se errar.'],
          ['Esforço Extremo', 'Duas ações rápidas: +5 em um teste de Vigor ou perícia de Vigor.'],
          ['Corrida de Fundo', 'Corre até 5× a velocidade.'],
          ['Pé Certo', 'Terreno difícil não reduz sua velocidade.'],
        ],
      },
    ],
  },
  {
    id: 'soldado', name: 'Soldado', color: 'var(--imperial-white)',
    desc: 'Combatentes disciplinados — de clone troopers a mercenários e rebeldes.',
    keyAbilities: 'Destreza, Constituição e Vigor',
    hp: 30, hitDie: 10, bab: 'full', defense: { ref: 1, fort: 2 },
    trainedSkills: 3, credits: { dice: '3d4', mult: 250 },
    classSkills: ['Conhecimento (Táticas)', 'Escalar', 'Iniciativa', 'Mecânica', 'Nadar', 'Percepção', 'Pilotar', 'Saltar', 'Tolerância', 'Tratar Ferimento', 'Usar Computador'],
    startingFeats: ['Proficiência em Armadura (leve)', 'Proficiência em Armadura (média)', 'Proficiência em Arma (pistolas)', 'Proficiência em Arma (rifles)', 'Proficiência em Arma (armas simples)'],
    bonusFeats: ['Proficiência em Armadura (pesada)', 'Encontrão do Bantha', 'Tiro Cuidadoso', 'Tiro em Investida', 'Trespassar', 'Reflexos de Combate', 'Ataque Coordenado', 'Esmagar', 'Mira Fatal', 'Ataque Duplo', 'Domínio de Armas Duplas I', 'Domínio de Armas Duplas II', 'Domínio de Armas Duplas III', 'Proficiência em Arma Exótica', 'Tiro Longo', 'Trespassar Maior', 'Investida Aprimorada', 'Desarme Aprimorado', 'Artes Marciais I', 'Artes Marciais II', 'Artes Marciais III', 'Defesa de Ataque Físico', 'Golpe Impetuoso', 'Imobilizar', 'Tiro à Queima Roupa', 'Ataque Poderoso', 'Tiro Preciso', 'Saque Rápido', 'Tiro Rápido', 'Ataque Rápido', 'Ataque em Corrida', 'Se Livrar', 'Foco em Perícia', 'Treinamento em Perícia', 'Atirador de Elite', 'Lançar', 'Vitalidade', 'Banda', 'Ataque Triplo', 'Triplo Crítico', 'Combate Veicular', 'Proficiência em Arma (armas de ataque físico avançadas)', 'Proficiência em Arma (armas pesadas)', 'Rajada de Tiros'],
    trees: [
      {
        name: 'Especialista em Armadura', talents: [
          ['Defesa Blindada', 'Na Reflexo usa o maior entre nível heróico e bônus de armadura.'],
          ['Defesa Blindada Aprimorada', 'Na Reflexo usa nível + metade da armadura, ou a armadura (o maior).', ['Defesa Blindada']],
          ['Domínio de Armadura', '+1 no bônus máximo de Destreza da armadura.', ['Defesa Blindada']],
          ['Juggernauta', 'A armadura não reduz sua velocidade.', ['Defesa Blindada']],
          ['Segunda Pele', '+1 no bônus de armadura (Ref) e de equipamento (Fort).', ['Defesa Blindada']],
        ],
      },
      {
        name: 'Brigão', talents: [
          ['Especialista em Agarrar', '+2 de competência em ataques de agarrar.'],
          ['Clube do Tiro', 'Usa arma de ataque à distância como clava sem penalidade.'],
          ['Colisão Física', '+1 de dano em ataques físicos.'],
          ['Ataque Atordoante', 'Ataque físico que iguala o limiar move o alvo -1 passo extra.', ['Colisão Física']],
          ['Desequilibrar Oponente', 'Oponente designado não soma Vigor nos ataques contra você.'],
        ],
      },
      {
        name: 'Comando', talents: [
          ['Análise da Batalha', 'Ação rápida, Conhecimento (Táticas) CD 15: sabe quem está com metade dos PV.'],
          ['Cobrir Fogo', 'Atirar com pistola/rifle dá +1 de Reflexo a aliados a 6 quadrados.', ['Análise da Batalha']],
          ['Demolidor', 'Explosivos plantados com Mecânica causam +2 dados de dano.'],
          ['Atrair Fogo', 'Ação rápida, Persuasão vs. Vontade: inimigos só podem atacar você.'],
          ['Caminho da Dor', '1/dia: recebe os ataques no lugar de um aliado adjacente.'],
          ['Indomável', '1/dia, ação rápida: sobe +5 passos na condição.'],
          ['Duro Feito Pedra', 'Uma Segunda Chance extra por dia.'],
        ],
      },
      {
        name: 'Especialista em Arma', talents: [
          ['Ataque Devastador', 'Com o grupo de armas escolhido, trata o limiar do alvo como 5 menor.'],
          ['Ataque Penetrante', 'Com o grupo de armas escolhido, trata a redução de dano do alvo como 5 menor.'],
          ['Especialização em Arma', '+2 de dano com o grupo de armas escolhido.', ['Foco em Arma']],
        ],
      },
    ],
  },
];

export const FORCE_TREES = [
  {
    name: 'Alteração (Força)', talents: [
      ['Ataque Disciplinado', 'Exclui alvos (= mod. Sab, mín. 1) de poderes em cone.'],
      ['Poder Telecinético', '20 natural em poderes telecinéticos permite usá-los de novo como ação livre.'],
      ['Recuperação Telecinética', '1/encontro, ação rápida: recupera um poder telecinético gasto.'],
    ],
  },
  {
    name: 'Controle (Força)', talents: [
      ['Redução de Dano 10', 'Ação padrão + 1 PF: RD 10 por 1 minuto.'],
      ['Equilíbrio', 'Ação rápida + 1 PF: remove condições debilitantes.'],
      ['Foco na Força', 'Rodada completa, Usar a Força CD 15: recupera um poder gasto.'],
      ['Recuperação da Força', 'Ao usar Segunda Chance, cura +1d6 por PF que possuir.', ['Equilíbrio']],
    ],
  },
  {
    name: 'Lado Sombrio (Força)', darkSide: true, talents: [
      ['Poder do Lado Sombrio', 'Ao gastar PF num ataque, rola um dado extra e fica com o melhor (+1 Lado Sombrio).'],
      ['Presença Sombria', 'Ação padrão: você e aliados a 6 quadrados +1 de Força nas defesas.', ['Poder do Lado Sombrio']],
      ['Vingança', 'Quando um aliado cai, +2 em ataque e dano até o fim do encontro.', ['Presença Sombria', 'Poder do Lado Sombrio']],
      ['Poder Rápido', '1/dia: usa um poder de ação padrão/movimento como ação rápida.', ['Poder do Lado Sombrio']],
    ],
  },
  {
    name: 'Sentidos (Força)', talents: [
      ['Percepção da Força', 'Usa Usar a Força no lugar de Percepção.'],
      ['Piloto da Força', 'Usa Usar a Força no lugar de Pilotar.'],
      ['Previsão', '1 PF: re-rola Iniciativa e fica com o melhor.', ['Percepção da Força']],
      ['Avaliar Potencial da Força', 'Ação padrão: descobre se o alvo é sensitivo, quantos poderes e PF tem.', ['Percepção da Força']],
      ['Visões', 'Com Ver à Distância, enxerga passado ou futuro (+1 PF).', ['Percepção da Força']],
    ],
  },
];

// Talentos (feats). prereq é texto livre (verificado pelo jogador / mestre), choice indica escolha extra.
export const FEATS = [
  ['Acuidade com Arma', 'BBA +1', 'Usa Des no lugar de Vig nos ataques com armas físicas leves e sabres de luz.'],
  ['Artes Marciais I', '—', 'Dano desarmado +1 categoria de dado; +1 de esquiva na Reflexo.'],
  ['Artes Marciais II', 'Artes Marciais I, BBA +3', 'Dano desarmado +1 categoria; +1 de esquiva na Reflexo.'],
  ['Artes Marciais III', 'Artes Marciais II, BBA +6', 'Dano desarmado +1 categoria; +1 de esquiva na Reflexo.'],
  ['Ataque Acrobático', 'Treinado em Acrobacia', '+5 no próximo ataque contra o oponente pelo qual passou com cambalhota.'],
  ['Ataque Coordenado', 'BBA +2', 'Sucesso automático ao prestar auxílio à queima-roupa.'],
  ['Ataque Duplo', 'BBA +6', 'Ataque extra no ataque total, -5 em todos os ataques.'],
  ['Ataque em Corrida', 'Des 13', 'Move antes e depois de atacar.'],
  ['Ataque Poderoso', 'Vig 13', 'Troca bônus de ataque por dano em ataques físicos.'],
  ['Ataque Rápido', 'Des 13, BBA +1', '-2 no ataque físico para causar +1 dado de dano.'],
  ['Ataque Triplo', 'BBA +9, Ataque Duplo', 'Segundo ataque extra no ataque total, -5 adicional.'],
  ['Ataque Turbilhão', 'Des 13, Int 13, Defesa de Ataque Físico, BBA +4', 'Ataque físico contra cada oponente adjacente.'],
  ['Atirador de Elite', 'Tiro à Queima Roupa, Tiro Preciso, BBA +4', 'Ignora cobertura móvel em ataques à distância.'],
  ['Banda', 'BBA +1', 'Derruba um oponente que você agarrou.'],
  ['Bênção da Força', 'Sensitividade da Força', '+3 Pontos de Força a cada nível.'],
  ['Cirurgia Cibernética', 'Treinado em Tratar Ferimento', 'Instala próteses cibernéticas.'],
  ['Combate Veicular', 'Treinado em Pilotar', 'Nega um ataque por rodada contra o veículo que pilota.'],
  ['Defesa de Ataque Físico', 'Int 13', 'Troca bônus de ataque físico por esquiva na Reflexo.'],
  ['Defesas Aprimoradas', '—', '+1 em todas as defesas.'],
  ['Desarme Aprimorado', 'Int 13, Defesa de Ataque Físico', '+5 em ataques para desarmar.'],
  ['Domínio de Armas Duplas I', 'Des 13, BBA +1', 'Penalidade de duas armas cai para -5.'],
  ['Domínio de Armas Duplas II', 'Des 15, BBA +6, DAD I', 'Penalidade de duas armas cai para -2.'],
  ['Domínio de Armas Duplas III', 'Des 17, BBA +11, DAD II', 'Sem penalidade com duas armas.'],
  ['Encontrão do Bantha', 'Vig 13, BBA +1', 'Empurra o oponente 1 quadrado após acertar.'],
  ['Esmagar', 'Imobilizar, BBA +1', 'Causa dano desarmado em oponente imobilizado.'],
  ['Especialização Cirúrgica', 'Treinado em Tratar Ferimento', 'Cirurgia em 10 minutos.'],
  ['Esquiva', 'Des 13', '+1 de esquiva na Reflexo contra um alvo escolhido.'],
  ['Foco em Arma', 'Proficiência na arma', '+1 nos ataques com o grupo de armas escolhido.', 'weaponGroup'],
  ['Foco em Perícia', 'Perícia treinada', '+5 de competência na perícia escolhida.', 'skill'],
  ['Forte na Força', '—', 'Rola d8 ao invés de d6 ao gastar Ponto de Força.'],
  ['Fúria Extra', 'Traço Fúria', 'Uma fúria adicional por dia.'],
  ['Fúria Terrível', 'Traço Fúria, BBA +1', 'Bônus de fúria vira +4.'],
  ['Golpe Impetuoso', 'Vig 13', 'Duas ações rápidas para dano extra em ataque físico.'],
  ['Imobilizar', 'BBA +1', 'Oponente agarrado fica imobilizado por 1 rodada.'],
  ['Investida Aprimorada', 'Des 13, Esquiva, Mobilidade', 'Investe sem precisar de linha reta.'],
  ['Investida Poderosa', 'Médio+, BBA +1', '+2 no ataque ao investir e dano extra.'],
  ['Lançar', 'Banda, BBA +1', 'Arremessa oponente agarrado e causa dano.'],
  ['Limiar de Dano Aprimorado', '—', '+5 no limiar de dano.'],
  ['Lingüística', 'Int 13', 'Linguagens extras = 1 + mod. Int.'],
  ['Mira Fatal', 'Tiro à Queima Roupa, Tiro Preciso, BBA +4', 'Ao mirar, causa dano extra.'],
  ['Mobilidade', 'Des 13, Esquiva', '+5 de esquiva contra ataques de oportunidade.'],
  ['Proficiência em Arma', '—', 'Sem -5 nos ataques com o grupo de armas.', 'weaponGroup'],
  ['Proficiência em Arma Exótica', 'BBA +1', 'Usa uma arma exótica sem penalidade.'],
  ['Proficiência em Armadura (leve)', '—', 'Sem penalidades em armadura leve.'],
  ['Proficiência em Armadura (média)', 'Armadura (leve)', 'Sem penalidades em armadura média.'],
  ['Proficiência em Armadura (pesada)', 'Armadura (média)', 'Sem penalidades em armadura pesada.'],
  ['Rajada de Tiros', 'Vig 13, Prof. armas pesadas', '-5 em ataque automático para +2 dados de dano.'],
  ['Reflexos de Combate', '—', 'Ataques de oportunidade adicionais.'],
  ['Saque Rápido', 'BBA +1', 'Saca arma como ação rápida.'],
  ['Se Livrar', 'Con 13, treinado em Tolerância', 'Duas ações rápidas: sobe +1 passo na condição.'],
  ['Segunda Chance Extra', 'Treinado em Tolerância', 'Uma Segunda Chance adicional por dia.'],
  ['Sensitividade da Força', 'Não dróide', 'Pode usar Usar a Força e aptidões da Força.'],
  ['Tiro à Queima Roupa', '—', '+1 em ataque e dano à distância à queima-roupa.'],
  ['Tiro Cuidadoso', 'Tiro à Queima Roupa, BBA +2', 'Ao mirar, +1 no ataque.'],
  ['Tiro em Investida', 'BBA +4', 'Ataque à distância ao fim de uma investida (-2).'],
  ['Tiro Longo', 'Tiro à Queima Roupa', 'Reduz penalidades de distância.'],
  ['Tiro Preciso', 'Tiro à Queima Roupa', 'Sem -5 ao atirar em combate corpo a corpo.'],
  ['Tiro Rápido', 'BBA +1', '-2 no ataque à distância para +1 dado de dano.'],
  ['Treinamento da Força', 'Sensitividade da Força', 'Aprende 1 + mod. Sab poderes da Força (mín. 1).'],
  ['Treinamento em Perícia', '—', 'Torna-se treinado em uma perícia de classe.', 'skill'],
  ['Trespassar', 'Vig 13, Ataque Poderoso', 'Ataque extra ao derrubar um alvo.'],
  ['Trespassar Maior', 'Trespassar, BBA +4', 'Sem limite de ataques de trespassar.'],
  ['Triplo Crítico', 'BBA +8', 'Dano triplo em acerto crítico.'],
  ['Vitalidade', '—', '+1 PV por nível de personagem.'],
].map(([name, prereq, desc, choice]) => ({ name, prereq, desc, choice }));

export const FORCE_POWERS = [
  { name: 'Aperto da Força', time: 'Padrão', tags: [], dcs: [[15, '2d6 de dano se ≥ limiar; ≥ Fort: só uma ação rápida'], [20, '4d6 de dano'], [25, '6d6 de dano']], desc: 'Sufoca ou esmaga um alvo a até 6 quadrados. Pode manter. +1 PF: +2d6.' },
  { name: 'Arremeter', time: 'Livre', tags: [], dcs: [[10, '+10 Saltar, +2 quadrados'], [15, '+20 Saltar, +4 quadrados'], [20, '+30 Saltar, +6 quadrados']], desc: 'Salto e velocidade sobre-humanos até o fim do próximo turno.' },
  { name: 'Ataque de Batalha', time: 'Rápida', tags: [], dcs: [[15, '+1 no ataque, +1d6 de dano'], [20, '+1 no ataque, +2d6 de dano'], [25, '+1 no ataque, +3d6 de dano']], desc: 'Fortalece seu próximo ataque. +1 PF: +2d6.' },
  { name: 'Atordoamento da Força', time: 'Padrão', tags: [], dcs: [['Limiar', '-1 passo na condição, -1 extra a cada 5 acima']], desc: 'Sobrecarrega os sentidos do alvo. Compare com o limiar de dano.' },
  { name: 'Desarme da Força', time: 'Padrão', tags: [], dcs: [['Ataque', 'Substitui a rolagem de desarme']], desc: 'Arranca a arma do alvo, que pode voar para sua mão. +1 PF: danifica a arma.' },
  { name: 'Empurrão da Força', time: 'Padrão', tags: [], dcs: [['Vontade', 'Empurra o alvo; contra objeto maior +2d6 com 1 PF']], desc: 'Empurra um alvo para longe de você.' },
  { name: 'Fúria Sombria', time: 'Rápida', tags: ['Lado Sombrio'], dcs: [[15, '+2 de fúria em ataque e dano físicos'], [20, '+4'], [25, '+6']], desc: 'O lado sombrio corre por você. Sem perícias de concentração.' },
  { name: 'Mover Objeto', time: 'Padrão', tags: [], dcs: [[15, 'Médio, 2d6'], [20, 'Grande, 4d6'], [25, 'Enorme, 6d6'], [30, 'Imenso, 8d6'], [35, 'Colossal, 10d6']], desc: 'Telecinese: move e arremessa alvos a até 6 quadrados.' },
  { name: 'Negar Energia', time: 'Reação', tags: [], dcs: [['Dano', 'Nega o ataque de arma de energia se ≥ dano']], desc: 'Absorve um disparo de blaster ou golpe de sabre.' },
  { name: 'Pancada da Força', time: 'Padrão', tags: [], dcs: [['Limiar', '4d6 e derruba; senão metade']], desc: 'Onda de Força em cone de 6 quadrados. +1 PF: +2d6.' },
  { name: 'Relâmpago da Força', time: 'Padrão', tags: ['Lado Sombrio'], dcs: [['Reflexo', '8d6 e -1 passo na condição; senão metade']], desc: 'Arcos mortais de energia. "Poder ilimitado!"' },
  { name: 'Repreender', time: 'Reação', tags: [], dcs: [['Teste do poder', 'Anula; +5 acima devolve o poder ao criador']], desc: 'Absorve ou reflete um poder da Força usado contra você.' },
  { name: 'Romper a Força', time: 'Padrão', tags: ['Lado Claro'], dcs: [[25, 'Alvo não gasta PF por horas = Lado Sombrio'], [30, '+ -1 passo ao usar poderes'], [35, '+ -2 passos ao usar poderes']], desc: 'Corta a conexão de um usuário do lado sombrio com a Força.' },
  { name: 'Transferência Vital', time: 'Padrão', tags: ['Lado Claro'], dcs: [[15, 'Cura 2 × nível'], [20, 'Cura 3 × nível'], [25, 'Cura 4 × nível']], desc: 'Cura um aliado tocado; você sofre metade do curado (1 PF evita).' },
  { name: 'Truque Mental', time: 'Padrão', tags: ['Ação Mental'], dcs: [['Vontade', 'Distração, finta, sugestão ou medo']], desc: '"Estes não são os dróides que você procura."' },
  { name: 'Ver à Distância', time: 'Rodada completa', tags: [], dcs: [['Vontade', 'Sente o alvo e seus arredores']], desc: 'Visão breve de alguém que você conhece, onde quer que esteja.' },
];

export const CONDITION_TRACK = [
  { step: 0, label: 'Normal', penalty: 0 },
  { step: 1, label: '-1', penalty: -1 },
  { step: 2, label: '-2', penalty: -2 },
  { step: 3, label: '-5', penalty: -5 },
  { step: 4, label: '-10 (metade da velocidade)', penalty: -10 },
  { step: 5, label: 'Indefeso / Desmaiado', penalty: -10 },
];

export const WEAPON_GROUPS = {
  simples: 'armas simples',
  pistolas: 'pistolas',
  rifles: 'rifles',
  pesadas: 'armas pesadas',
  avancadas: 'armas de ataque físico avançadas',
  sabres: 'sabres de luz',
  exoticas: 'armas exóticas',
};

// [nome, grupo, corpo-a-corpo?, dano, custo, leve?, notas]
export const WEAPONS = [
  ['Desarmado', 'simples', true, '1d4', 0, true, 'Pequeno: 1d3'],
  ['Faca', 'simples', true, '1d4', 25, true, 'Pode ser arremessada'],
  ['Bastão de atordoamento', 'simples', true, '1d6', 15, true, 'Atordoamento 2d6'],
  ['Clava/bastão', 'simples', true, '1d6', 15, true, ''],
  ['Baioneta', 'simples', true, '1d8', 50, false, ''],
  ['Lança', 'simples', true, '1d8', 60, false, 'Pode ser arremessada'],
  ['Maça', 'simples', true, '1d8', 50, false, ''],
  ['Bordão', 'simples', true, '1d6', 65, false, 'Arma dupla 1d6/1d6'],
  ['Vibroadaga', 'avancadas', true, '2d4', 200, true, 'Pode ser arremessada'],
  ['Vibrolâmina', 'avancadas', true, '2d6', 250, true, ''],
  ['Haste de força', 'avancadas', true, '2d8', 500, false, 'Atordoamento'],
  ['Vibrobaioneta', 'avancadas', true, '2d6', 350, false, ''],
  ['Eletrocajado', 'avancadas', true, '2d6', 3000, false, 'Arma dupla, atordoamento'],
  ['Vibromachado', 'avancadas', true, '2d10', 500, false, ''],
  ['Sabre de luz curto', 'sabres', true, '2d6', 2500, true, 'Energia e cortante'],
  ['Sabre de luz', 'sabres', true, '2d8', 3000, true, 'Energia e cortante'],
  ['Sabre de luz duplo', 'sabres', true, '2d8', 7000, false, 'Arma dupla 2d8/2d8'],
  ['Pistola blaster compacta', 'pistolas', false, '3d4', 300, false, 'Inexata'],
  ['Pistola blaster', 'pistolas', false, '3d6', 500, false, 'Atordoamento 2d6'],
  ['Pistola blaster esportiva', 'pistolas', false, '3d4', 300, false, 'Exata, atordoamento 2d4'],
  ['Pistola de íon', 'pistolas', false, '3d6', 250, false, 'Dano de íon'],
  ['Pistola lança-lesma', 'pistolas', false, '2d6', 250, false, 'Perfurante'],
  ['Pistola blaster pesada', 'pistolas', false, '3d8', 750, false, 'Inexata, atordoamento 2d8'],
  ['Carabina blaster', 'rifles', false, '3d8', 900, false, 'Inexata, S/A'],
  ['Rifle blaster', 'rifles', false, '3d8', 1000, false, 'S/A, atordoamento 2d8'],
  ['Rifle blaster esportivo', 'rifles', false, '3d6', 800, false, 'Exata'],
  ['Rifle de íon', 'rifles', false, '3d8', 800, false, 'Dano de íon'],
  ['Rifle lança-lesma', 'rifles', false, '2d8', 300, false, 'S/A'],
  ['Blaster repetidora leve', 'rifles', false, '3d8', 1200, false, 'Automática'],
  ['Rifle blaster pesado', 'rifles', false, '3d10', 2000, false, 'Inexata, S/A'],
  ['Bowcaster', 'exoticas', false, '3d10', 1500, false, 'Exata'],
  ['Lança-chamas', 'exoticas', false, '3d6', 1000, false, 'Área'],
  ['Blaster repetidora pesada', 'pesadas', false, '3d10', 4000, false, 'Automática'],
  ['Canhão blaster', 'pesadas', false, '3d12', 3000, false, 'Área, inexata'],
  ['Lança mísseis', 'pesadas', false, '6d6', 1500, false, 'Área'],
  ['Blaster repetidora E-Web', 'pesadas', false, '3d12', 8000, false, 'Automática, tripé'],
  ['Granada de fragmento', 'simples', false, '4d6', 200, false, 'Área 2 quadrados'],
  ['Granada de atordoamento', 'simples', false, '4d6', 250, false, 'Somente atordoamento'],
  ['Granada de íon', 'simples', false, '4d6', 250, false, 'Dano de íon'],
  ['Detonador termal', 'simples', false, '8d6', 2000, false, 'Área, ilegal'],
  ['Arco', 'simples', false, '1d6', 300, false, ''],
  ['Funda', 'simples', false, '1d4', 35, false, 'Soma Vigor ao dano'],
].map(([name, group, melee, damage, cost, light, notes]) => ({ name, group, melee, damage, cost, light, notes }));

// [nome, categoria, custo, bônus Ref, bônus Fort, Des máx]
export const ARMORS = [
  ['Capacete e traje blast', 'leve', 500, 2, 0, 5],
  ['Traje de vôo acolchoado', 'leve', 2000, 3, 1, 4],
  ['Macacão de combate', 'leve', 1500, 4, 0, 4],
  ['Traje de vôo blindado', 'leve', 4000, 5, 2, 3],
  ['Casco de caranguejo vonduun', 'leve', 0, 5, 5, 4],
  ['Armadura de stormtrooper', 'leve', 8000, 6, 2, 3],
  ['Armadura cerimonial', 'média', 5000, 7, 0, 2],
  ['Traje de força Corelliano', 'média', 10000, 7, 0, 3],
  ['Armadura de batalha', 'média', 7000, 8, 2, 2],
  ['Traje espacial encouraçado', 'pesada', 12000, 9, 3, 1],
  ['Armadura de batalha pesada', 'pesada', 15000, 10, 4, 1],
].map(([name, category, cost, ref, fort, maxDex]) => ({ name, category, cost, ref, fort, maxDex }));

export const ARMOR_PENALTY = { leve: -2, 'média': -5, pesada: -10 };

export const GEAR = [
  ['Comlink de curta distância', 25], ['Comlink de longa distância', 250], ['Codificador de bolso', 400],
  ['Datapad', 1000], ['Datapad básico', 100], ['Holoprojetor pessoal', 1000], ['Computador portátil', 5000],
  ['Chip de créditos', 100], ['Cilindro de códigos', 500], ['Eletrobinóculos', 1000], ['Bastão brilhante', 10],
  ['Lanterna de fusão', 25], ['Hologravador', 100], ['Máscara respiratória', 200], ['Respirador aquata', 350],
  ['Traje de vôo', 1000], ['Traje espacial', 2000], ['Medpac', 100], ['Kit médico', 600], ['Kit cirúrgico', 1000],
  ['Capa de todas as temperaturas', 100], ['Corda sintética', 20], ['Kit de campo', 1000], ['Pacote de rações', 5],
  ['Propulsor a jato', 300], ['Reservatório de cabo líquido', 10], ['Algemas', 50], ['Célula de energia', 10],
  ['Cinto de utilidades', 500], ['Kit de ferramentas', 250], ['Kit de segurança', 750], ['Recarregador de energia', 100],
  ['Coldre de quadril', 25], ['Coldre escondido', 50], ['Mira telescópica', 100], ['Cartucheira', 100],
].map(([name, cost]) => ({ name, cost }));

export const LANGUAGES = ['Básico', 'Binário', 'Bocce', 'Bothês', 'Cereano', 'Dosh', 'Durês', 'Ewokês', 'Gamorreano', 'Gunganês', 'Alto Galáctico', 'Huttês', 'Ithorês', 'Linguagem de Comércio Jawa', 'Kel Dor', 'Mon Calamariano', 'Quarrenês', 'Rodês', 'Ryl', 'Shyriiwook', 'Sullustês', 'Zabrak'];

export const XP_TABLE = [0, 1000, 3000, 6000, 10000, 15000, 21000, 28000, 36000, 45000, 55000, 66000, 78000, 91000, 105000, 120000, 136000, 153000, 171000, 190000];
export const FEAT_LEVELS = [1, 3, 6, 9, 12, 15, 18];
export const ABILITY_INCREASE_LEVELS = [4, 8, 12, 16, 20];

export const QUOTES = [
  ['Faça ou não faça. Tentativa não há.', 'Yoda'],
  ['Que a Força esteja com você.', 'Obi-Wan Kenobi'],
  ['Nunca me diga as chances!', 'Han Solo'],
  ['Eu tenho um mau pressentimento sobre isso.', 'Vários'],
  ['O medo é o caminho para o lado sombrio.', 'Yoda'],
  ['Este é o caminho.', 'Din Djarin'],
  ['Rebeliões são construídas na esperança.', 'Jyn Erso'],
  ['Eu sou o Senado.', 'Palpatine'],
  ['Não é sorte. Não existe essa coisa de sorte.', 'Obi-Wan Kenobi'],
  ['Pare de mexer nesses controles!', 'C-3PO'],
];

export const classById = (id) => CLASSES.find((c) => c.id === id);
export const speciesById = (id) => SPECIES.find((s) => s.id === id);
export const skillByName = (name) => SKILLS.find((s) => s.name === name);
export const featByName = (name) => FEATS.find((f) => name === f.name || name.startsWith(f.name + ' ('));
export const weaponByName = (name) => WEAPONS.find((w) => w.name === name);
export const armorByName = (name) => ARMORS.find((a) => a.name === name);
export const powerByName = (name) => FORCE_POWERS.find((p) => p.name === name);

// ---------- Heróis dróides (Cap. 11) ----------
export const DROID_CATEGORIES = [
  { id: '1', name: '1ª categoria', mods: { int: 2, sab: 2, vig: -2 }, roles: 'médico, científico', example: 'Dróide médico 2-1B' },
  { id: '2', name: '2ª categoria', mods: { int: 2, car: -2 }, roles: 'astromecânico, técnico', example: 'R2-D2' },
  { id: '3', name: '3ª categoria', mods: { sab: 2, car: 2, vig: -2 }, roles: 'protocolo, serviço', example: 'C-3PO' },
  { id: '4', name: '4ª categoria', mods: { des: 2, int: -2, car: -2 }, roles: 'combate, segurança', example: 'K-2SO, IG-88' },
  { id: '5', name: '5ª categoria', mods: { vig: 4, int: -4, car: -4 }, roles: 'operário, utilidade', example: 'Dróide operário ASP' },
];
export const DROID_SIZES = [
  { id: 'medio', name: 'Médio', mods: {}, speed: 6, ref: 0, stealth: 0, locomotion: 'andarilho (pernas)' },
  { id: 'pequeno', name: 'Pequeno', mods: { vig: -2, des: 2 }, speed: 4, ref: 1, stealth: 5, locomotion: 'esteiras' },
];
export const DROID_POINT_BUY_TOTAL = 21;
export const DROID_STANDARD_ARRAY = [15, 14, 13, 12, 10];

SPECIES.push({
  id: 'droide', name: 'Dróide', droid: true, mods: {}, speed: 6, size: 'Médio',
  languages: ['Binário', 'Básico'],
  desc: 'Um dróide "dono de si mesmo" com processador heurístico. Sem Constituição e sem ligação com a Força.',
  traits: [
    ['Não Vivente', 'Sem Constituição: usa o Vigor na Fortitude e não ganha PV por Con. Imune a veneno, doença, radiação, vácuo, atordoamento e efeitos de ação mental.'],
    ['Sem Força', 'Não pode ser Jedi, pegar Sensitividade da Força nem aprender poderes.'],
    ['Vulnerável a Íon', 'Armas de íon têm nele o efeito que o atordoamento tem em seres vivos.'],
    ['Reparo', 'Só recupera PV com a perícia Mecânica (-5 para consertar a si mesmo).'],
    ['Desativado / Destruído', 'Com 0 PV fica desativado; se o golpe também passou do limiar, é destruído.'],
    ['Manutenção', 'Precisa recarregar 1 hora a cada 100 horas, ou desce na condição.'],
    ['Inibidores de Comportamento', 'Fora da 4ª categoria, não pode ferir seres vivos de propósito (o processador heurístico permite interpretar criativamente).'],
    ['Memória', 'Perícias, talentos e aptidões podem ser reprogramados com Usar Computador.'],
    ['Sistemas iniciais', 'Processador heurístico, 2 braços e até 1.000 créditos em acessórios de dróide.'],
  ],
});
