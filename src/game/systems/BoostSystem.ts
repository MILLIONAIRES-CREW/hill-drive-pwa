import { RUN } from '../config/constants';

export class BoostSystem {
  private boost = 0.35;

  reset(): void {
    this.boost = 0.35;
  }

  update(deltaSec: number, airborne: boolean, wantBoost: boolean): boolean {
    if (airborne) {
      this.boost = Math.min(1, this.boost + RUN.boostGainAirPerSec * deltaSec);
    }
    if (wantBoost && this.boost > 0.02) {
      this.boost = Math.max(0, this.boost - RUN.boostDrainPerSec * deltaSec);
      return true;
    }
    return false;
  }

  getBoost(): number {
    return this.boost;
  }

  add(amount: number): void {
    this.boost = Math.min(1, this.boost + amount);
  }
}
