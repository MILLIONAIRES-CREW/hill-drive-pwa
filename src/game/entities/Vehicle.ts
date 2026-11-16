import Phaser from 'phaser';
import { COLORS, PHYSICS } from '../config/constants';

type MatterBody = MatterJS.BodyType;
type MatterConstraint = MatterJS.ConstraintType;

const TERRAIN_LABELS = new Set(['ground', 'bridge', 'bridge-post']);

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
  private grounded = true;
  private readonly onCollision: (event: { pairs: MatterJS.IPair[] }) => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.ensureTextures();

    this.chassis = scene.matter.add.image(x, y, 'jeep-body', undefined, {
      friction: 0.08,
      frictionAir: 0.03,
      density: 0.0035,
      chamfer: { radius: 6 },
      label: 'chassis',
    });
    this.chassis.setRectangle(PHYSICS.chassisWidth, PHYSICS.chassisHeight);
    this.chassis.setDepth(5);

    this.wheelRear = scene.matter.add.image(x - 38, y + 28, 'jeep-wheel', undefined, {
      friction: 1,
      frictionAir: 0.006,
      density: 0.0028,
      restitution: 0.05,
      label: 'wheel',
    });
    this.wheelRear.setCircle(PHYSICS.wheelRadius);
    this.wheelRear.setDepth(6);

    this.wheelFront = scene.matter.add.image(x + 38, y + 28, 'jeep-wheel', undefined, {
      friction: 1,
      frictionAir: 0.006,
      density: 0.0028,
      restitution: 0.05,
      label: 'wheel',
    });
    this.wheelFront.setCircle(PHYSICS.wheelRadius);
    this.wheelFront.setDepth(6);

    this.attachWheel(this.wheelRear, -38, 24);
    this.attachWheel(this.wheelFront, 38, 24);

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
        const a = pair.bodyA as MatterBody;
        const b = pair.bodyB as MatterBody;
        if (a !== rear && a !== front && b !== rear && b !== front) {
          continue;
        }
        const other = a === rear || a === front ? b : a;
        if (this.isTerrainBody(other)) {
          this.grounded = true;
        }
      }
    };
    scene.matter.world.on('collisionactive', this.onCollision);
  }

  private isTerrainBody(body: MatterBody): boolean {
    if (body.isStatic) {
      return true;
    }
    const label = body.label ?? '';
    return TERRAIN_LABELS.has(label);
  }

  private attachWheel(wheel: Phaser.Physics.Matter.Image, offsetX: number, offsetY: number): void {
    const chassisBody = this.chassis.body as MatterBody;
    const wheelBody = wheel.body as MatterBody;

    const spring = this.scene.matter.add.constraint(chassisBody, wheelBody, 10, PHYSICS.axleStiffness, {
      damping: PHYSICS.axleDamping,
      pointA: { x: offsetX, y: offsetY },
      pointB: { x: 0, y: 0 },
    });
    const axle = this.scene.matter.add.constraint(chassisBody, wheelBody, 16, 0.95, {
      damping: 0.14,
      pointA: { x: offsetX, y: offsetY - 8 },
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

  private wheelTouchesGround(body: MatterBody): boolean {
    const start = { x: body.position.x, y: body.position.y };
    const end = { x: body.position.x, y: body.position.y + PHYSICS.groundRayLength };
    const targets = this.scene.matter.world
      .getAllBodies()
      .filter((b) => b !== body && b !== (this.chassis.body as MatterBody));
    const hits = this.scene.matter.query.ray(targets, start, end, PHYSICS.wheelRadius * 0.4);
    return hits.some((hit) => this.isTerrainBody(hit.bodyA as MatterBody) || this.isTerrainBody(hit.bodyB as MatterBody));
  }

  private refreshGrounded(): void {
    const rear = this.wheelRear.body as MatterBody;
    const front = this.wheelFront.body as MatterBody;
    this.grounded =
      this.wheelTouchesGround(rear) ||
      this.wheelTouchesGround(front) ||
      (Math.abs(rear.velocity.y) < 0.25 && Math.abs(front.velocity.y) < 0.25 && rear.position.y > 120);
  }

  setControls(gas: number, brake: number, boosting: boolean): void {
    this.gas = Phaser.Math.Clamp(gas, 0, 1);
    this.brake = Phaser.Math.Clamp(brake, 0, 1);
    this.boosting = boosting;
  }

  update(deltaSec: number): void {
    this.refreshGrounded();
    const chassisBody = this.chassis.body as MatterBody;
    const rear = this.wheelRear.body as MatterBody;
    const front = this.wheelFront.body as MatterBody;
    const Body = this.scene.matter.body;
    const onGround = this.grounded;

    if (onGround) {
      const slope = Math.atan2(front.position.y - rear.position.y, front.position.x - rear.position.x);
      const delta = Phaser.Math.Angle.Wrap(slope - chassisBody.angle);
      Body.setAngularVelocity(chassisBody, chassisBody.angularVelocity * 0.82 + delta * 0.1);
    } else if (Math.abs(chassisBody.angularVelocity) > PHYSICS.maxChassisSpin) {
      Body.setAngularVelocity(chassisBody, chassisBody.angularVelocity * 0.92);
    }

    const vx = chassisBody.velocity.x;
    if (vx > PHYSICS.maxDriveSpeed || vx < -4) {
      Body.setVelocity(chassisBody, {
        x: Phaser.Math.Clamp(vx, -4, PHYSICS.maxDriveSpeed),
        y: chassisBody.velocity.y,
      });
    }

    if (this.gas > 0) {
      if (onGround) {
        const wheelSpin = -chassisBody.velocity.x * 0.08 * this.gas;
        Body.setAngularVelocity(rear, wheelSpin);
        Body.setAngularVelocity(front, wheelSpin * 0.9);
        if (chassisBody.velocity.x < PHYSICS.maxDriveSpeed) {
          Body.applyForce(chassisBody, chassisBody.position, {
            x: PHYSICS.driveForce * this.gas,
            y: 0,
          });
        }
      } else {
        Body.setAngularVelocity(
          chassisBody,
          Phaser.Math.Clamp(
            chassisBody.angularVelocity + PHYSICS.airSpin * this.gas,
            -PHYSICS.maxChassisSpin,
            PHYSICS.maxChassisSpin,
          ),
        );
      }
    }

    if (this.brake > 0) {
      if (onGround) {
        Body.applyForce(chassisBody, chassisBody.position, {
          x: -PHYSICS.brakeForce * this.brake,
          y: 0,
        });
        Body.setVelocity(chassisBody, {
          x: chassisBody.velocity.x * (1 - 0.08 * this.brake),
          y: chassisBody.velocity.y,
        });
      } else {
        Body.setAngularVelocity(
          chassisBody,
          Phaser.Math.Clamp(
            chassisBody.angularVelocity - PHYSICS.airSpin * this.brake,
            -PHYSICS.maxChassisSpin,
            PHYSICS.maxChassisSpin,
          ),
        );
      }
    }

    if (this.boosting) {
      Body.applyForce(chassisBody, chassisBody.position, {
        x: Math.cos(chassisBody.angle) * PHYSICS.boostForce,
        y: Math.sin(chassisBody.angle) * PHYSICS.boostForce,
      });
    }

    this.driver.setPosition(this.chassis.x - Math.sin(this.chassis.rotation) * 8, this.chassis.y - 30);
    this.driver.setRotation(this.chassis.rotation);

    const angle = Phaser.Math.Angle.Wrap(this.chassis.rotation);
    const upsideDown = Math.abs(angle) > 2.35;
    if (upsideDown) {
      this.flipTimer += deltaSec;
    } else {
      this.flipTimer = Math.max(0, this.flipTimer - deltaSec * 2);
    }

    const cappedVx = Phaser.Math.Clamp(chassisBody.velocity.x, -4, PHYSICS.maxDriveSpeed);
    if (cappedVx !== chassisBody.velocity.x) {
      Body.setVelocity(chassisBody, { x: cappedVx, y: chassisBody.velocity.y });
    }
  }

  isGrounded(): boolean {
    return this.grounded;
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
    const world = this.scene.matter?.world;
    if (world) {
      world.off('collisionactive', this.onCollision);
      for (const c of this.constraints) {
        world.removeConstraint(c);
      }
    }
    this.constraints.length = 0;
    this.driver.destroy();
    this.wheelFront.destroy();
    this.wheelRear.destroy();
    this.chassis.destroy();
  }
}