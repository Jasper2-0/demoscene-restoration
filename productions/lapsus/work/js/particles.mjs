// particles.mjs — the dm2000 particle system (RENDER.md §11).
//
// Unlike the hair format, `tauno.txt` DOES have comment syntax (`;`), so its
// several commented-out `LifeTime` lines are genuinely inert and the live
// value is the last uncommented one.
//
// State is CPU-simulated every frame — nothing is precomputed — and there is
// NO GRAVITY. The frame index is CLAMPED, not looped
// (`frame = min(floor(age*FPS), n-1)`), which with LifeTime 1.6772 and
// FPS 10 means only frames 0..16 of the 40 shipped JPEGs are ever displayed.
// That is not a bug to fix: the commented-out `LifeTime 5.0` would have used
// the rest, and the shipped value does not.
import { msvcRand } from './hair.mjs';

export function parseParticles(text) {
  const p = {
    colorTexture: '', fps: 10, maxParticles: 10, emitInterval: 0.1, lifeTime: 2,
    initialSize: [1, 0], initialPosition: [0, 0, 0, 0, 0, 0],
    initialVelocity: [0, 0, 0, 0, 0, 0], initialZRotation: [0, 0],
    velocityMultiplier: 0, friction: 0, minZRotVelocity: 0, maxZRotVelocity: 0,
    grow: 0, alphaFadeSpeed: 0,
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split(';')[0].trim();          // `;` starts a comment
    if (!line) continue;
    const t = line.split(/\s+/);
    const n = (i) => Number(t[i]);
    switch (t[0]) {
      case 'ColorTexture': p.colorTexture = t[1]; break;
      case 'FPS': p.fps = n(1); break;
      case 'MaxParticles': p.maxParticles = n(1) | 0; break;
      case 'EmitInterval': p.emitInterval = n(1); break;
      case 'LifeTime': p.lifeTime = n(1); break;
      case 'InitialSize': p.initialSize = [n(1), n(2) || 0]; break;
      case 'InitialPosition': p.initialPosition = [n(1), n(2), n(3), n(4) || 0, n(5) || 0, n(6) || 0]; break;
      case 'InitialVelocity': p.initialVelocity = [n(1), n(2), n(3), n(4) || 0, n(5) || 0, n(6) || 0]; break;
      case 'InitialZRotation': p.initialZRotation = [n(1), n(2) || 0]; break;
      case 'VelocityMultiplier': p.velocityMultiplier = n(1); break;
      case 'Friction': p.friction = n(1); break;
      case 'MinZRotVelocity': p.minZRotVelocity = n(1); break;
      case 'MaxZRotVelocity': p.maxZRotVelocity = n(1); break;
      case 'Grow': p.grow = n(1); break;
      case 'AlphaFadeSpeed': p.alphaFadeSpeed = n(1); break;
    }
  }
  return p;
}

/** A fresh, empty system. `sinceEmit` starts full so it emits on step one. */
export const createSystem = (p) => ({ live: [], sinceEmit: p.emitInterval });

/**
 * ONE frame of one system. `origin` is the emitter position AT THIS INSTANT —
 * the engine writes `ps.position = node.pos` from the live hair node every
 * frame (0x407901-0x40790f) and only then calls ParticleSystem::update, so a
 * system emits along the path its node travels. Passing a single fixed origin
 * for a whole history instead collapses that path to a point.
 *
 * `rand` is the shared MSVC stream: srand is never called, so hair
 * construction and every particle emission in the demo draw from one
 * uninterrupted sequence and the order of consumption is part of the result.
 */
export function stepSystem(st, p, origin, dt, rand) {
  const r = () => rand() * (1 / 32767);            // 0..1
  st.sinceEmit += dt;
  if (st.sinceEmit >= p.emitInterval && st.live.length < p.maxParticles) {
    st.sinceEmit = 0;
    const [px, py, pz, nx, ny, nz] = p.initialPosition;
    const [vx, vy, vz, mx, my, mz] = p.initialVelocity;
    st.live.push({
      pos: [origin[0] + px + (r() - 0.5) * 2 * nx,
            origin[1] + py + (r() - 0.5) * 2 * ny,
            origin[2] + pz + (r() - 0.5) * 2 * nz],
      // VelocityMultiplier is 0 in the shipped file, and the emitter's own
      // velocity is nonsense in the engine (prevPosition is only written in
      // the "finished" branch) — so it contributes nothing and is omitted
      // deliberately rather than approximated.
      vel: [vx + (r() - 0.5) * 2 * mx, vy + (r() - 0.5) * 2 * my, vz + (r() - 0.5) * 2 * mz],
      size: p.initialSize[0] + (r() - 0.5) * 2 * p.initialSize[1],
      zRot: p.initialZRotation[0] + (r() - 0.5) * 2 * p.initialZRotation[1],
      zRotVel: p.minZRotVelocity + r() * (p.maxZRotVelocity - p.minZRotVelocity),
      age: 0, alpha: 1,
    });
  }
  for (let i = st.live.length - 1; i >= 0; i--) {
    const q = st.live[i];
    q.age += dt;
    q.zRot += dt * q.zRotVel;
    q.pos[0] += dt * q.vel[0]; q.pos[1] += dt * q.vel[1]; q.pos[2] += dt * q.vel[2];
    const f = 1 - dt * p.friction;
    q.vel[0] *= f; q.vel[1] *= f; q.vel[2] *= f;
    q.size *= 1 + dt * p.grow;
    q.alpha -= dt * p.alphaFadeSpeed;
    if (q.size <= 0.1 || q.alpha < 0 || q.age > p.lifeTime) st.live.splice(i, 1);
  }
  return st;
}

/** Frame index for a particle — CLAMPED to the last frame, never looped. */
export const frameOf = (q, p, frameCount) =>
  Math.min(Math.floor(q.age * p.fps), frameCount - 1);

/**
 * Billboard corners for one particle, per RENDER.md §11:
 *   A = (sin z, cos z, 0) x camZ ; B = A x camZ
 *   U = Â·sizeX/2 ; V = B̂·sizeY/2
 * `camZ` is the camera's forward axis in world space.
 */
export function billboard(q, camZ) {
  const a = [Math.sin(q.zRot), Math.cos(q.zRot), 0];
  const cross = (u, v) => [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
  const norm = (v) => { const l = Math.hypot(...v) || 1; return [v[0]/l, v[1]/l, v[2]/l]; };
  const A = cross(a, camZ), B = cross(A, camZ);
  const U = norm(A).map((x) => x * q.size / 2);
  const V = norm(B).map((x) => x * q.size / 2);
  const P = q.pos;
  return [
    [P[0]-U[0]-V[0], P[1]-U[1]-V[1], P[2]-U[2]-V[2]],
    [P[0]+U[0]-V[0], P[1]+U[1]-V[1], P[2]+U[2]-V[2]],
    [P[0]+U[0]+V[0], P[1]+U[1]+V[1], P[2]+U[2]+V[2]],
    [P[0]-U[0]+V[0], P[1]-U[1]+V[1], P[2]-U[2]+V[2]],
  ];
}
