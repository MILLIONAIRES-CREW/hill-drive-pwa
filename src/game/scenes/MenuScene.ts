import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_TITLE, GAME_VERSION, GAME_WIDTH } from '../config/constants';
import { SceneKeys } from '../config/sceneKeys';
import { SaveManager } from '../systems/SaveManager';
import { canPromptInstall, installGuideLines, promptInstall } from '../systems/PwaInstall';
import { setTouchControlsVisible } from '../systems/DriveInput';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Menu);
  }

  create(): void {
    document.body.dataset.chrome = 'menu';
    setTouchControlsVisible(false);

    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.skyTop, COLORS.skyTop, COLORS.skyBottom, COLORS.skyBottom, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Hills silhouette
    g.fillStyle(COLORS.dirt, 1);
    g.beginPath();
    g.moveTo(0, 520);
    for (let x = 0; x <= GAME_WIDTH; x += 40) {
      g.lineTo(x, 480 + Math.sin(x * 0.01) * 40 + Math.sin(x * 0.023) * 20);
    }
    g.lineTo(GAME_WIDTH, GAME_HEIGHT);
    g.lineTo(0, GAME_HEIGHT);
    g.closePath();
    g.fillPath();
    g.lineStyle(8, COLORS.grass, 1);
    g.beginPath();
    g.moveTo(0, 520);
    for (let x = 0; x <= GAME_WIDTH; x += 40) {
      g.lineTo(x, 480 + Math.sin(x * 0.01) * 40 + Math.sin(x * 0.023) * 20);
    }
    g.strokePath();

    this.add
      .text(GAME_WIDTH / 2, 120, GAME_TITLE, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '72px',
        fontStyle: '900',
        color: '#ffffff',
        stroke: '#1a1a1a',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 190, 'Physics hills · GAS & BRAKE · phone PWA', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#1a1a1a',
      })
      .setOrigin(0.5);

    const save = SaveManager.load();
    this.add
      .text(
        GAME_WIDTH / 2,
        240,
        `Coins ${save.coins.toLocaleString()} · Gems ${save.gems} · Best ${save.bestDistanceM}m`,
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: '#37474f',
        },
      )
      .setOrigin(0.5);

    this.makeButton(GAME_WIDTH / 2, 360, 'DRIVE', () => {
      this.scene.start(SceneKeys.Game);
    });

    this.makeButton(GAME_WIDTH / 2, 450, 'INSTALL', () => {
      void this.handleInstall();
    }, 220);

    this.add
      .text(GAME_WIDTH / 2, 680, `v${GAME_VERSION} · ← brake · → gas · space boost`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#455a64',
      })
      .setOrigin(0.5);
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void, width = 280): void {
    const bg = this.add
      .rectangle(x, y, width, 64, COLORS.coin)
      .setStrokeStyle(4, 0x1a1a1a)
      .setInteractive({ useHandCursor: true });
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        fontStyle: '900',
        color: '#1a1a1a',
      })
      .setOrigin(0.5);
    bg.on('pointerdown', onClick);
    text.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
  }

  private async handleInstall(): Promise<void> {
    if (canPromptInstall()) {
      await promptInstall();
      return;
    }
    const lines = installGuideLines();
    const tip = this.add
      .text(GAME_WIDTH / 2, 540, lines.join('\n'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#1a1a1a',
        align: 'center',
        backgroundColor: '#ffffffcc',
        padding: { x: 16, y: 12 },
      })
      .setOrigin(0.5);
    this.time.delayedCall(4500, () => tip.destroy());
  }
}
