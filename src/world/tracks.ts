import { buildTrack, type Track, type TrackBuilder, type TrackDef } from './track';

function desert(b: TrackBuilder): void {
  b.straight(45);
  b.curve(40, 2, 20);
  b.straight(35);
  b.curve(40, -2, -20);
  b.straight(45);
  b.hill(40, 35);
  b.hill(40, -35);
  b.curve(45, 3, 0);
  b.straight(30);
  b.curve(45, -3, 0);
  b.curve(35, 2, 20);
  b.curve(35, -2, -20);
  b.straight(25);
}

function coast(b: TrackBuilder): void {
  b.straight(35);
  b.curve(35, 3, 15);
  b.curve(35, -3, -15);
  b.straight(25);
  b.hill(35, 45);
  b.curve(35, 4, -20);
  b.curve(35, -4, -25);
  b.straight(30);
  b.sCurves();
  b.curve(40, 2, 30);
  b.hill(35, -30);
  b.curve(35, -3, 0);
  b.straight(25);
}

function city(b: TrackBuilder): void {
  b.straight(25);
  b.curve(30, 5, 10);
  b.curve(25, -5, -10);
  b.straight(18);
  b.curve(30, -6, 0);
  b.curve(25, 6, 15);
  b.hill(30, 30);
  b.curve(30, 4, -15);
  b.straight(20);
  b.curve(25, -5, 0);
  b.curve(25, 5, 20);
  b.curve(30, -4, -20);
  b.straight(20);
  b.curve(30, 6, 0);
  b.curve(25, -6, 0);
  b.straight(25);
}

const definitions: TrackDef[] = [
  {
    id: 'deserto',
    name: 'DESERTO',
    difficulty: 'FÁCIL',
    blurb: 'Retas longas ao entardecer. Boa para aprender a trocar marcha.',
    laps: 5,
    seed: 1337,
    build: desert,
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
    blurb: 'Curvas fechadas entre prédios à noite. Nitro é obrigatório.',
    laps: 4,
    seed: 9091,
    build: city,
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
