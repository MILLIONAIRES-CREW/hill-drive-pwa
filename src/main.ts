import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { createGameConfig } from './game/config/createGameConfig';
import { SceneKeys } from './game/config/sceneKeys';
import { bindDriveControls } from './game/systems/DriveInput';
import { bindPwaInstallListeners, markOfflineReady } from './game/systems/PwaInstall';
import './styles/global.css';

bindPwaInstallListeners();
bindDriveControls();

let game = boot();

if (import.meta.env.DEV) {
  (window as Window & { hillDrive?: Phaser.Game | undefined }).hillDrive = game;
}

document.addEventListener('visibilitychange', () => {
  if (!game || document.hidden === false) {
    return;
  }
  const gameScene = game.scene.getScene(SceneKeys.Game);
  if (!gameScene) {
    return;
  }
  // Pause into the overlay; user taps Resume when they return.
  if (gameScene.scene.isActive() && !gameScene.scene.isPaused()) {
    gameScene.scene.pause();
    gameScene.scene.launch(SceneKeys.Pause);
  }
});

window.addEventListener('resize', () => {
  game?.scale.refresh();
});

window.addEventListener('orientationchange', () => {
  window.setTimeout(() => game?.scale.refresh(), 180);
});

window.addEventListener('pagehide', (event) => {
  // Keep the instance alive for bfcache restores (persisted === true).
  if (event.persisted) {
    return;
  }
  game?.destroy(true);
  game = undefined;
  if (import.meta.env.DEV) {
    (window as Window & { hillDrive?: Phaser.Game | undefined }).hillDrive = undefined;
  }
});

window.addEventListener('pageshow', (event) => {
  if (!event.persisted && game) {
    return;
  }
  if (game) {
    game.scale.refresh();
    return;
  }
  const fallback = document.getElementById('boot-fallback');
  if (fallback) {
    fallback.hidden = false;
    fallback.textContent = 'Hill Drive · warming up the hills…';
  }
  game = boot();
  if (import.meta.env.DEV) {
    (window as Window & { hillDrive?: Phaser.Game | undefined }).hillDrive = game;
  }
});

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
