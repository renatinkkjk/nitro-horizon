export interface CarStats {
  velocidade: number;
  aceleracao: number;
  grip: number;
  tanque: number;
  consumo: number;
}

export type CarStyle = 'gt' | 'muscle' | 'light' | 'turbo' | 'rx7';

export interface CarSpec {
  id: string;
  name: string;
  tagline: string;
  body: string;
  accent: string;
  style: CarStyle;
  maxSpeed: number;
  accelFactor: number;
  grip: number;
  fuelCapacity: number;
  fuelBurn: number;
  nitros: number;
  stats: CarStats;
}

/** Velocidades em unidades de mundo por segundo (a pista tem ~300.000 por volta). */
export const CAR_SPECS: CarSpec[] = [
  {
    id: 'rx7',
    name: 'MAZDA RX-7',
    tagline: 'Rotativo equilibrado — o all-rounder.',
    body: '#f0f2f6',
    accent: '#ff2d55',
    style: 'rx7',
    maxSpeed: 11800,
    accelFactor: 4.2,
    grip: 0.86,
    fuelCapacity: 96,
    fuelBurn: 1.0,
    nitros: 3,
    stats: { velocidade: 3, aceleracao: 3, grip: 3, tanque: 3, consumo: 3 },
  },
  {
    id: 'trovao',
    name: 'TROVÃO V8',
    tagline: 'Velocista — reta é com ele.',
    body: '#ff8a3d',
    accent: '#ffd23f',
    style: 'muscle',
    maxSpeed: 12800,
    accelFactor: 5.2,
    grip: 0.7,
    fuelCapacity: 112,
    fuelBurn: 0.88,
    nitros: 2,
    stats: { velocidade: 4, aceleracao: 2, grip: 2, tanque: 4, consumo: 2 },
  },
  {
    id: 'vespa',
    name: 'VESPA RS',
    tagline: 'Ágil e leve — vive das curvas.',
    body: '#3dff8b',
    accent: '#22e0ff',
    style: 'light',
    maxSpeed: 11200,
    accelFactor: 3.5,
    grip: 1.0,
    fuelCapacity: 74,
    fuelBurn: 1.18,
    nitros: 3,
    stats: { velocidade: 2, aceleracao: 4, grip: 4, tanque: 2, consumo: 4 },
  },
  {
    id: 'tita',
    name: 'TITÃ TURBO',
    tagline: 'Nitro agressivo — tudo ou nada.',
    body: '#6c4bff',
    accent: '#22e0ff',
    style: 'turbo',
    maxSpeed: 12200,
    accelFactor: 4.0,
    grip: 0.74,
    fuelCapacity: 80,
    fuelBurn: 1.22,
    nitros: 4,
    stats: { velocidade: 3, aceleracao: 3, grip: 2, tanque: 2, consumo: 2 },
  },
];

/** 14 cores para os oponentes (sem repetir o carro do jogador). */
export const AI_COLORS: Array<{ body: string; accent: string }> = [
  { body: '#ff4d4d', accent: '#ffe0e0' },
  { body: '#4d9bff', accent: '#dceaff' },
  { body: '#ffd23f', accent: '#5a4a12' },
  { body: '#b04dff', accent: '#ecd9ff' },
  { body: '#3dff8b', accent: '#0d3a22' },
  { body: '#ff8a3d', accent: '#4a2a10' },
  { body: '#22e0ff', accent: '#063a47' },
  { body: '#ff3d7f', accent: '#4a0f28' },
  { body: '#c8d0e0', accent: '#3a4258' },
  { body: '#8f9bb3', accent: '#2a3044' },
  { body: '#5ce6b8', accent: '#0c3a2c' },
  { body: '#e0e0ff', accent: '#3a3a6a' },
  { body: '#ff7a1a', accent: '#4a2a00' },
  { body: '#7a8cff', accent: '#1a2050' },
];
