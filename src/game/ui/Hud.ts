import Phaser from 'phaser';
import { COLORS, RUN } from '../config/constants';

export type HudSnapshot = {
  runCoins: number;
  bankCoins: number;
  gems: number;
  distanceM: number;
  bestM: number;
  fuel: number;
  rpm: number;
  boost: number;
};

export class Hud {
  private readonly root: Phaser.GameObjects.Container;
  private readonly coinText: Phaser.GameObjects.Text;
  private readonly gemText: Phaser.GameObjects.Text;
  private readonly distText: Phaser.GameObjects.Text;
  private readonly flagText: Phaser.GameObjects.Text;
  private readonly crownText: Phaser.GameObjects.Text;
  private readonly fuelBar: Phaser.GameObjects.Rectangle;
  private readonly rpmNeedle: Phaser.GameObjects.Rectangle;
  private readonly boostNeedle: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    this.root = scene.add.container(0, 0).setScrollFactor(0).setDepth(50);

    const coinIcon = scene.add.circle(36, 36, 14, COLORS.coin).setStrokeStyle(2, 0xf57f17);
    this.coinText = scene.add
      .text(56, 36, '0', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color: '#1a1a1a',
      })
      .setOrigin(0, 0.5);

    const gemIcon = scene.add.polygon(36, 78, [0, -12, 10, 0, 0, 12, -10, 0], COLORS.gem);
    this.gemText = scene.add
      .text(56, 78, '0', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#1a1a1a',
      })
      .setOrigin(0, 0.5);

    this.distText = scene.add
      .text(640, 34, '0m', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#1a1a1a',
      })
      .setOrigin(0.5);

    this.flagText = scene.add
      .text(1080, 28, `🚩 ${RUN.flagGoalM}m`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#b71c1c',
      })
      .setOrigin(1, 0.5);

    this.crownText = scene.add
      .text(1080, 52, '👑 0m', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#f9a825',
      })
      .setOrigin(1, 0.5);

    // Fuel can
    scene.add.circle(640, 680, 22, 0x0277bd).setScrollFactor(0).setDepth(50);
    scene.add
      .text(640, 680, '⛽', { fontSize: '18px' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);
    this.fuelBar = scene.add
      .rectangle(640, 652, 48, 8, 0x4fc3f7)
      .setScrollFactor(0)
      .setDepth(51)
      .setOrigin(0.5);

    // RPM gauge
    const rpmDial = scene.add.circle(520, 660, 36, 0xffffff, 0.75).setScrollFactor(0).setDepth(50);
    rpmDial.setStrokeStyle(3, 0x455a64);
    scene.add
      .text(520, 690, 'RPM', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#37474f',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);
    this.rpmNeedle = scene.add
      .rectangle(520, 660, 4, 28, COLORS.danger)
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(52);

    // Boost gauge
    const boostDial = scene.add.circle(760, 660, 36, 0xffffff, 0.75).setScrollFactor(0).setDepth(50);
    boostDial.setStrokeStyle(3, 0x455a64);
    scene.add
      .text(760, 690, 'BOOST', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#37474f',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(51);
    this.boostNeedle = scene.add
      .rectangle(760, 660, 4, 28, 0x00bcd4)
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(52);

    this.root.add([coinIcon, this.coinText, gemIcon, this.gemText, this.distText, this.flagText, this.crownText]);
  }

  update(snap: HudSnapshot): void {
    this.coinText.setText(formatNum(snap.bankCoins + snap.runCoins));
    this.gemText.setText(formatNum(snap.gems));
    this.distText.setText(`${Math.floor(snap.distanceM)}m`);
    this.crownText.setText(`👑 ${Math.floor(snap.bestM)}m`);
    this.fuelBar.setScale(Math.max(0.05, snap.fuel), 1);
    this.fuelBar.setFillStyle(snap.fuel < 0.2 ? COLORS.danger : 0x4fc3f7);
    this.rpmNeedle.setRotation(-1.2 + snap.rpm * 2.4);
    this.boostNeedle.setRotation(-1.2 + snap.boost * 2.4);
  }
}

function formatNum(n: number): string {
  return Math.floor(n).toLocaleString('en-US');
}
