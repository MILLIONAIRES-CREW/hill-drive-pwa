import Phaser from 'phaser';
import { COLORS, PHYSICS } from '../config/constants';

type MatterBody = MatterJS.BodyType;
type MatterConstraint = MatterJS.ConstraintType;

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
  private groundedFrames = 2;
  private readonly onCollision: (event: { pairs: MatterJS.IPair[] }) => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.ensureTextures();

    this.chassis = scene.matter.add.image(x, y, 'jeep-body', undefined, {
      friction: 0.05,
      frictionAir: 0.02,
      density: 0.004,
      chamfer: { radius: 6 },
      label: 'chassis',
    });
    this.chassis.setRectangle(PHYSICS.chassisWidth, PHYSICS.chassisHeight);
    this.chassis.setDepth(5);

    this.wheelRear = scene.matter.add.image(x - 38, y + 28, 'jeep-wheel', undefined, {
      friction: 0.95,
      frictionAir: 0.01,
      density: 0.0025,
      restitution: 0.1,
      label: 'wheel',
    });
    this.wheelRear.setCircle(PHYSICS.wheelRadius);
    this.wheelRear.setDepth(6);

    this.wheelFront = scene.matter.add.image(x + 38, y + 28, 'jeep-wheel', undefined, {
      friction: 0.95,
      frictionAir: 0.01,
      density: 0.0025,
      restitution: 0.1,
      label: 'wheel',
    });
    this.wheelFront.setCircle(PHYSICS.wheelRadius);
    this.wheelFront.setDepth(6);

    this.attachWheel(this.wheelRear, -38, 22);
    this.attachWheel(this.wheelFront, 38, 22);

    this.driver = scene.add.container(x, y - 28);
    const body = scene.add.rectangle(0, 4, 18, 22, COLORS.jeep);
    const head = scene.add.circle(0, -12, 10, COLORS.driver);
    const hat = scene.add.rectangle(0, -20, 18, 8, COLORS.hat);
    this.driver.add([body, head, hat]);
    this.driver.setDepth(7);

    this.onCollision = (event) => {
      const rear = this.wheelRear.body as MatterBody;
      const front = this.wheelFront.body as MatterBody;
      for (const pair of event.pairs) {
        const bodies = [pair.bodyA, pair.bodyB];
        if (bodies.includes(rear) || bodies.includes(front)) {
          const other = (bodies[0] === rear || bodies[0] === front ? bodies[1] : bodies[0]) as
            | MatterBody
            | undefined;
          if (other && (other.isStatic || other.label === 'ground' || other.label === 'bridge')) {
            this.groundedFrames = 3;
            return;
          }
        }
      }
    };
    scene.matter.world.on('collisionactive', this.onCollision);
  }

  private attachWheel(wheel: Phaser.Physics.Matter.Image, offsetX: number, offsetY: number): void {
    const chassisBody = this.chassis.body as MatterBody;
    const wheelBody = wheel.body as MatterBody;

    const spring = this.scene.matter.add.constraint(chassisBody, wheelBody, 8, PHYSICS.axleStiffness, {
      damping: PHYSICS.axleDamping,
      pointA: { x: offsetX, y: offsetY },
      pointB: { x: 0, y: 0 },
    });
    const axle = this.scene.matter.add.constraint(chassisBody, wheelBody, 14, 0.9, {
      damping: 0.1,
      pointA: { x: offsetX, y: offsetY - 6 },
      pointB: { x: 0, y: 0 },
    });
    this.constraints.push(spring, axle);
  }

  private ensureTextures(): void {
    if (!this.scene.textures.exists('jeep-body')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(COLORS.jeep, 1);
      g.fillRoundedRect(0, 8, 110, 28, 6);
      g.fillStyle(COLORS.jeepDark, 1);
      g.fillRoundedRect(8, 0, 54, 18, 4);
      g.fillStyle(0x81d4fa, 0.85);
      g.fillRect(14, 4, 20, 10);
      g.fillRect(38, 4, 16, 10);
      g.generateTexture('jeep-body', 110, 40);
      g.destroy();
    }
    if (!this.scene.textures.exists('jeep-wheel')) {
      const g = this.scene.make.graphics({ x: 0, y: 0 });
      const r = PHYSICS.wheelRadius;
      g.fillStyle(COLORS.wheel, 1);
      g.fillCircle(r, r, r);
      g.fillStyle(COLORS.wheelRim, 1);
      g.fillCircle(r, r, r * 0.45);
      g.lineStyle(3, 0x424242, 1);
      g.strokeCircle(r, r, r - 2);
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
    const chassisBody = this.chassis.body as MatterBody;
    const rear = this.wheelRear.body as MatterBody;
    const front = this.wheelFront.body as MatterBody;
    const Body = this.scene.matter.body;

    const onGround = this.groundedFrames > 0;
    if (this.groundedFrames > 0) {
      this.groundedFrames -= 1;
    }

    if (this.gas > 0) {
      if (onGround) {
        const torque = -PHYSICS.gasTorque * this.gas;
        Body.setAngularVelocity(
          rear,
          Phaser.Math.Clamp(rear.angularVelocity + torque, -PHYSICS.maxWheelSpeed, PHYSICS.maxWheelSpeed),
        );
        Body.setAngularVelocity(
          front,
          Phaser.Math.Clamp(front.angularVelocity + torque * 0.7, -PHYSICS.maxWheelSpeed, PHYSICS.maxWheelSpeed),
        );
      } else {
        Body.setAngularVelocity(chassisBody, chassisBody.angularVelocity + PHYSICS.airSpin * this.gas);
      }
    }

    if (this.brake > 0) {
      if (onGround) {
        const torque = PHYSICS.brakeTorque * this.brake;
        Body.setAngularVelocity(
          rear,
          Phaser.Math.Clamp(rear.angularVelocity + torque, -PHYSICS.maxWheelSpeed, PHYSICS.maxWheelSpeed),
        );
        Body.setAngularVelocity(
          front,
          Phaser.Math.Clamp(front.angularVelocity + torque * 0.7, -PHYSICS.maxWheelSpeed, PHYSICS.maxWheelSpeed),
        );
      } else {
        Body.setAngularVelocity(chassisBody, chassisBody.angularVelocity - PHYSICS.airSpin * this.brake);
      }
    }

    if (this.boosting) {
      const angle = chassisBody.angle;
      Body.applyForce(chassisBody, chassisBody.position, {
        x: Math.cos(angle) * PHYSICS.boostForce,
        y: Math.sin(angle) * PHYSICS.boostForce,
      });
    }

    this.driver.setPosition(this.chassis.x - Math.sin(this.chassis.rotation) * 8, this.chassis.y - 30);
    this.driver.setRotation(this.chassis.rotation);

    const upsideDown = Math.abs(Phaser.Math.Angle.Wrap(this.chassis.rotation)) > 1.9;
    if (upsideDown) {
      this.flipTimer += deltaSec;
    } else {
      this.flipTimer = Math.max(0, this.flipTimer - deltaSec * 2);
    }
  }

  isGrounded(): boolean {
    return this.groundedFrames > 0;
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
    return Phaser.Math.Clamp(Math.abs(rear.angularVelocity) / PHYSICS.maxWheelSpeed, 0, 1);
  }

  getX(): number {
    return this.chassis.x;
  }

  getY(): number {
    return this.chassis.y;
  }

  destroy(): void {
    this.scene.matter.world.off('collisionactive', this.onCollision);
    for (const c of this.constraints) {
      this.scene.matter.world.removeConstraint(c);
    }
    this.constraints.length = 0;
    this.driver.destroy();
    this.wheelFront.destroy();
    this.wheelRear.destroy();
    this.chassis.destroy();
  }
}
