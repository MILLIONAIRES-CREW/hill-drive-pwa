import Phaser from 'phaser';
import { COLORS, PHYSICS } from '../config/constants';

type MatterBody = MatterJS.BodyType;
type MatterConstraint = MatterJS.ConstraintType;

const TERRAIN = new Set(['ground', 'bridge', 'bridge-post']);

export class Vehicle {
  readonly chassis: Phaser.Physics.Matter.Image;
  readonly wheelFront: Phaser.Physics.Matter.Image;
  readonly wheelRear: Phaser.Physics.Matter.Image;
  readonly driver: Phaser.GameObjects.Container;

  private readonly scene: Phaser.Scene;
  private readonly constraints: MatterConstraint[] = [];
  private gas = 0;
  private brake = 0;
  private boosting = false;
  private flipTimer = 0;
  private groundedTicks = 4;
  private readonly onCollision: (event: { pairs: MatterJS.IPair[] }) => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.ensureTextures();

    this.chassis = scene.matter.add.image(x, y, 'jeep-body', undefined, {
      friction: 0.2,
      frictionAir: 0.02,
      density: 0.002,
      restitution: 0.05,
      label: 'chassis',
    });
    this.chassis.setRectangle(PHYSICS.chassisWidth, PHYSICS.chassisHeight);
    this.chassis.setDepth(5);

    this.wheelRear = this.makeWheel(x - 42, y + 26);
    this.wheelFront = this.makeWheel(x + 42, y + 26);
    this.constraints.push(
      scene.matter.add.constraint(this.chassis.body as MatterBody, this.wheelRear.body as MatterBody, 0, 0.6, {
        pointA: { x: -42, y: 18 },
        damping: 0.15,
      }),
      scene.matter.add.constraint(this.chassis.body as MatterBody, this.wheelFront.body as MatterBody, 0, 0.6, {
        pointA: { x: 42, y: 18 },
        damping: 0.15,
      }),
    );

    this.driver = scene.add.container(x, y - 26);
    this.driver.add([
      scene.add.rectangle(0, 4, 16, 20, COLORS.jeep),
      scene.add.circle(2, -12, 9, COLORS.driver),
      scene.add.rectangle(2, -20, 16, 7, COLORS.hat),
    ]);
    this.driver.setDepth(7);

    this.onCollision = (event) => {
      const rear = this.wheelRear.body as MatterBody;
      const front = this.wheelFront.body as MatterBody;
      for (const pair of event.pairs) {
        const a = pair.bodyA as MatterBody;
        const b = pair.bodyB as MatterBody;
        const wheelHit = a === rear || a === front || b === rear || b === front;
        if (!wheelHit) {
          continue;
        }
        const other = a === rear || a === front ? b : a;
        if (other.isStatic || TERRAIN.has(other.label ?? '')) {
          this.groundedTicks = 6;
        }
      }
    };
    scene.matter.world.on('collisionactive', this.onCollision);
  }

  private makeWheel(x: number, y: number): Phaser.Physics.Matter.Image {
    const wheel = this.scene.matter.add.image(x, y, 'jeep-wheel', undefined, {
      friction: 0.9,
      frictionStatic: 1,
      frictionAir: 0.01,
      density: 0.004,
      restitution: 0.05,
      label: 'wheel',
    });
    wheel.setCircle(PHYSICS.wheelRadius);
    wheel.setDepth(6);
    return wheel;
  }

  private ensureTextures(): void {
    if (!this.scene.textures.exists('jeep-body')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(COLORS.jeep, 1);
      g.fillRoundedRect(0, 10, 118, 30, 8);
      g.fillStyle(COLORS.jeepDark, 1);
      g.fillRoundedRect(18, 0, 52, 18, 6);
      g.fillStyle(0xb3e5fc, 0.9);
      g.fillRect(24, 4, 16, 10);
      g.fillRect(44, 4, 16, 10);
      g.generateTexture('jeep-body', 118, 42);
      g.destroy();
    }
    if (!this.scene.textures.exists('jeep-wheel')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      const r = PHYSICS.wheelRadius;
      g.fillStyle(COLORS.wheel, 1);
      g.fillCircle(r, r, r);
      g.fillStyle(COLORS.wheelRim, 1);
      g.fillCircle(r, r, r * 0.42);
      g.generateTexture('jeep-wheel', r * 2, r * 2);
      g.destroy();
    }
  }

  setControls(gas: number, brake: number, boosting: boolean): void {
    this.gas = Phaser.Math.Clamp(gas, 0, 1);
    this.brake = Phaser.Math.Clamp(brake, 0, 1);
    this.boosting = boosting;
  }

  update(deltaSec: number): void {
    if (this.groundedTicks > 0) {
      this.groundedTicks -= 1;
    }
    const onGround = this.groundedTicks > 0;
    const Body = this.scene.matter.body;
    const chassis = this.chassis.body as MatterBody;
    const rear = this.wheelRear.body as MatterBody;
    const front = this.wheelFront.body as MatterBody;

    const lean = Phaser.Math.Angle.Wrap(chassis.angle);
    const speedX = chassis.velocity.x;

    if (onGround && this.gas > 0 && speedX < PHYSICS.maxDriveSpeed) {
      const next = Math.min(PHYSICS.maxDriveSpeed, speedX + 0.22 * this.gas);
      Body.setVelocity(chassis, { x: next, y: chassis.velocity.y });
      Body.setAngularVelocity(rear, -next / PHYSICS.wheelRadius);
      Body.setAngularVelocity(front, -next / PHYSICS.wheelRadius);
    } else if (onGround && this.brake > 0) {
      const next = Math.max(-3.5, speedX - 0.2 * this.brake);
      Body.setVelocity(chassis, { x: next, y: chassis.velocity.y });
      Body.setAngularVelocity(rear, -next / PHYSICS.wheelRadius);
      Body.setAngularVelocity(front, -next / PHYSICS.wheelRadius);
    } else if (!onGround) {
      const spin = (this.gas - this.brake) * PHYSICS.airSpin;
      Body.setAngularVelocity(chassis, Phaser.Math.Clamp(chassis.angularVelocity + spin, -0.08, 0.08));
    }

    if (onGround) {
      const pull = Math.abs(lean) > 0.55 ? -lean * 0.04 : 0;
      Body.setAngularVelocity(chassis, chassis.angularVelocity * 0.8 + pull);
    }

    if (this.boosting && speedX < PHYSICS.maxDriveSpeed + 2) {
      Body.setVelocity(chassis, {
        x: Math.min(PHYSICS.maxDriveSpeed + 2, chassis.velocity.x + 0.18),
        y: chassis.velocity.y - 0.04,
      });
    }

    this.driver.setPosition(this.chassis.x, this.chassis.y - 28);
    this.driver.setRotation(this.chassis.rotation);

    const wrapped = Math.abs(Phaser.Math.Angle.Wrap(this.chassis.rotation));
    if (wrapped > 2.4) {
      this.flipTimer += deltaSec;
    } else {
      this.flipTimer = Math.max(0, this.flipTimer - deltaSec);
    }
  }

  isGrounded(): boolean {
    return this.groundedTicks > 0;
  }

  getFlipSeconds(): number {
    return this.flipTimer;
  }

  getSpeed(): number {
    const body = this.chassis.body as MatterBody;
    return Math.hypot(body.velocity.x, body.velocity.y);
  }

  getRpmNorm(): number {
    const rear = this.wheelRear.body as MatterBody;
    return Phaser.Math.Clamp(Math.abs(rear.angularVelocity) / PHYSICS.wheelDrive, 0, 1);
  }

  getX(): number {
    return this.chassis.x;
  }

  getY(): number {
    return this.chassis.y;
  }

  destroy(): void {
    const world = this.scene.matter?.world;
    if (world) {
      world.off('collisionactive', this.onCollision);
      for (const constraint of this.constraints) {
        world.removeConstraint(constraint);
      }
    }
    this.constraints.length = 0;
    this.driver.destroy();
    this.wheelFront.destroy();
    this.wheelRear.destroy();
    this.chassis.destroy();
  }
}
