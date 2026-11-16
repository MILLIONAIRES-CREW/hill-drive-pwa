import Phaser from 'phaser';
import { COLORS } from '../config/constants';
import { SceneKeys } from '../config/sceneKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.skyTop);
    this.scene.start(SceneKeys.Menu);
  }
}
