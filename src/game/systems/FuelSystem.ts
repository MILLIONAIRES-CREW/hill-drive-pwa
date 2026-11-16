import { RUN } from '../config/constants';

export class FuelSystem {
  private fuel = RUN.startFuel as number;

  reset(): void {
    this.fuel = RUN.startFuel;
  }

  update(deltaSec: number, throttling: boolean): void {
    const drain = RUN.idleDrainPerSec + (throttling ? RUN.throttleDrainPerSec : 0);
    this.fuel = Math.max(0, this.fuel - drain * deltaSec);
  }

  getFuel(): number {
    return this.fuel;
  }

  isEmpty(): boolean {
    return this.fuel <= 0.001;
  }

  add(amount: number): void {
    this.fuel = Math.min(1, this.fuel + amount);
  }
}
