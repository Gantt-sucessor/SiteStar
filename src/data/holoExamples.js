// Personagens de exemplo para os hologramas de espécies e classes.
// As fotos ficam em public/holo/especies/<id>.jpg e public/holo/classes/<id>.jpg (fornecidas pelo dono do site).
export const SPECIES_EXAMPLES = {
  humano: 'Padmé Amidala',
  bothan: "Borsk Fey'lya",
  cereano: 'Ki-Adi-Mundi',
  duros: 'Cad Bane',
  ewok: 'Wicket',
  gamorreano: 'Guarda Gamorreano',
  gungan: 'Jar Jar Binks',
  ithoriano: 'Momaw Nadon',
  keldor: 'Plo Koon',
  moncal: 'Almirante Ackbar',
  quarren: 'Tessek',
  rodiano: 'Greedo',
  sullustano: 'Nien Nunb',
  trandoshano: 'Bossk',
  twilek: 'Aayla Secura',
  wookiee: 'Chewbacca',
  zabrak: 'Darth Maul',
  droide: 'R2-D2',
};

export const CLASS_EXAMPLES = {
  jedi: 'Mestre Yoda',
  nobre: 'Princesa Leia',
  vigarista: 'Han Solo',
  batedor: 'Chewbacca',
  soldado: 'Capitão Rex',
  'adepto-forca': 'Asajj Ventress',
  'aprendiz-sith': 'Darth Maul',
  'cacador-recompensa': 'Boba Fett',
  'cavaleiro-jedi': 'Obi-Wan Kenobi',
  'discipulo-forca': 'Kadann',
  'lorde-sith': 'Darth Vader',
  'mestre-jedi': 'Mace Windu',
  oficial: 'Almirante Ackbar',
  'piloto-as': 'Wedge Antilles',
  pistoleiro: 'Jango Fett',
  'senhor-crime': 'Jabba, o Hutt',
  'soldado-elite': 'Soldado ARC',
};

const EXT = ['jpg', 'png', 'webp'];
export const speciesHoloSrcs = (id) => EXT.map((e) => `/holo/especies/${id}.${e}`);
export const classHoloSrcs = (id) => EXT.map((e) => `/holo/classes/${id}.${e}`);
