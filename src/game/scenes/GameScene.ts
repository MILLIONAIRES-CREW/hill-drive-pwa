import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, PIXELS_PER_METER, RUN, TERRAIN } from '../config/constants';
import { SceneKeys } from '../config/sceneKeys';
import { CoinPickup } from '../entities/CoinPickup';
import { Vehicle } from '../entities/Vehicle';
import { BoostSystem } from '../systems/BoostSystem';
import { readDriveState, setTouchControlsVisible } from '../systems/DriveInput';
import { FuelSystem } from '../systems/FuelSystem';
import { SaveManager } from '../systems/SaveManager';
import { buildTerrain } from '../systems/TerrainGenerator';
import { Hud } from '../ui/Hud';
import type { GameOverPayload } from './GameOverScene';

export class GameScene extends Phaser.Scene {
  private vehicle!: Vehicle;
  private coins: CoinPickup[] = [];
  private fuel = new FuelSystem();
  private boost = new BoostSystem();
  private hud!: Hud;
  private startX = 80;
  private runCoins = 0;
  private runGems = 0;
  private gemMilestones = 0;
  private bankCoins = 0;
  private bankGems = 0;
  private bestM = 0;
  private ended = false;
  private worldWidth = 8000;

  constructor() {
    super(SceneKeys.Game);
  }

  create(): void {
    this.events.off('shutdown', this.onShutdown, this);
    this.events.once('shutdown', this.onShutdown, this);

    this.ended = false;
    this.runCoins = 0;
    this.runGems = 0;
    this.gemMilestones = 0;
    this.coins = [];
    this.fuel.reset();
    this.boost.reset();

    const save = SaveManager.load();
    this.bankCoins = save.coins;
    this.bankGems = save.gems;
    this.bestM = save.bestDistanceM;

    document.body.dataset.chrome = 'game';
    setTouchControlsVisible(true);

    this.drawSky();

    const terrain = buildTerrain(this);
    this.worldWidth = terrain.worldWidth;
    this.startX = 80;

    this.matter.world.setBounds(TERRAIN.startX - 200, -400, this.worldWidth + 400, 1400, 64, true, true, false, true);
    this.matter.world.setGravity(0, 1.6);

    this.vehicle = new Vehicle(this, this.startX, terrain.startY);

    for (const spot of terrain.coinSpots) {
      this.coins.push(new CoinPickup(this, spot.x, spot.y, spot.value));
    }

    this.cameras.main.setBounds(TERRAIN.startX - 100, -200, this.worldWidth, 1200);
    this.cameras.main.startFollow(this.vehicle.chassis, true, 0.12, 0.08);
    this.cameras.main.setDeadzone(80, 60);

    this.hud = new Hud(this);
  }

  private drawSky(): void {
    const g = this.add.graphics().setScrollFactor(0).setDepth(-10);
    g.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyBottom, COLORS.skyBottom, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Soft clouds (parallax-ish fixed)
    const clouds = this.add.graphics().setScrollFactor(0.15).setDepth(-5);
    clouds.fillStyle(0xffffff, 0.55);
    for (let i = 0; i < 12; i += 1) {
      const x = i * 700 + 100;
      const y = 80 + (i % 3) * 40;
      clouds.fillEllipse(x, y, 160, 50);
      clouds.fillEllipse(x + 50, y + 10, 120, 40);
    }
  }

  override update(_time: number, delta: number): void {
    if (this.ended) {
      return;
    }

    const deltaSec = Math.min(0.05, delta / 1000);
    const input = readDriveState();

    if (input.pausePressed) {
      this.scene.pause();
      this.scene.launch(SceneKeys.Pause);
      return;
    }

    const airborne = !this.vehicle.isGrounded();
    const boosting = this.boost.update(deltaSec, airborne, input.boost);
    const canDrive = !this.fuel.isEmpty();
    this.vehicle.setControls(canDrive ? input.gas : 0, input.brake, canDrive && boosting);
    this.vehicle.update(deltaSec);

    if (canDrive && (input.gas > 0 || input.brake > 0 || boosting)) {
      this.fuel.update(deltaSec, input.gas > 0 || boosting);
    } else if (canDrive) {
      this.fuel.update(deltaSec, false);
    }

    for (const coin of this.coins) {
      this.runCoins += coin.tryCollect(this.vehicle.getX(), this.vehicle.getY());
    }

    const distanceM = Math.max(0, (this.vehicle.getX() - this.startX) / PIXELS_PER_METER);
    const milestones = Math.floor(distanceM / RUN.gemEveryMeters);
    if (milestones > this.gemMilestones) {
      this.runGems += milestones - this.gemMilestones;
      this.gemMilestones = milestones;
      this.boost.add(0.15);
      this.fuel.add(0.08);
    }

    this.hud.update({
      runCoins: this.runCoins,
      bankCoins: this.bankCoins,
      gems: this.bankGems + this.runGems,
      distanceM,
      bestM: Math.max(this.bestM, distanceM),
      fuel: this.fuel.getFuel(),
      rpm: this.vehicle.getRpmNorm(),
      boost: this.boost.getBoost(),
    });

    if (this.vehicle.getY() > 850) {
      this.endRun('Fell into the void', distanceM);
      return;
    }
    if (this.vehicle.getFlipSeconds() >= RUN.flipFailSeconds) {
      this.endRun('Flipped over', distanceM);
      return;
    }
    if (this.fuel.isEmpty() && this.vehicle.getSpeed() < 0.15) {
      this.endRun('Out of fuel', distanceM);
      return;
    }
  }

  private endRun(reason: string, distanceM: number): void {
    if (this.ended) {
      return;
    }
    this.ended = true;
    const saved = SaveManager.addRunRewards(this.runCoins, this.runGems, distanceM);
    const payload: GameOverPayload = {
      distanceM,
      coins: this.runCoins,
      gems: this.runGems,
      bestM: saved.bestDistanceM,
      reason,
    };
    this.time.delayedCall(350, () => {
      this.scene.start(SceneKeys.GameOver, payload);
    });
  }

  private onShutdown(): void {
    setTouchControlsVisible(false);
    for (const c of this.coins) {
      c.destroy();
    }
    this.coins = [];
    if (this.vehicle) {
      this.vehicle.destroy();
    }
  }
}
