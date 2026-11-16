import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { createGameConfig } from './game/config/createGameConfig';
import { SceneKeys } from './game/config/sceneKeys';
import { bindDriveControls } from './game/systems/DriveInput';
import { bindPwaInstallListeners, markOfflineReady } from './game/systems/PwaInstall';
import './styles/global.css';

bindPwaInstallListeners();
bindDriveControls();

const game = boot();

if (import.meta.env.DEV) {
  (window as Window & { hillDrive?: Phaser.Game | undefined }).hillDrive = game;
}

document.addEventListener('visibilitychange', () => {
  if (!game) {
    return;
  }
  const gameScene = game.scene.getScene(SceneKeys.Game);
  if (!gameScene) {
    return;
  }
  if (document.hidden) {
    if (gameScene.scene.isActive() && !gameScene.scene.isPaused()) {
      gameScene.scene.pause();
      gameScene.scene.launch(SceneKeys.Pause);
      (gameScene as Phaser.Scene & { __pausedByHide?: boolean }).__pausedByHide = true;
    }
  } else if ((gameScene as Phaser.Scene & { __pausedByHide?: boolean }).__pausedByHide) {
    (gameScene as Phaser.Scene & { __pausedByHide?: boolean }).__pausedByHide = false;
  }
});

window.addEventListener('resize', () => {
  game?.scale.refresh();
});

window.addEventListener('orientationchange', () => {
  window.setTimeout(() => game?.scale.refresh(), 180);
});

window.addEventListener(
  'pagehide',
  () => {
    game?.destroy(true);
  },
  { once: true },
);

if (import.meta.env.PROD) {
  const updateBanner = document.getElementById('pwa-update');
  const updateButton = document.getElementById('pwa-update-btn');

  const updateSW = registerSW({
    onNeedRefresh() {
      if (updateBanner instanceof HTMLElement) {
        updateBanner.hidden = false;
      }
    },
    onOfflineReady() {
      markOfflineReady();
    },
  });

  updateButton?.addEventListener('click', () => {
    void updateSW(true);
  });
}

function boot(): Phaser.Game | undefined {
  const parent = document.getElementById('game-container');
  if (!(parent instanceof HTMLElement)) {
    reportBootFailure('Game container is missing.');
    return undefined;
  }

  try {
    return new Phaser.Game(createGameConfig(parent));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown initialization error.';
    reportBootFailure(message);
    return undefined;
  }
}

function reportBootFailure(message: string): void {
  const fallback = document.getElementById('boot-fallback');
  if (!fallback) {
    return;
  }
  fallback.hidden = false;
  fallback.textContent = message;
}
