export interface Vector2 {
  x: number;
  y: number;
}

export enum AppMode {
  Kinematics = 'KINEMATICS',
  Vectors = 'VECTORS',
  Boat = 'BOAT'
}

export interface SimulationState {
  t: number;
  position: Vector2;
  velocity: Vector2;
  initialVelocity: Vector2;
  acceleration: Vector2;
  path: Vector2[];
}

export interface SimulationConfig {
  // General
  scale: number; // Pixels per meter
  
  // Kinematics & General Physics
  v0: Vector2;
  a: Vector2;
  p0: Vector2;
  
  // Boat Specific
  boatHeading: number; // Angle in degrees
  riverWidth: number;
  riverVelocity: number;
  boatSpeed: number;

  // Toggles
  showVelocity: boolean;
  showComponents: boolean;
  showAcceleration: boolean;
  showTrace: boolean;
  showShadowBalls: boolean; // New: Projection balls
}

export enum PresetScenario {
  FreeFall = 'FREE_FALL',
  HorizontalProjectile = 'HORIZONTAL',
  ObliqueProjectile = 'OBLIQUE',
  UniformLinear = 'UNIFORM_LINEAR',
  UniformAccelLinear = 'UNIFORM_ACCEL',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}