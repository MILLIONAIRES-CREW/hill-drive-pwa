export const GAME_TITLE = 'Hill Drive';
export const GAME_VERSION = '1.0.0';

/** Landscape playfield — Phaser FIT scales into the phone shell. */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const COLORS = {
  skyTop: 0x6ec8f5,
  skyMid: 0xa8dff8,
  skyBottom: 0xd4f0fc,
  dirt: 0x8b5a2b,
  dirtDark: 0x6b4423,
  grass: 0x4caf50,
  grassDark: 0x388e3c,
  jeep: 0xe53935,
  jeepDark: 0xb71c1c,
  wheel: 0x212121,
  wheelRim: 0xbdbdbd,
  driver: 0xffcc80,
  hat: 0xc62828,
  coin: 0xffc107,
  gem: 0x29b6f6,
  panel: 0xffffff,
  panelSoft: 0xf5f5f5,
  text: 0x1a1a1a,
  muted: 0x546e7a,
  danger: 0xe53935,
  bridge: 0x6d4c41,
  rope: 0x5d4037,
} as const;

export const PHYSICS = {
  gravityY: 1.6,
  wheelRadius: 28,
  chassisWidth: 110,
  chassisHeight: 36,
  axleStiffness: 0.24,
  axleDamping: 0.12,
  gasTorque: 0.1,
  brakeTorque: 0.08,
  driveForce: 0.014,
  brakeForce: 0.012,
  maxDriveSpeed: 9,
  airSpin: 0.035,
  maxWheelSpeed: 0.55,
  maxChassisSpin: 0.14,
  boostForce: 0.014,
  groundRayLength: 34,
} as const;

/** World meters: 1 meter ≈ PIXELS_PER_METER world pixels. */
export const PIXELS_PER_METER = 12;

export const RUN = {
  flagGoalM: 600,
  startFuel: 1,
  idleDrainPerSec: 0.012,
  throttleDrainPerSec: 0.028,
  flipFailSeconds: 2.2,
  boostGainAirPerSec: 0.22,
  boostDrainPerSec: 0.55,
  gemEveryMeters: 100,
} as const;

export const TERRAIN = {
  startX: -200,
  endX: 8200,
  sampleStep: 28,
  baseY: 520,
  amplitude: 110,
  bridgeGapStart: 2100,
  bridgeGapEnd: 2480,
  bridgeY: 470,
  bridgeSegments: 14,
} as const;
