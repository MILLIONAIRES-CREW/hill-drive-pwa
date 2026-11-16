import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { SceneKeys } from '../config/sceneKeys';
import { setTouchControlsVisible } from '../systems/DriveInput';

export type GameOverPayload = {
  distanceM: number;
  coins: number;
  gems: number;
  bestM: number;
  reason: string;
};

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.GameOver);
  }

  create(data: GameOverPayload): void {
    document.body.dataset.chrome = 'over';
    setTouchControlsVisible(false);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x10263a, 0.94);

    this.add
      .text(GAME_WIDTH / 2, 150, 'RUN OVER', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '56px',
        fontStyle: '900',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 210, data.reason, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffecb3',
      })
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        290,
        `${Math.floor(data.distanceM)}m · +${data.coins} coins · +${data.gems} gems\nBest ${Math.floor(data.bestM)}m`,
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#ffffff',
          align: 'center',
        },
      )
      .setOrigin(0.5);

    this.button(GAME_WIDTH / 2, 400, 'RETRY', () => {
      this.scene.start(SceneKeys.Game);
    });
    this.button(GAME_WIDTH / 2, 480, 'MENU', () => {
      this.scene.start(SceneKeys.Menu);
    });
  }

  private button(x: number, y: number, label: string, fn: () => void): void {
    const bg = this.add
      .rectangle(x, y, 260, 56, COLORS.coin)
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
