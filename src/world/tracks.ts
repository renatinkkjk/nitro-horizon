import { buildTrack, type Track, type TrackBuilder, type TrackDef } from './track';

function desert(b: TrackBuilder): void {
  b.straight(50); // reta principal — pit lane à direita
  b.curve(45, 2.5, 22); // T1: curva longa à direita
  b.hill(22, 150); // subida do canyon
  b.straight(22);
  b.curve(30, -1.2, -30); // kink à esquerda no alto
  b.hill(20, -140); // descida
  b.straight(18);
  b.curve(45, 3, 55); // direita com subida
  b.hill(18, -40);
  b.straight(28);
  b.curve(35, 2, -35); // direita na descida
  b.curve(30, -1.4, 0); // kink à esquerda
  b.hill(24, 110); // subida final
  b.straight(30);
  b.curve(50, 3.6, 30); // última curva antes da reta principal
  b.hill(20, -130); // descida para a linha de chegada
  b.straight(45);
}

function coast(b: TrackBuilder): void {
  b.straight(38); // reta principal — pit lane à direita
  b.curve(35, 3, 30); // direita de entrada
  b.hill(26, 130); // subida para o farol
  b.curve(30, -2, -30);
  b.straight(22);
  b.hill(20, -120); // descida para o mar
  b.curve(40, 4, -40); // direita fechada na descida
  b.curve(25, -3, -15);
  b.straight(26);
  b.curve(30, 2, 25);
  b.curve(30, -1.5, 0);
  b.hill(24, 110); // subida final
  b.curve(35, 3.2, 35); // direita final
  b.hill(20, -125); // descida para a reta
  b.straight(30);
}

function city(b: TrackBuilder): void {
  b.straight(30); // reta principal — pit lane à direita
  b.curve(30, 5, 15); // curva 1 fechada
  b.curve(20, -3, 0);
  b.straight(16);
  b.hill(22, 120); // elevado entre prédios
  b.curve(25, 4, 15);
  b.hill(18, -100); // desce de volta ao nível da rua
  b.curve(30, -2, 20);
  b.hill(20, 80);
  b.curve(30, 5, -20);
  b.straight(18);
  b.curve(25, -3, 0);
  b.hill(22, -130); // mergulho no túnel
  b.curve(35, 4.2, 30);
  b.curve(25, -2, 0);
  b.straight(25);
}

const definitions: TrackDef[] = [
  {
    id: 'deserto',
    name: 'DESERTO',
    difficulty: 'FÁCIL',
    blurb: 'Circuito rápido de retas longas e subidas ao entardecer.',
    laps: 5,
    seed: 1337,
    build: desert,
    pit: { entry: 30, exit: 142, boxStart: 62, boxEnd: 118 },
    theme: {
      colors: {
        road: '#4a4458',
        roadAlt: '#454055',
        grass: '#c8874a',
        grassAlt: '#bd7d43',
        rumble: '#f0e6d2',
        rumbleAlt: '#d9473f',
        lane: '#f4e9d8',
        fog: '#e0a06a',
        pit: '#5a5368',
      },
      skyTop: '#2b1b4d',
      skyBottom: '#ff9d5c',
      horizon: '#ffd79a',
      parallaxFar: '#6b3f7a',
      parallaxNear: '#3d2450',
      spriteKinds: ['cactus', 'rock', 'bush'],
    },
  },
  {
    id: 'litoral',
    name: 'LITORAL',
    difficulty: 'MÉDIO',
    blurb: 'S-curvas e colinas com vista para o mar. Exige controle de marcha.',
    laps: 5,
    seed: 4242,
    build: coast,
    pit: { entry: 24, exit: 106, boxStart: 44, boxEnd: 90 },
    theme: {
      colors: {
        road: '#3f4a55',
        roadAlt: '#3a4550',
        grass: '#2f9e63',
        grassAlt: '#2b925b',
        rumble: '#eef3f7',
        rumbleAlt: '#2f7fd0',
        lane: '#f0f6fa',
        fog: '#9fd8e8',
        pit: '#4a5765',
      },
      skyTop: '#1b6fb5',
      skyBottom: '#9fe4ff',
      horizon: '#d8f4ff',
      parallaxFar: '#2f6f8f',
      parallaxNear: '#1d4a63',
      spriteKinds: ['palm', 'tree', 'bush', 'sign'],
    },
  },
  {
    id: 'cidade',
    name: 'CIDADE',
    difficulty: 'DIFÍCIL',
    blurb: 'Circuito noturno de curvas fechadas e elevados entre prédios.',
    laps: 4,
    seed: 9091,
    build: city,
    pit: { entry: 18, exit: 86, boxStart: 34, boxEnd: 80 },
    theme: {
      colors: {
        road: '#2e2e3c',
        roadAlt: '#2a2a37',
        grass: '#1a1a28',
        grassAlt: '#171724',
        rumble: '#4a4a66',
        rumbleAlt: '#e0e0ff',
        lane: '#e8e8ff',
        fog: '#1a1a2e',
        pit: '#38384a',
      },
      skyTop: '#05050f',
      skyBottom: '#2a1f4a',
      horizon: '#4a2f6a',
      parallaxFar: '#1a1330',
      parallaxNear: '#0e0a1c',
      spriteKinds: ['lamp', 'building', 'billboard', 'sign'],
    },
  },
];

export const TRACKS: Track[] = definitions.map(buildTrack);
