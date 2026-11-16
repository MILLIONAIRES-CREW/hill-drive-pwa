import Phaser from 'phaser';
import { COLORS } from '../config/constants';

export class CoinPickup {
  readonly value: 5 | 25;
  readonly sprite: Phaser.GameObjects.Container;
  collected = false;

  constructor(scene: Phaser.Scene, x: number, y: number, value: 5 | 25) {
    this.value = value;
    const coin = scene.add.circle(0, 0, value === 25 ? 18 : 14, COLORS.coin);
    coin.setStrokeStyle(3, 0xf57f17);
    const label = scene.add
      .text(0, 0, String(value), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: value === 25 ? '14px' : '12px',
        fontStyle: 'bold',
        color: '#3e2723',
      })
      .setOrigin(0.5);
    this.sprite = scene.add.container(x, y, [coin, label]).setDepth(8);
    scene.tweens.add({
      targets: this.sprite,
      y: y - 8,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  tryCollect(px: number, py: number): number {
    if (this.collected) {
      return 0;
    }
    const dx = this.sprite.x - px;
    const dy = this.sprite.y - py;
    if (dx * dx + dy * dy < 55 * 55) {
      this.collected = true;
      this.sprite.destroy();
      return this.value;
    }
    return 0;
  }

  destroy(): void {
    if (!this.collected) {
      this.sprite.destroy();
    }
  }
}
