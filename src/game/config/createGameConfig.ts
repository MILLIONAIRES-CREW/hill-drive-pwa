import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_TITLE, GAME_VERSION, GAME_WIDTH } from './constants';
import { BootScene } from '../scenes/BootScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { GameScene } from '../scenes/GameScene';
import { MenuScene } from '../scenes/MenuScene';
import { PauseScene } from '../scenes/PauseScene';

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    title: GAME_TITLE,
    version: GAME_VERSION,
    backgroundColor: COLORS.skyTop,
    disableContextMenu: true,
    banner: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      parent,
      expandParent: false,
    },
    physics: {
      default: 'matter',
      matter: {
        gravity: { x: 0, y: 1.4 },
        enableSleeping: true,
        positionIterations: 8,
        velocityIterations: 6,
        // debug: true,
      },
    },
    input: {
      activePointers: 3,
    },
    scene: [BootScene, MenuScene, GameScene, PauseScene, GameOverScene],
    callbacks: {
      postBoot: () => {
        document.getElementById('boot-fallback')?.setAttribute('hidden', '');
      },
    },
  };
}
