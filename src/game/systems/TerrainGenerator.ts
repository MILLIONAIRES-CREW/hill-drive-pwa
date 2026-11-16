import Phaser from 'phaser';
import { COLORS, PHYSICS, TERRAIN } from '../config/constants';

export type CoinSpot = { x: number; y: number; value: 5 | 25 };

type MatterGO = Phaser.Physics.Matter.Image | Phaser.Physics.Matter.Sprite;

function asBody(result: MatterGO | MatterJS.BodyType): MatterJS.BodyType {
  if (typeof result === 'object' && result !== null && 'body' in result && result.body) {
    return result.body as MatterJS.BodyType;
  }
  return result as MatterJS.BodyType;
}

export type TerrainBuild = {
  coinSpots: CoinSpot[];
  worldWidth: number;
  startY: number;
  dispose: () => void;
};

function heightAt(x: number): number {
  const t = x * 0.0042;
  return (
    TERRAIN.baseY +
    Math.sin(t) * TERRAIN.amplitude +
    Math.sin(t * 2.3 + 1.1) * (TERRAIN.amplitude * 0.45) +
    Math.sin(t * 0.37) * 40
  );
}

export function buildTerrain(scene: Phaser.Scene): TerrainBuild {
  const points: { x: number; y: number }[] = [];
  const coinSpots: CoinSpot[] = [];
  const bodies: MatterJS.BodyType[] = [];
  const matterGos: MatterGO[] = [];
  const visuals: Phaser.GameObjects.GameObject[] = [];

  const trackMatter = (result: MatterGO | MatterJS.BodyType): void => {
    bodies.push(asBody(result));
    if (typeof result === 'object' && result !== null && 'destroy' in result) {
      matterGos.push(result as MatterGO);
    }
  };

  for (let x = TERRAIN.startX; x <= TERRAIN.endX; x += TERRAIN.sampleStep) {
    const inGap = x >= TERRAIN.bridgeGapStart && x <= TERRAIN.bridgeGapEnd;
    if (inGap) {
      continue;
    }
    let y = heightAt(x);
    if (x < TERRAIN.bridgeGapStart && x > TERRAIN.bridgeGapStart - 80) {
      y = Phaser.Math.Linear(y, TERRAIN.bridgeY, (x - (TERRAIN.bridgeGapStart - 80)) / 80);
    }
    if (x > TERRAIN.bridgeGapEnd && x < TERRAIN.bridgeGapEnd + 80) {
      y = Phaser.Math.Linear(TERRAIN.bridgeY, y, (x - TERRAIN.bridgeGapEnd) / 80);
    }
    points.push({ x, y });
  }

  const left = points.filter((p) => p.x < TERRAIN.bridgeGapStart);
  const right = points.filter((p) => p.x > TERRAIN.bridgeGapEnd);

  addGroundBody(scene, left, trackMatter);
  addGroundBody(scene, right, trackMatter);
  drawGroundVisual(scene, left, visuals);
  drawGroundVisual(scene, right, visuals);
  buildRopeBridge(scene, trackMatter, visuals);
  placeCoins(coinSpots);

  return {
    coinSpots,
    worldWidth: TERRAIN.endX + 400,
    startY: heightAt(80) - (PHYSICS.wheelRadius * 2 + 34),
    dispose: () => {
      const world = scene.matter?.world;
      if (world && bodies.length > 0) {
        const live = bodies.filter((body) => world.getAllBodies().includes(body));
        if (live.length > 0) {
          world.remove(live, true);
        }
      }
      for (const go of matterGos) {
        if (go.active) {
          go.destroy();
        }
      }
      for (const v of visuals) {
        if (v.active) {
          v.destroy();
        }
      }
    },
  };
}

function addGroundBody(
  scene: Phaser.Scene,
  ridge: { x: number; y: number }[],
  track: (result: MatterGO | MatterJS.BodyType) => void,
): void {
  if (ridge.length < 2) {
    return;
  }
  const bottom = 900;
  const verts: { x: number; y: number }[] = [];
  for (const p of ridge) {
    verts.push({ x: p.x, y: p.y });
  }
  const last = ridge[ridge.length - 1]!;
  const first = ridge[0]!;
  verts.push({ x: last.x, y: bottom });
  verts.push({ x: first.x, y: bottom });

  let cx = 0;
  let cy = 0;
  for (const v of verts) {
    cx += v.x;
    cy += v.y;
  }
  cx /= verts.length;
  cy /= verts.length;
  const local = verts.map((v) => ({ x: v.x - cx, y: v.y - cy }));

  track(
    scene.matter.add.fromVertices(
      cx,
      cy,
      local,
      {
        isStatic: true,
        friction: 0.9,
        restitution: 0.02,
        label: 'ground',
      },
      true,
      0.01,
      10,
    ),
  );
}

function drawGroundVisual(
  scene: Phaser.Scene,
  ridge: { x: number; y: number }[],
  visuals: Phaser.GameObjects.GameObject[],
): void {
  if (ridge.length < 2) {
    return;
  }
  const g = scene.add.graphics().setDepth(1);
  visuals.push(g);
  g.fillStyle(COLORS.dirt, 1);
  g.beginPath();
  g.moveTo(ridge[0]!.x, 900);
  g.lineTo(ridge[0]!.x, ridge[0]!.y);
  for (let i = 1; i < ridge.length; i += 1) {
    g.lineTo(ridge[i]!.x, ridge[i]!.y);
  }
  g.lineTo(ridge[ridge.length - 1]!.x, 900);
  g.closePath();
  g.fillPath();

  g.lineStyle(10, COLORS.grass, 1);
  g.beginPath();
  g.moveTo(ridge[0]!.x, ridge[0]!.y);
  for (let i = 1; i < ridge.length; i += 1) {
    g.lineTo(ridge[i]!.x, ridge[i]!.y);
  }
  g.strokePath();

  g.lineStyle(4, COLORS.grassDark, 1);
  g.beginPath();
  g.moveTo(ridge[0]!.x, ridge[0]!.y + 4);
  for (let i = 1; i < ridge.length; i += 1) {
    g.lineTo(ridge[i]!.x, ridge[i]!.y + 4);
  }
  g.strokePath();
}

function buildRopeBridge(
  scene: Phaser.Scene,
  trackMatter: (result: MatterGO | MatterJS.BodyType) => void,
  visuals: Phaser.GameObjects.GameObject[],
): void {
  const startX = TERRAIN.bridgeGapStart + 10;
  const endX = TERRAIN.bridgeGapEnd - 10;
  const y = TERRAIN.bridgeY;
  const n = TERRAIN.bridgeSegments;
  const span = endX - startX;
  const segW = span / n;

  trackMatter(
    scene.matter.add.rectangle(startX - 8, y - 20, 16, 70, {
      isStatic: true,
      friction: 0.9,
      label: 'bridge-post',
    }),
  );
  trackMatter(
    scene.matter.add.rectangle(endX + 8, y - 20, 16, 70, {
      isStatic: true,
      friction: 0.9,
      label: 'bridge-post',
    }),
  );
  visuals.push(scene.add.rectangle(startX - 8, y - 20, 16, 70, COLORS.dirtDark).setDepth(3));
  visuals.push(scene.add.rectangle(endX + 8, y - 20, 16, 70, COLORS.dirtDark).setDepth(3));

  for (let i = 0; i < n; i += 1) {
    const t = (i + 0.5) / n;
    const sag = Math.sin(Math.PI * t) * 18;
    const px = startX + segW * (i + 0.5);
    const py = y + sag;
    trackMatter(
      scene.matter.add.rectangle(px, py, segW * 0.95, 12, {
        isStatic: true,
        friction: 0.95,
        restitution: 0.02,
        label: 'bridge',
      }),
    );
    visuals.push(scene.add.rectangle(px, py, segW * 0.9, 10, COLORS.bridge).setDepth(2));
  }

  const rope = scene.add.graphics().setDepth(3);
  visuals.push(rope);
  rope.lineStyle(3, COLORS.rope, 1);
  rope.beginPath();
  rope.moveTo(startX - 8, y - 48);
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const sag = Math.sin(Math.PI * t) * 18;
    rope.lineTo(startX + span * t, y + sag - 36);
  }
  rope.strokePath();
  rope.strokeLineShape(new Phaser.Geom.Line(startX - 8, y - 48, startX - 8, y + 10));
  rope.strokeLineShape(new Phaser.Geom.Line(endX + 8, y - 48, endX + 8, y + 10));
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const sag = Math.sin(Math.PI * t) * 18;
    const px = startX + span * t;
    rope.strokeLineShape(new Phaser.Geom.Line(px, y + sag - 36, px, y + sag));
  }
}

function placeCoins(out: CoinSpot[]): void {
  const mid = (TERRAIN.bridgeGapStart + TERRAIN.bridgeGapEnd) / 2;
  out.push(
    { x: mid - 80, y: TERRAIN.bridgeY - 70, value: 25 },
    { x: mid, y: TERRAIN.bridgeY - 95, value: 25 },
    { x: mid + 80, y: TERRAIN.bridgeY - 70, value: 5 },
  );

  for (let x = 400; x < TERRAIN.endX - 200; x += 320) {
    if (x > TERRAIN.bridgeGapStart - 100 && x < TERRAIN.bridgeGapEnd + 100) {
      continue;
    }
    const y = heightAt(x) - 55 - ((x / 320) % 3) * 18;
    out.push({ x, y, value: x % 640 < 320 ? 5 : 25 });
  }
}