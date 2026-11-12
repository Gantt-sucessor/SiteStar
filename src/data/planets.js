// Planetas da galáxia. Os marcados com book: true vêm do Cap. 13 do livro (região, clima, capital);
// os demais são mundos conhecidos dos filmes, para completar o mapa.
// x, y: posição no mapa (0 a 1000 × 0 a 700), aproximando a grade clássica da galáxia.

export const REGIONS = [
  { id: 'centro', name: 'Centro (Núcleo)', r: 70 },
  { id: 'colonias', name: 'Colônias', r: 120 },
  { id: 'orla-interior', name: 'Orla Interior', r: 165 },
  { id: 'expansao', name: 'Região da Expansão', r: 210 },
  { id: 'orla-intermediaria', name: 'Orla Intermediária', r: 270 },
  { id: 'orla-exterior', name: 'Orla Exterior', r: 360 },
];
export const GALAXY_CENTER = { x: 500, y: 330 };

export const PLANETS = [
  { id: 'bespin', name: 'Bespin', region: 'Orla Exterior', climate: 'Temperado (na zona de vida)', capital: 'Cidade das Nuvens', x: 410, y: 640, book: true,
    desc: 'Gigante gasoso famoso pelo gás Tibanna, usado em munição de blasters. A Cidade das Nuvens é uma colônia de mineração neutra, porto seguro de contrabandistas no Setor Anoat.' },
  { id: 'bothawui', name: 'Bothawui', region: 'Orla Intermediária', climate: 'Temperado', capital: 'Drev’starn', x: 735, y: 470, book: true,
    desc: 'Mundo de montanhas e vales perigosos, lar dos Bothans e da SpyNet, a maior rede de informações da galáxia. Política aqui é feita de espionagem e sabotagem.' },
  { id: 'cerea', name: 'Cerea', region: 'Orla Intermediária', climate: 'Temperado', capital: 'Tecave', x: 300, y: 430, book: true,
    desc: 'Mundo pastoril dos Cereanos, que rejeitam boa parte da tecnologia de fora. Exporta alimentos; governado por um Conselho dos Anciões.' },
  { id: 'coruscant', name: 'Coruscant', region: 'Centro', climate: 'Temperado (urbano)', capital: 'Cidade Galáctica', x: 505, y: 300, book: true,
    desc: 'Uma cidade do tamanho de um planeta e centro político da galáxia. Nos níveis inferiores, longe da luz do sol, vivem criminosos e esquecidos.' },
  { id: 'dorin', name: 'Dorin', region: 'Região da Expansão', climate: 'Temperado (baixo oxigênio)', capital: '—', x: 420, y: 210, book: true,
    desc: 'Lar dos Kel Dor, que precisam de máscaras de respiração fora de sua atmosfera de hélio e gases próprios.' },
  { id: 'duro', name: 'Duro', region: 'Centro', climate: 'Temperado (poluído)', capital: '—', x: 560, y: 280, book: true,
    desc: 'Berço dos Duros, uma das primeiras espécies a viajar pelo hiperespaço. A superfície foi arruinada pela poluição; a população vive em estações orbitais.' },
  { id: 'endor', name: 'Endor (lua florestal)', region: 'Orla Exterior', climate: 'Temperado', capital: '—', x: 300, y: 570, book: true,
    desc: 'Lua coberta de florestas gigantes, lar dos Ewoks. Isolada e esquecida, mas cenário de uma das batalhas mais famosas da história.' },
  { id: 'gamorr', name: 'Gamorr', region: 'Orla Exterior', climate: 'Temperado', capital: '—', x: 590, y: 90, book: true,
    desc: 'Mundo dos Gamorreanos, onde clãs vivem em guerra constante. Seus nativos são muito procurados como guardas e capangas.' },
  { id: 'iridonia', name: 'Iridonia', region: 'Orla Intermediária', climate: 'Árido (quente)', capital: '—', x: 330, y: 140, book: true,
    desc: 'Planeta hostil, de mares ácidos e desfiladeiros, lar dos Zabraks, conhecidos pela determinação e tatuagens faciais.' },
  { id: 'ithor', name: 'Ithor', region: 'Orla Intermediária', climate: 'Tropical', capital: '—', x: 620, y: 150, book: true,
    desc: 'Mundo de florestas sagradas. Os Ithorianos vivem em cidades flutuantes (as manadas) para não tocar a Mãe Selva.' },
  { id: 'kashyyyk', name: 'Kashyyyk', region: 'Orla Intermediária', climate: 'Temperado', capital: 'Rwookrrorro', x: 700, y: 230, book: true,
    desc: 'Mundo coberto por árvores wroshyr colossais, lar dos Wookiees. Os níveis mais baixos da floresta escondem predadores mortais.' },
  { id: 'mon-calamari', name: 'Mon Calamari', region: 'Orla Exterior', climate: 'Temperado', capital: 'Coral Depths', x: 905, y: 150, book: true,
    desc: 'Mundo oceânico dos Mon Calamari e dos Quarren, famoso pelos estaleiros que produzem algumas das maiores naves da galáxia.' },
  { id: 'naboo', name: 'Naboo', region: 'Orla Intermediária', climate: 'Temperado', capital: 'Theed', x: 640, y: 560, book: true,
    desc: 'Planeta de campos verdes e lagos, com cidades humanas elegantes na superfície e cidades Gungan sob as águas.' },
  { id: 'nar-shaddaa', name: 'Nar Shaddaa', region: 'Orla Intermediária', climate: 'Temperado (urbano)', capital: '—', x: 790, y: 380, book: true,
    desc: 'A Lua dos Contrabandistas, em órbita de Nal Hutta. Uma cidade vertical e decadente, sob o controle dos Hutts, onde tudo tem preço.' },
  { id: 'rodia', name: 'Ródia', region: 'Orla Intermediária', climate: 'Tropical e árido (quente)', capital: 'Equator City', x: 760, y: 530, book: true,
    desc: 'Mundo de selvas quentes dos Rodianos, cultura que celebra a caça. Muitos caçadores de recompensas vêm daqui.' },
  { id: 'ryloth', name: 'Ryloth', region: 'Orla Exterior', climate: 'Subártico, temperado e árido', capital: 'Lessu', x: 810, y: 580, book: true,
    desc: 'Mundo dos Twi’leks, com um lado eternamente quente e outro gelado. Exporta a especiaria ryll; muitos nativos foram escravizados.' },
  { id: 'sullust', name: 'Sullust', region: 'Orla Exterior', climate: 'Super aquecido', capital: 'Pinyumb', x: 520, y: 610, book: true,
    desc: 'Mundo vulcânico de atmosfera tóxica. Os Sullustanos vivem em cavernas subterrâneas e dominam a indústria de naves da SoroSuub.' },
  { id: 'tatooine', name: 'Tatooine', region: 'Orla Exterior', climate: 'Árido', capital: 'Bestine', x: 735, y: 615, book: true,
    desc: 'Planeta desértico de dois sóis, longe de tudo. Hutts, contrabandistas, fazendeiros de umidade e povo da areia. Mos Eisley é o porto mais famoso.' },
  { id: 'trandosha', name: 'Trandosha', region: 'Orla Intermediária', climate: 'Árido', capital: 'Hsskhor', x: 720, y: 250, book: true,
    desc: 'Mundo dos Trandoshanos, répteis caçadores e inimigos tradicionais dos Wookiees. Seus caçadores pontuam vitórias para a deusa Scorekeeper.' },
  // ---------- fora do livro (filmes) ----------
  { id: 'dantooine', name: 'Dantooine', region: 'Orla Exterior', climate: 'Temperado (pradarias)', capital: '—', x: 250, y: 80,
    desc: 'Mundo de pradarias e colinas, quase despovoado. Abrigou um antigo enclave Jedi; hoje, só ruínas e eremitas.' },
  { id: 'corellia', name: 'Corellia', region: 'Centro', climate: 'Temperado', capital: 'Coronet', x: 545, y: 350,
    desc: 'Mundo de estaleiros e pilotos lendários. Os melhores cargueiros da galáxia (e os melhores contrabandistas) vêm daqui.' },
  { id: 'alderaan-ruinas', name: 'Campo de destroços de Alderaan', region: 'Centro', climate: '—', capital: '—', x: 535, y: 315,
    desc: 'O que restou de um mundo pacífico destruído por uma superarma. Peregrinos e saqueadores ainda vagam entre os destroços.' },
  { id: 'kessel', name: 'Kessel', region: 'Orla Exterior', climate: 'Árido (minas)', capital: '—', x: 840, y: 330,
    desc: 'Mundo das minas de especiaria, cercado por um aglomerado de buracos negros. A rota de Kessel é a prova dos contrabandistas.' },
  { id: 'hoth', name: 'Hoth', region: 'Orla Exterior', climate: 'Glacial', capital: '—', x: 400, y: 670,
    desc: 'Planeta de gelo e nevascas, lar dos wampas e tauntauns. Já serviu de base escondida.' },
  { id: 'dagobah', name: 'Dagobah', region: 'Orla Exterior', climate: 'Pantanoso', capital: '—', x: 560, y: 660,
    desc: 'Um pântano coberto de névoa, forte na Força. Viajantes relatam sensações estranhas e cavernas que mostram medos.' },
  { id: 'yavin', name: 'Yavin 4', region: 'Orla Exterior', climate: 'Tropical (selva)', capital: '—', x: 650, y: 100,
    desc: 'Lua de selvas em órbita de um gigante gasoso, com templos Massassi antigos. Palco da destruição da primeira Estrela da Morte.' },
  { id: 'mustafar', name: 'Mustafar', region: 'Orla Exterior', climate: 'Vulcânico', capital: '—', x: 680, y: 660,
    desc: 'Mundo de rios de lava e minas de metais raros. Dizem que o lado sombrio ainda ecoa em suas fortalezas.' },
  { id: 'geonosis', name: 'Geonosis', region: 'Orla Exterior', climate: 'Árido (rochoso)', capital: '—', x: 760, y: 630,
    desc: 'Mundo rochoso de colmeias insetóides e antigas fundições de dróides de batalha, agora abandonadas.' },
  { id: 'jakku', name: 'Jakku', region: 'Orla Exterior', climate: 'Desértico', capital: 'Posto de Niima', x: 230, y: 470,
    desc: 'Deserto cheio de carcaças de naves de uma grande batalha. Sucateiros vivem do que encontram nas areias.' },
];

export const planetById = (id, custom = []) => [...PLANETS, ...custom].find((p) => p.id === id) || null;

// Hiperdrive da nave: lê "×2 (apoio ×12)" e devolve { main: 2, backup: 12 }
export function parseHyperdrive(text) {
  const m = /×\s*(\d+(?:[.,]\d+)?)/.exec(text || '');
  const b = /apoio\s*×\s*(\d+(?:[.,]\d+)?)/.exec(text || '');
  if (!m) return null;
  const num = (s) => Number(String(s).replace(',', '.'));
  return { main: num(m[1]), backup: b ? num(b[1]) : null, navComputer: /computador de navega/i.test(text), astromech: /astromec/i.test(text) };
}

// Tabela 13-1: modificadores de CD para astronavegação (aplicados no teste de Usar Computador)
export const ASTRO_MODS = [
  ['nav', 'Usando computador de navegação', 5],
  ['nonav', 'Sem computador de navegação (nem astromecânico com coordenadas)', -10],
  ['noholo', 'Sem acesso à HoloNet', -5],
  ['rush', 'Calcular em uma rodada (ação de rodada completa)', -10],
];
