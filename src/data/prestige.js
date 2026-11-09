// Classes de prestígio (Capítulo 12), árvores de aptidão novas, Técnicas e Segredos da Força.
import { CLASSES, FORCE_TREES } from './rules.js';

export const FORCE_TECHNIQUES = [
  ['Recuperação de Ponto de Força', 'No fim de um encontro, recupera 1 Ponto de Força gasto nele (cumulativo).'],
  ['Domínio de Poder da Força', 'Escolha um poder: pode escolher 10 em Usar a Força para ativá-lo mesmo ameaçado.'],
  ['Transe da Força Aprimorado', 'Em transe da Força, recupera 2 × nível em PV por hora.'],
  ['Mover Objeto Leve Aprimorado', 'Mover objeto leve como ação rápida; usá-lo como arma é ação de movimento.'],
  ['Sentir a Força Aprimorado', 'Sentir a Força como ação de movimento.'],
  ['Sentir os Arredores Aprimorado', 'Sentir os arredores como ação livre.'],
  ['Telepatia Aprimorada', 'Re-rola testes de telepatia e fica com o melhor.'],
].map(([name, desc]) => ({ name, desc }));

export const FORCE_SECRETS = [
  ['Poder Devastador', '1 PF: dados de dano do poder +50%. 1 Ponto de Destino: dobra os dados.'],
  ['Poder Distante', '1 PF: alcance × 10. 1 Ponto de Destino: qualquer lugar do sistema estelar.'],
  ['Poder Multialvo', '1 PF: afeta um alvo adicional. 1 Ponto de Destino: um alvo a cada 4 níveis.'],
  ['Poder Acelerado', '1 PF: poder de ação padrão/movimento vira ação rápida. 1 Ponto de Destino: vira reação.'],
  ['Poder Modelado', '1 PF: cone vira linha de 5× o comprimento. 1 Ponto de Destino: escolhe os alvos no alcance.'],
].map(([name, desc]) => ({ name, desc }));

export const PRESTIGE_TREES = [
  {
    name: 'Devoto do Lado Sombrio', darkSide: true, talents: [
      ['Canalizar Agressividade', 'Ao acertar alvo flanqueado ou sem Des na Reflexo, 1 PF: +1d6 de dano por nível de classe (máx. 10d6).'],
      ['Canalizar Ira', 'Ação rápida + 1 PF: +2 de fúria em ataque e dano físicos por 5 + Con rodadas; depois -1 passo.', ['Canalizar Agressividade']],
      ['Ataque Incapacitante', 'Num crítico, 1 PF: reduz a velocidade do alvo à metade até ele se curar totalmente.', ['Canalizar Agressividade']],
      ['Abraçar o Lado Sombrio', 'Re-rola Usar a Força em poderes [lado sombrio]; não pode mais usar poderes [lado claro].', ['Canalizar Agressividade', 'Canalizar Ira']],
    ],
  },
  {
    name: 'Adepto da Força', talents: [
      ['Perito em Poder da Força', 'Escolha um poder: 1 PF para rolar Usar a Força duas vezes e ficar com o melhor (repetível).'],
      ['Corpo Fortificado', 'Imune a doenças, venenos e radiação.', ['Equilíbrio']],
      ['Tratamento da Força', 'Usa Usar a Força no lugar de Tratar Ferimento, sem precisar de kit médico.'],
    ],
  },
  {
    name: 'Item da Força', talents: [
      ['Energizar Arma', '1 PF, rodada completa: sua arma física causa +1 dado de dano nas suas mãos.'],
      ['Harmonizar Arma', '1 PF, rodada completa: +1 de Força nos ataques com a arma harmonizada.'],
      ['Talismã da Força', '1 PF: cria um talismã que dá +1 de Força em uma defesa.'],
      ['Talismã da Força Maior', 'O talismã dá +1 em todas as defesas.', ['Talismã da Força']],
    ],
  },
  {
    name: 'Sith', darkSide: true, talents: [
      ['Cura Sombria', 'Ação padrão + 1 PF: ataque à distância vs Fortitude (6 quadrados); 1d6 por nível de classe de dano, e você cura o mesmo.'],
      ['Cura Sombria Aprimorada', 'Alcance 12 quadrados; mesmo errando causa e cura metade.', ['Cura Sombria']],
      ['Flagelo Sombrio', '+1 do lado sombrio nos ataques contra Jedi.'],
      ['Adepto do Lado Sombrio', 'Re-rola Usar a Força para poderes [lado sombrio] (aceita o novo resultado).'],
      ['Mestre do Lado Sombrio', 'Como Adepto, mas 1 PF para ficar com o melhor.', ['Adepto do Lado Sombrio']],
      ['Enganação da Força', 'Usa Usar a Força no lugar de Enganar.'],
      ['Ataque Cruel', 'Num crítico com sabre, 1 PF: alvo desce -2 passos na condição.', ['Foco em Arma (sabres de luz)', 'Especialização em Arma (sabres de luz)']],
    ],
  },
  {
    name: 'Duelista', talents: [
      ['Ataque Amputador', 'Golpe de sabre que mataria: causa metade e amputa um membro do alvo (-1 passo persistente).'],
      ['Foco em Arma Maior (sabres de luz)', '+1 nos ataques físicos com sabres de luz.', ['Foco em Arma (sabres de luz)']],
      ['Especialização em Arma Maior (sabres de luz)', '+2 no dano físico com sabres de luz.', ['Foco em Arma Maior (sabres de luz)', 'Foco em Arma (sabres de luz)', 'Especialização em Arma (sabres de luz)']],
      ['Fortificação da Força', 'Reação + 1 PF: transforma um crítico contra você em acerto normal.'],
      ['Proficiência em Multi-ataque (sabres de luz)', 'Reduz em 2 a penalidade de ataques múltiplos com sabres (repetível).'],
    ],
  },
  {
    name: 'Estilos com Sabre de Luz', talents: [
      ['Niman', '+1 na Reflexo e na Vontade empunhando um sabre de luz.'],
      ['Ataru', 'Soma Destreza (não Vigor) ao dano do sabre de luz.'],
      ['Djen So', '1/rodada, ao ser atingido em corpo a corpo, 1 PF: contra-ataca imediatamente.'],
      ['Makashi', 'Com um sabre numa mão, Defesa com Sabre de Luz dá +2 extra (máx. +5).', ['Defesa com Sabre de Luz']],
      ['Jar\'Kai', 'Com dois sabres, Defesa com Sabre de Luz dá o dobro do bônus.', ['Defesa com Sabre de Luz', 'Niman']],
      ['Shii-Cho', 'Penalidade de Bloquear/Defletir repetidos cai para -2.', ['Bloquear', 'Defletir']],
      ['Soresu', 'Re-rola um teste falho de Bloquear ou Defletir.', ['Bloquear', 'Defletir']],
      ['Shien', '+5 no ataque ao redirecionar um disparo.', ['Defletir', 'Redirecionar Disparo']],
      ['Sokan', 'Escolhe 10 em Acrobacia para cambalhotas; quadrados ameaçados contam como 1.', ['Recuperação Acrobática']],
      ['Juyo', '1/encontro, 1 PF: re-rola o primeiro ataque de cada rodada contra um inimigo.', ['Foco em Arma (sabres de luz)', 'Especialização em Arma (sabres de luz)', 'BBA +10']],
      ['Tràkata', 'Duas ações rápidas: finta com Enganar desligando e religando a lâmina.', ['Foco em Arma (sabres de luz)', 'Especialização em Arma (sabres de luz)', 'BBA +12']],
      ['Vaapad', 'Crítico com 19 ou 20 natural usando sabre.', ['Juyo', 'Foco em Arma (sabres de luz)', 'Especialização em Arma (sabres de luz)', 'BBA +12']],
    ],
  },
  {
    name: 'Caçador de Recompensa', talents: [
      ['Marca do Caçador', 'Se mirar antes do ataque à distância e acertar, o alvo desce -1 passo na condição.'],
      ['Alvo do Caçador', '1/encontro, ação livre: designa um alvo; +dano igual ao nível de classe contra ele.', ['Marca do Caçador']],
      ['Implacável', 'Seu alvo do caçador não consegue derrubar você na condição.', ['Marca do Caçador', 'Alvo do Caçador']],
      ['Notório', 'Sem disfarce, re-rola Persuasão para intimidar e fica com o melhor.'],
      ['Negociador Impiedoso', 'Re-rola Persuasão ao pechinchar uma recompensa.', ['Notório']],
      ['Sem Lugar pra se Esconder', 'Re-rola Reunir Informação para localizar alguém.'],
    ],
  },
  {
    name: 'Táticas Militares', talents: [
      ['Táticas de Assalto', 'Ação de movimento, Conhecimento (Táticas) CD 15: você e aliados causam +1d6 contra um alvo.'],
      ['Táticas de Posicionamento', 'Ação de movimento, CD 15: aliados +1 contra flanqueados ou +1 Ref contra ataques de oportunidade.'],
      ['Táticas de Campo', 'Ação de movimento, CD 15: cobertura dá +10 na Reflexo para você e aliados.', ['Táticas de Posicionamento']],
      ['Uma pelo Time', 'Reação: recebe metade ou todo o dano de um aliado adjacente (e vice-versa).', ['Táticas de Posicionamento']],
      ['Contra-Manobrar', 'Ação padrão, CD 15: inimigos perdem bônus de competência, intuição, moral e esquiva.', ['Táticas de Posicionamento', 'Táticas de Campo']],
      ['Trocar Defesa I', 'Ação rápida: -2 numa defesa, +1 em outra.'],
      ['Trocar Defesa II', 'Ação rápida: -5 numa defesa, +2 em outra.', ['Trocar Defesa I']],
      ['Trocar Defesa III', 'Ação rápida: +5 numa defesa, -5 nas outras duas.', ['Trocar Defesa I', 'Trocar Defesa II']],
      ['Vantagem Tática', 'Usa as Táticas de Assalto, Posicionamento e Campo como ação rápida.'],
    ],
  },
  {
    name: 'Piloto Especialista', talents: [
      ['Aceleração Total', 'Escolhe 10 em Pilotar para acelerar; movimento total de veículo vai a 5×.'],
      ['Perseguidor Elusivo', 'Em perseguição, pilotos inimigos sofrem -10 no ataque quando você vence o teste.'],
      ['Evasão Veicular', 'Seu veículo sofre metade do dano de área se atingido, nenhum se errar.'],
      ['Evasivo', 'Lutando defensivamente, o veículo ganha +5 de esquiva mesmo atacando.', ['Evasão Veicular']],
      ['Manter Inteiro', '1/encontro: o veículo não desce na condição ao sofrer dano ≥ limiar.'],
      ['Perseguição Implacável', 'Rola duas vezes Pilotar para iniciar perseguições, fica com o melhor.'],
    ],
  },
  {
    name: 'Artilheiro', talents: [
      ['Artilheiro Especialista', '+1 nos ataques com armas de veículo.'],
      ['Artilheiro de Perseguição', 'Sem penalidade com armas de veículo em perseguições, mesmo sem pilotar.', ['Artilheiro Especialista']],
      ['Gatilho Rápido', 'Ataque de oportunidade contra veículos que saem do seu quadrado ou adjacente.', ['Artilheiro Especialista']],
      ['Acertar Sistemas', 'Dano ≥ limiar do veículo também o derruba -1 passo na condição.', ['Artilheiro Especialista']],
    ],
  },
  {
    name: 'Pistoleiro', talents: [
      ['Tiro Debilitante', 'Se mirar e acertar, o alvo desce -1 passo na condição.'],
      ['Tiro Enganador', 'Duas ações rápidas, Enganar vs Vontade: alvo perde a Des na Reflexo contra você.'],
      ['Saque Rápido Aprimorado', 'Saca a pistola e ataca na rodada surpresa mesmo surpreendido.'],
      ['Tiro de Derrubada', 'Se mirar e acertar, o alvo também cai deitado.'],
      ['Proficiência em Multi-ataque (pistolas)', 'Reduz em 2 a penalidade de ataques múltiplos com pistolas (repetível).'],
      ['Desarmar à Distância', 'Desarma com ataque à distância, sem risco de contra-ataque.'],
      ['Eficaz no Gatilho', 'Sem penalidade ao usar o talento Tiro Rápido.'],
    ],
  },
  {
    name: 'Infâmia', talents: [
      ['Inspirar Medo I', 'Inimigos de nível ≤ ao seu sofrem -1 em ataques e testes resistidos contra você.'],
      ['Inspirar Medo II', 'A penalidade vira -2.', ['Inspirar Medo I']],
      ['Inspirar Medo III', 'A penalidade vira -5.', ['Inspirar Medo I', 'Inspirar Medo II']],
      ['Notório', 'Sem disfarce, re-rola Persuasão para intimidar e fica com o melhor.'],
      ['Notoriedade Compartilhada', 'Seus seguidores re-rolam Persuasão para intimidar.', ['Notório']],
    ],
  },
  {
    name: 'Chefão', talents: [
      ['Atrair Seguidor', 'Ganha um seguidor leal não heróico de nível = ¾ do seu (repetível).'],
      ['Impelir Aliado I', 'Ação rápida: um aliado se move imediatamente (até 3× por turno).'],
      ['Impelir Aliado II', 'Duas ações rápidas: um aliado faz uma ação padrão ou de movimento imediatamente.', ['Impelir Aliado I']],
    ],
  },
  {
    name: 'Mestre das Armas', talents: [
      ['Foco em Arma Maior', '+1 nos ataques com o grupo de armas escolhido (repetível).', ['Foco em Arma']],
      ['Especialização em Arma Maior', '+2 no dano com o grupo de armas escolhido (repetível).', ['Foco em Arma Maior', 'Especialização em Arma']],
      ['Ataque Devastador Maior', 'Trata o limiar do alvo como 10 menor.', ['Foco em Arma Maior', 'Ataque Devastador']],
      ['Ataque Penetrante Maior', 'Trata a redução de dano do alvo como 10 menor.', ['Foco em Arma Maior', 'Ataque Penetrante']],
      ['Domínio de Arma Exótica', 'Proficiente em qualquer arma exótica.'],
      ['Proficiência em Multi-ataque (armas pesadas)', 'Reduz em 2 a penalidade de ataques múltiplos com armas pesadas.'],
      ['Proficiência em Multi-ataque (rifles)', 'Reduz em 2 a penalidade de ataques múltiplos com rifles.'],
      ['Rajada Controlada', 'Penalidade do modo automático cai em 2; armas só automáticas sem penalidade.'],
    ],
  },
];

const FORCE_TREE_NAMES = FORCE_TREES.map((t) => t.name);

// req: minLevel, minBab, skills, feats, treeTalents {trees, count}, forceTalents, powers, techniques, darkSide, special
export const PRESTIGE_CLASSES = [
  {
    id: 'adepto-forca', name: 'Adepto da Força', color: 'var(--saber-purple)', hitDie: 8, bab: 'medium', fpBase: 6, maxLevel: 10,
    defense: { ref: 2, fort: 2, von: 4 }, techniques: 'even',
    desc: 'Usuário da Força de uma tradição menos conhecida: xamãs, bruxas, profetas.',
    examples: 'Asajj Ventress, Inquisidor Tremayne, Teneniel Djo',
    req: { minLevel: 7, skills: ['Usar a Força'], feats: ['Sensitividade da Força'], forceTalents: 3 },
    treeNames: ['Devoto do Lado Sombrio', 'Adepto da Força', 'Item da Força'],
    features: { 1: ['Bônus de defesa'], even: 'Técnica da Força' },
  },
  {
    id: 'aprendiz-sith', name: 'Aprendiz Sith', color: 'var(--sith-red)', hitDie: 10, bab: 'full', fpBase: 6, maxLevel: 10,
    defense: { ref: 2, fort: 2, von: 2 }, techniques: 'even',
    desc: 'Estudante escolhido a dedo por um Lorde Sith.',
    examples: 'Darth Bandon, Lumiya, Darth Sion',
    req: { minLevel: 7, skills: ['Usar a Força'], feats: ['Sensitividade da Força', 'Proficiência em Arma (sabres de luz)'], darkSide: true, special: 'Ser membro da tradição Sith.' },
    treeNames: ['Especialista em Armadura', 'Duelista', 'Combate com Sabre de Luz', 'Sith'],
    features: { even: 'Técnica da Força' },
    note: 'Se a Pontuação do Lado Sombrio cair abaixo da Sabedoria, perde as características desta classe.',
  },
  {
    id: 'cacador-recompensa', name: 'Caçador de Recompensa', color: 'var(--warn)', hitDie: 10, bab: 'full', fpBase: 6, maxLevel: 10,
    defense: { ref: 4, fort: 2 },
    desc: 'Especialista em localizar e capturar fugitivos.',
    examples: 'Boba Fett, Bossk, Aurra Sing, IG-88',
    req: { minLevel: 7, skills: ['Sobrevivência'], treeTalents: { trees: ['Consciência'], count: 2 } },
    treeNames: ['Caçador de Recompensa', 'Azar', 'Consciência'],
    features: { even: (lvl) => `Inimigo Predileto +${Math.floor(lvl / 2)}: rodada completa observando um oponente dá esse bônus no ataque e na Reflexo contra ele.` },
  },
  {
    id: 'cavaleiro-jedi', name: 'Cavaleiro Jedi', color: 'var(--saber-blue)', hitDie: 10, bab: 'full', fpBase: 6, maxLevel: 10,
    defense: { ref: 2, fort: 2, von: 2 }, techniques: 'even',
    desc: 'Defensor da galáxia que segue o Código Jedi.',
    examples: 'Anakin (Ep. III), Luke (Ep. VI), Kyle Katarn',
    req: { minBab: 7, skills: ['Usar a Força'], feats: ['Sensitividade da Força', 'Proficiência em Arma (sabres de luz)'], special: 'Ter construído o próprio sabre de luz e ser membro da Ordem Jedi.' },
    treeNames: ['Especialista em Armadura', 'Combate com Sabre de Luz', 'Duelista', 'Estilos com Sabre de Luz'],
    features: { even: 'Técnica da Força' },
  },
  {
    id: 'discipulo-forca', name: 'Discípulo da Força', color: 'var(--saber-purple)', hitDie: 8, bab: 'medium', fpBase: 7, maxLevel: 5,
    defense: { ref: 3, fort: 3, von: 6 }, secrets: true,
    desc: 'Mestre dos mistérios mais profundos da Força.',
    examples: 'Kadann, Lorde Cronal, Rokur Gepta',
    req: { minLevel: 12, skills: ['Usar a Força'], feats: ['Sensitividade da Força'], treeTalents: { trees: ['Devoto do Lado Sombrio', 'Adepto da Força', 'Item da Força'], count: 2 }, powers: ['Ver à Distância'], techniques: 1 },
    treeNames: ['Adepto da Força', ...FORCE_TREE_NAMES],
    features: { 1: ['Indomável: imune a efeitos de ação mental.', 'Profeta: ganha 2 Pontos de Destino por nível nesta classe (pode trocar um por uma visão).'], from2: 'Segredo da Força' },
  },
  {
    id: 'lorde-sith', name: 'Lorde Sith', color: 'var(--sith-red)', hitDie: 10, bab: 'full', fpBase: 7, maxLevel: 5,
    defense: { ref: 3, fort: 3, von: 3 }, secrets: true,
    desc: 'O poderoso mestre do lado sombrio.',
    examples: 'Darth Vader, Darth Sidious, Darth Maul, Darth Bane',
    req: { minLevel: 12, skills: ['Usar a Força'], feats: ['Sensitividade da Força', 'Proficiência em Arma (sabres de luz)'], techniques: 1, darkSide: true, special: 'Ser membro da tradição Sith.' },
    treeNames: ['Sith', ...FORCE_TREE_NAMES],
    features: { 1: ['Destemido: imune a efeitos de medo.', 'Tentação: ação padrão, Persuasão vs Vontade para empurrar o alvo ao lado sombrio.'], from2: 'Segredo da Força' },
  },
  {
    id: 'mestre-jedi', name: 'Mestre Jedi', color: 'var(--saber-green)', hitDie: 10, bab: 'full', fpBase: 7, maxLevel: 5,
    defense: { ref: 3, fort: 3, von: 3 }, secrets: true,
    desc: 'Guardião da galáxia e instrutor de novas gerações Jedi.',
    examples: 'Yoda, Mace Windu, Obi-Wan (Ep. III), Kit Fisto',
    req: { minLevel: 12, skills: ['Usar a Força'], feats: ['Sensitividade da Força', 'Proficiência em Arma (sabres de luz)'], techniques: 1, special: 'Ser membro da Ordem Jedi.' },
    treeNames: ['Duelista', ...FORCE_TREE_NAMES],
    features: { 1: ['Destemido: imune a efeitos de medo.', 'Serenidade: em transe meditativo, o próximo ataque ou Usar a Força conta como 20 natural.'], from2: 'Segredo da Força' },
  },
  {
    id: 'oficial', name: 'Oficial', color: 'var(--imperial-white)', hitDie: 8, bab: 'full', fpBase: 6, maxLevel: 10,
    defense: { ref: 2, von: 4 },
    desc: 'Líder de uma força-tarefa ou grupo militar.',
    examples: 'Almirante Ackbar, Capitão Needa, General Veers',
    req: { minLevel: 7, skills: ['Conhecimento (Táticas)'], treeTalents: { trees: ['Liderança', 'Comando'], count: 1 }, special: 'Pertencer a uma organização militar (Império, Rebelião, Nova República...).' },
    treeNames: ['Táticas Militares', 'Liderança', 'Comando'],
    features: { 2: ['Ordenar Cobertura: +1 de cobertura na Reflexo por aliado adjacente (máx. metade do nível de classe).'], even: 'Dividir Aptidão: 1/dia empresta uma aptidão a aliados até o fim do encontro.' },
  },
  {
    id: 'piloto-as', name: 'Piloto Ás', color: 'var(--holo)', hitDie: 8, bab: 'medium', fpBase: 6, maxLevel: 10,
    defense: { ref: 4, fort: 2 },
    desc: 'Piloto extraordinário de caças, transportes e speeders.',
    examples: 'Wedge Antilles, Han Solo, Barão Fel, Sebulba',
    req: { minLevel: 7, skills: ['Pilotar'], feats: ['Combate Veicular'] },
    treeNames: ['Piloto Especialista', 'Artilheiro', 'Viajante Espacial'],
    features: { even: (lvl) => `Esquiva Veicular +${Math.floor(lvl / 2)} na Reflexo do veículo que você pilota.` },
  },
  {
    id: 'pistoleiro', name: 'Pistoleiro', color: 'var(--blaster-red)', hitDie: 8, bab: 'full', fpBase: 6, maxLevel: 10,
    defense: { ref: 4, von: 2 },
    desc: 'Duelista de blaster: saca mais rápido e atira primeiro.',
    examples: 'Jango Fett, Han Solo, Gallandro',
    req: { minLevel: 7, feats: ['Tiro à Queima Roupa', 'Tiro Preciso', 'Saque Rápido', 'Proficiência em Arma (pistolas)'] },
    treeNames: ['Pistoleiro', 'Fortuna'],
    features: { even: (lvl) => `Pistola Confiável: +${Math.floor(lvl / 2)} de dano com pistolas (já somado na ficha).` },
  },
  {
    id: 'senhor-crime', name: 'Senhor do Crime', color: 'var(--saber-purple)', hitDie: 8, bab: 'medium', fpBase: 6, maxLevel: 10,
    defense: { ref: 2, von: 4 }, talentEveryLevel: true,
    desc: 'Chefe de uma organização criminosa.',
    examples: 'Jabba, Príncipe Xizor, Talon Karrde',
    req: { minLevel: 7, skills: ['Enganar', 'Persuasão'], treeTalents: { trees: ['Fortuna', 'Linhagem', 'Azar'], count: 1 } },
    treeNames: ['Infâmia', 'Chefão', 'Influência'],
    features: { 2: ['Ordenar Cobertura: +1 de cobertura na Reflexo por aliado adjacente (máx. metade do nível de classe).'] },
  },
  {
    id: 'soldado-elite', name: 'Soldado de Elite', color: 'var(--imperial-white)', hitDie: 12, bab: 'full', fpBase: 6, maxLevel: 10,
    defense: { ref: 2, fort: 4 },
    desc: 'Soldado altamente treinado, comando ou guarda-costas.',
    examples: 'Kyle Katarn, General Madine, Soldado ARC Alpha-02',
    req: { minBab: 7, feats: ['Proficiência em Armadura (leve)', 'Proficiência em Armadura (média)', 'Artes Marciais I', 'Tiro à Queima Roupa'], treeTalents: { trees: ['Especialista em Armadura', 'Comando', 'Especialista em Arma'], count: 1 } },
    treeNames: ['Mestre das Armas', 'Comando', 'Camuflagem'],
    features: { 1: ['Adiar Dano: 1/encontro, reação, adia o efeito de um ataque até o fim do seu próximo turno.'], even: (lvl) => `Redução de Dano ${Math.floor(lvl / 2)} (já mostrada na ficha).` },
  },
].map((c) => ({ ...c, prestige: true }));

// Registro de todas as árvores de aptidão pelo nome
export const ALL_TREES = (() => {
  const map = {};
  for (const c of CLASSES) for (const t of c.trees) map[t.name] = t;
  for (const t of FORCE_TREES) map[t.name] = t;
  for (const t of PRESTIGE_TREES) map[t.name] = t;
  return map;
})();

export const ALL_CLASSES = [...CLASSES, ...PRESTIGE_CLASSES];
export const anyClassById = (id) => ALL_CLASSES.find((c) => c.id === id);
export const treesOfClass = (cls) => (cls.trees ? cls.trees : (cls.treeNames || []).map((n) => ALL_TREES[n]).filter(Boolean));

// Aptidões que podem ser escolhidas mais de uma vez
export const REPEATABLE_TALENTS = [
  'Defesa com Sabre de Luz', 'Coordenar', 'Jogador', 'Jeito', 'Jogada de Sorte', 'Ataque Furtivo', 'Demolidor', 'Indomável',
  'Recuperação Telecinética', 'Ataque Devastador', 'Ataque Penetrante', 'Especialização em Arma', 'Perícia Espontânea',
  'Perito em Poder da Força', 'Proficiência em Multi-ataque (sabres de luz)', 'Proficiência em Multi-ataque (pistolas)',
  'Foco em Arma Maior', 'Especialização em Arma Maior', 'Atrair Seguidor',
];

// Características de classe ganhas até um nível de classe
export function classFeatures(cls, lvl) {
  const f = cls.features || {};
  const out = [];
  for (let l = 1; l <= lvl; l++) if (f[l]) out.push(...f[l]);
  if (f.even && lvl >= 2) out.push(typeof f.even === 'function' ? f.even(lvl) : `${f.even} (${Math.floor(lvl / 2)})`);
  if (f.from2 && lvl >= 2) out.push(`${f.from2} (${lvl - 1})`);
  return out;
}
