import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { SceneKeys } from '../config/sceneKeys';
import { setTouchControlsVisible } from '../systems/DriveInput';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Pause);
  }

  create(): void {
    setTouchControlsVisible(false);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x10263a, 0.82);

    this.add
      .text(GAME_WIDTH / 2, 220, 'PAUSED', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '56px',
        fontStyle: '900',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.button(GAME_WIDTH / 2, 340, 'RESUME', () => {
      setTouchControlsVisible(true);
      document.body.dataset.chrome = 'game';
      this.scene.resume(SceneKeys.Game);
      this.scene.stop();
    });

    this.button(GAME_WIDTH / 2, 430, 'MENU', () => {
      this.scene.stop(SceneKeys.Game);
      this.scene.start(SceneKeys.Menu);
    });
  }

  private button(x: number, y: number, label: string, fn: () => void): void {
    const bg = this.add
      .rectangle(x, y, 260, 56, COLORS.panel)
      .setStrokeStyle(3, 0x1a1a1a)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#1a1a1a',
      })
      .setOrigin(0.5);
    bg.on('pointerdown', fn);
    text.setInteractive({ useHandCursor: true }).on('pointerdown', fn);
  }
}
