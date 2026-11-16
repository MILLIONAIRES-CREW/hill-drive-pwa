import Phaser from 'phaser';
import { COLORS, PHYSICS, TERRAIN } from '../config/constants';

export type CoinSpot = { x: number; y: number; value: 5 | 25 };

export type TerrainBuild = {
  coinSpots: CoinSpot[];
  worldWidth: number;
  startY: number;
  heightAt: (x: number) => number;
  dispose: () => void;
};

export function heightAt(x: number): number {
  const t = x * 0.0036;
  const hilly =
    TERRAIN.baseY +
    Math.sin(t) * TERRAIN.amplitude +
    Math.sin(t * 2.1 + 0.6) * (TERRAIN.amplitude * 0.38) +
    Math.sin(t * 0.45) * 28;
  if (x >= 700) {
    return hilly;
  }
  const flat = TERRAIN.baseY + 20;
  const blend = Math.max(0, x) / 700;
  return flat * (1 - blend) + hilly * blend;
}

/** Short static slabs follow the hills. Each slab is convex, so wheels grip instead of clipping a giant polygon. */
export function buildTerrain(scene: Phaser.Scene): TerrainBuild {
  const bodies: MatterJS.BodyType[] = [];
  const visuals: Phaser.GameObjects.GameObject[] = [];
  const coinSpots: CoinSpot[] = [];

  const dirt = scene.add.graphics().setDepth(1);
  visuals.push(dirt);
  dirt.fillStyle(COLORS.dirt, 1);
  dirt.beginPath();

  const grass = scene.add.graphics().setDepth(2);
  visuals.push(grass);
  grass.lineStyle(8, COLORS.grass, 1);
  grass.beginPath();

  let started = false;
  const step = TERRAIN.sampleStep;

  const strokeTo = (x: number, y: number): void => {
    if (!started) {
      dirt.moveTo(x, 980);
      dirt.lineTo(x, y);
      grass.moveTo(x, y);
      started = true;
      return;
    }
    dirt.lineTo(x, y);
    grass.lineTo(x, y);
  };

  const addSlab = (x1: number, y1: number, x2: number, y2: number, label: string): void => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2 + 10;
    const slab = scene.matter.add.rectangle(cx, cy, length + 6, 22, {
      isStatic: true,
      angle,
      friction: 0.95,
      frictionStatic: 1,
      restitution: 0,
      label,
    });
    bodies.push(slab);
    strokeTo(x1, y1);
  };

  for (let x = TERRAIN.startX; x < TERRAIN.endX; x += step) {
    const next = Math.min(TERRAIN.endX, x + step);
    const inGap = x >= TERRAIN.bridgeGapStart && x < TERRAIN.bridgeGapEnd;
    if (inGap) {
      continue;
    }
    addSlab(x, heightAt(x), next, heightAt(next), 'ground');
  }

  if (started) {
    dirt.lineTo(TERRAIN.endX, 980);
    dirt.closePath();
    dirt.fillPath();
    grass.strokePath();
  }

  buildBridge(scene, bodies, visuals);
  placeCoins(coinSpots);

  return {
    coinSpots,
    worldWidth: TERRAIN.endX + 400,
    startY: heightAt(120) - PHYSICS.wheelRadius - 36,
    heightAt,
    dispose: () => {
      const world = scene.matter?.world;
      if (world && bodies.length > 0) {
        const live = new Set(world.getAllBodies());
        const still = bodies.filter((body) => live.has(body));
        if (still.length > 0) {
          world.remove(still, true);
        }
      }
      for (const visual of visuals) {
        if (visual.active) {
          visual.destroy();
        }
      }
    },
  };
}

function buildBridge(
  scene: Phaser.Scene,
  bodies: MatterJS.BodyType[],
  visuals: Phaser.GameObjects.GameObject[],
): void {
  const startX = TERRAIN.bridgeGapStart;
  const endX = TERRAIN.bridgeGapEnd;
  const n = TERRAIN.bridgeSegments;
  const span = endX - startX;
  const posts = scene.add.graphics().setDepth(3);
  visuals.push(posts);
  posts.fillStyle(COLORS.dirtDark, 1);
  posts.fillRect(startX - 10, TERRAIN.bridgeY - 50, 16, 80);
  posts.fillRect(endX - 6, TERRAIN.bridgeY - 50, 16, 80);

  const planks = scene.add.graphics().setDepth(2);
  visuals.push(planks);
  planks.fillStyle(COLORS.bridge, 1);

  const rope = scene.add.graphics().setDepth(3);
  visuals.push(rope);
  rope.lineStyle(3, COLORS.rope, 1);
  rope.beginPath();

  for (let i = 0; i < n; i += 1) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const sag0 = Math.sin(Math.PI * t0) * 22;
    const sag1 = Math.sin(Math.PI * t1) * 22;
    const x1 = startX + span * t0;
    const x2 = startX + span * t1;
    const y1 = TERRAIN.bridgeY + sag0;
    const y2 = TERRAIN.bridgeY + sag1;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const slab = scene.matter.add.rectangle((x1 + x2) / 2, (y1 + y2) / 2 + 6, Math.hypot(dx, dy) + 4, 14, {
      isStatic: true,
      angle: Math.atan2(dy, dx),
      friction: 1,
      restitution: 0,
      label: 'bridge',
    });
    bodies.push(slab);
    planks.fillRect(x1, y1, Math.max(8, x2 - x1), 10);
    if (i === 0) {
      rope.moveTo(x1, y1 - 28);
    }
    rope.lineTo(x2, y2 - 28);
  }
  rope.strokePath();
}

function placeCoins(out: CoinSpot[]): void {
  const mid = (TERRAIN.bridgeGapStart + TERRAIN.bridgeGapEnd) / 2;
  out.push(
    { x: mid - 70, y: TERRAIN.bridgeY - 80, value: 25 },
    { x: mid, y: TERRAIN.bridgeY - 110, value: 25 },
    { x: mid + 70, y: TERRAIN.bridgeY - 80, value: 5 },
  );

  for (let x = 480; x < TERRAIN.endX - 240; x += 340) {
    if (x > TERRAIN.bridgeGapStart - 80 && x < TERRAIN.bridgeGapEnd + 80) {
      continue;
    }
    out.push({
      x,
      y: heightAt(x) - 62,
      value: x % 680 < 340 ? 5 : 25,
    });
  }
}
