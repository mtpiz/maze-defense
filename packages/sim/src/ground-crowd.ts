import SAT from 'sat';
import type { CreepDefinition, CreepMovementProfile } from '@tower-defense/content';

export interface CrowdPoint { x: number; y: number }
export interface CrowdBody extends CrowdPoint {
  readonly id: string;
  readonly radius: number;
  readonly weight: number;
  readonly pattern: CreepMovementProfile['pattern'];
  readonly speed: number;
  readonly lane: number;
  readonly route: readonly number[];
  routeIndex: number;
  /** Consecutive ticks without meaningful route progress. */
  stallTicks: number;
  /** Furthest route progress (milli-cells) reached since the last reset. */
  bestProgress: number;
  /** While positive, the body is unsticking: it ignores other bodies until this route progress. */
  unstickUntil: number;
}

/** A Ground body that cannot gain route progress for this long slips past other bodies. */
export const STALL_LIMIT_TICKS = 30;
/** Minimum route gain (milli-cells) that counts as progress; the slowest creep covers it in five ticks. */
export const STALL_PROGRESS_MILLI = 100;
/** Distance an unsticking body travels before it may collide again (it must also be clear of others). */
export const UNSTICK_DISTANCE_MILLI = 1_500;
/** Sentinel for "no progress recorded yet" after spawning or rerouting. */
export const PROGRESS_UNSET = -1_000_000;

export const movementProfile = (definition: CreepDefinition): CreepMovementProfile =>
  definition.movement ?? { radiusMilliCells: 110, pushResistance: 1, pattern: 'runner' };

const point = (cell: number, width: number): CrowdPoint =>
  ({ x: cell % width * 1000, y: Math.floor(cell / width) * 1000 });
const quantize = (value: number): number => Math.round(value * 1000) / 1000;
const circleA = new SAT.Circle(), circleB = new SAT.Circle();
const contact = new SAT.Response();
const reverseEdges = new WeakMap<readonly number[], ReadonlySet<string>>();
function hasCounterflow(route: readonly number[], from: number, to: number): boolean {
  let edges = reverseEdges.get(route);
  if (!edges) {
    edges = new Set(route.slice(1).map((cell, index) => `${cell},${route[index]}`));
    reverseEdges.set(route, edges);
  }
  return edges.has(`${from},${to}`);
}

export function bodiesOverlap(a: CrowdPoint, ar: number, b: CrowdPoint, br: number): boolean {
  circleA.pos.x = a.x; circleA.pos.y = a.y; circleA.r = ar;
  circleB.pos.x = b.x; circleB.pos.y = b.y; circleB.r = br;
  return SAT.testCircleCircle(circleA, circleB, contact.clear()) && contact.overlap > .001;
}

// Cells are centered on integer coordinates. Reject any circle entering a neighboring solid square.
export function fitsCorridor(p: CrowdPoint, radius: number, cells: ReadonlySet<number>, width: number): boolean {
  const cx = Math.floor((p.x + 500) / 1000), cy = Math.floor((p.y + 500) / 1000);
  if (cx < 0 || cx >= width || cy < 0 || !cells.has(cy * width + cx)) return false;
  for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
    if (x >= 0 && x < width && y >= 0 && cells.has(y * width + x)) continue;
    const dx = p.x - Math.max(x * 1000 - 500, Math.min(x * 1000 + 500, p.x));
    const dy = p.y - Math.max(y * 1000 - 500, Math.min(y * 1000 + 500, p.y));
    if (dx * dx + dy * dy < radius * radius - .001) return false;
  }
  return true;
}

/** Distance travelled along the ordered route, in milli-cells. Monotonic even where a route doubles back. */
export function routeProgress(body: CrowdBody, width: number): number {
  const index = Math.min(body.routeIndex, body.route.length - 1);
  const from = point(body.route[index]!, width);
  const toCell = body.route[index + 1];
  if (toCell === undefined) return index * 1000;
  const to = point(toCell, width), dx = (to.x - from.x) / 1000, dy = (to.y - from.y) / 1000;
  const along = (body.x - from.x) * dx + (body.y - from.y) * dy;
  return index * 1000 + Math.max(0, Math.min(1000, along));
}

function localCorridor(body: CrowdBody): ReadonlySet<number> {
  return new Set(body.route.slice(Math.max(0, body.routeIndex - 1), body.routeIndex + 3));
}

export function findEntrancePosition(definition: CreepDefinition, route: readonly number[], width: number,
  occupants: readonly CrowdBody[]): { point: CrowdPoint; lane: number } | null {
  const origin = point(route[0]!, width), next = point(route[1]!, width);
  const dx = (next.x - origin.x) / 1000, dy = (next.y - origin.y) / 1000;
  const profile = movementProfile(definition);
  const lanes = profile.pattern === 'swarm' ? [-360, -120, 120, 360] : [0, -350, 350, -200, 200];
  const corridor = new Set(route.slice(0, 2));
  for (const lane of lanes) {
    const candidate = { x: origin.x - dy * lane, y: origin.y + dx * lane };
    if (fitsCorridor(candidate, profile.radiusMilliCells, corridor, width)
      && occupants.every(other => !bodiesOverlap(candidate, profile.radiusMilliCells, other, other.radius))) {
      return { point: candidate, lane };
    }
  }
  return null;
}

export function moveGroundCrowd(bodies: CrowdBody[], width: number, tick: number): void {
  if (!bodies.length) return;
  // Small steps plus swept contact checks prevent fast units from tunneling through a stationary pack.
  const steps = Math.max(1, Math.ceil(Math.max(...bodies.map(b => b.speed)) / 30 / 40));
  const ordered = [...bodies].sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
  // Oncoming bodies slide past one another: a one-cell corridor cannot fit two heavy bodies abreast, so
  // hard contact there can only deadlock. They still steer to their own side. Unsticking bodies neither
  // block nor are blocked by any body; walls still apply to everyone.
  const direction = (b: CrowdBody): CrowdPoint => {
    const toCell = b.route[b.routeIndex + 1];
    if (toCell === undefined) return { x: 0, y: 0 };
    const from = point(b.route[b.routeIndex]!, width), to = point(toCell, width);
    return { x: (to.x - from.x) / 1000, y: (to.y - from.y) / 1000 };
  };
  const solid = (a: CrowdBody, b: CrowdBody): boolean => {
    if (a.unstickUntil > 0 || b.unstickUntil > 0) return false;
    const da = direction(a), db = direction(b);
    if (da.x * db.x + da.y * db.y >= 0) return true;
    // Only true two-way corridors (the route re-enters these cells in the opposite direction) let oncoming
    // bodies pass; opposite-facing neighbours in separate lanes, such as a tight U-bend, still collide.
    const twoWay = (c: CrowdBody) => {
      const toCell = c.route[c.routeIndex + 1];
      return toCell !== undefined && hasCounterflow(c.route, c.route[c.routeIndex]!, toCell);
    };
    return !(twoWay(a) || twoWay(b));
  };
  for (let step = 0; step < steps; step++) {
    const corridors = new Map(bodies.map(b => [b, localCorridor(b)]));
    // A cell-sized spatial hash bounds contact checks to local bodies, even in longer routes.
    const buckets = new Map<string, Set<CrowdBody>>();
    const key = (p: CrowdPoint) => `${Math.floor(p.x / 1000)},${Math.floor(p.y / 1000)}`;
    const add = (b: CrowdBody) => {
      const k = key(b); if (!buckets.has(k)) buckets.set(k, new Set()); buckets.get(k)!.add(b);
    };
    bodies.forEach(add);
    const nearby = (p: CrowdPoint): CrowdBody[] => {
      const x = Math.floor(p.x / 1000), y = Math.floor(p.y / 1000), found: CrowdBody[] = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        for (const b of buckets.get(`${x + dx},${y + dy}`) ?? []) found.push(b);
      }
      return found;
    };
    const setPosition = (b: CrowdBody, p: CrowdPoint) => {
      buckets.get(key(b))!.delete(b); b.x = p.x; b.y = p.y; add(b);
    };
    const attempt = (body: CrowdBody, target: CrowdPoint, canPush: boolean): boolean => {
      if (!fitsCorridor(target, body.radius, corridors.get(body)!, width)) {
        // Reach the wall smoothly instead of rejecting an entire step and bouncing to the other side.
        let low = 0, high = 1;
        for (let i = 0; i < 12; i++) {
          const fraction = (low + high) / 2;
          const p = { x: body.x + (target.x - body.x) * fraction, y: body.y + (target.y - body.y) * fraction };
          if (fitsCorridor(p, body.radius, corridors.get(body)!, width)) low = fraction;
          else high = fraction;
        }
        target = { x: body.x + (target.x - body.x) * low, y: body.y + (target.y - body.y) * low };
        if (Math.hypot(target.x - body.x, target.y - body.y) < .01) return false;
      }
      const changed = new Map<CrowdBody, CrowdPoint>();
      const move = (b: CrowdBody, p: CrowdPoint, depth: number): boolean => {
        p = { x: quantize(p.x), y: quantize(p.y) };
        if (!fitsCorridor(p, b.radius, corridors.get(b)!, width)) return false;
        for (const other of nearby(p)) {
          if (other === b || !solid(b, other)) continue;
          const current = Math.hypot(other.x - b.x, other.y - b.y);
          if (current < b.radius + other.radius - .001) {
            // Already overlapping (after passing or unsticking): moving apart or sideways is fine, digging
            // deeper is not. A hard block here would lock the pair together.
            if (Math.hypot(other.x - p.x, other.y - p.y) >= current - .001) continue;
            return false;
          }
          const vx = p.x - b.x, vy = p.y - b.y, length2 = vx * vx + vy * vy;
          const t = length2 ? Math.max(0, Math.min(1, ((other.x - b.x) * vx + (other.y - b.y) * vy) / length2)) : 0;
          const swept = { x: b.x + vx * t, y: b.y + vy * t };
          if (!bodiesOverlap(swept, b.radius, other, other.radius)) continue;
          if (!canPush || depth >= 3 || changed.has(other) || b.weight <= other.weight) return false;
          const ox = other.x - p.x, oy = other.y - p.y, distance = Math.hypot(ox, oy);
          if (distance < .001) return false;
          const push = Math.min(40, b.radius + other.radius + .002 - distance);
          if (push <= 0 || !move(other, { x: other.x + ox / distance * push,
            y: other.y + oy / distance * push }, depth + 1)) return false;
          if (bodiesOverlap(swept, b.radius, other, other.radius)) return false;
        }
        if (!changed.has(b)) changed.set(b, { x: b.x, y: b.y });
        setPosition(b, p);
        return true;
      };
      if (move(body, target, 0)) return true;
      for (const [b, original] of changed) setPosition(b, original);
      return false;
    };
    for (const b of ordered) {
      if (b.routeIndex >= b.route.length - 1) continue;
      const from = point(b.route[b.routeIndex]!, width), to = point(b.route[b.routeIndex + 1]!, width);
      const dx = (to.x - from.x) / 1000, dy = (to.y - from.y) / 1000;
      const lateral = (b.x - from.x) * -dy + (b.y - from.y) * dx;
      const number = Number(b.id.split('-').at(-1)) || 0;
      const counterflow = bodies.length > 1 && hasCounterflow(b.route, b.route[b.routeIndex]!, b.route[b.routeIndex + 1]!);
      const preferred = counterflow ? -235 + (b.pattern === 'swarm' ? b.lane * .22 : 0)
        : b.pattern === 'heavy' ? 0 : b.pattern === 'swarm'
        ? b.lane * .75 + Math.sin(tick / 80 + number * 2.4) * 25 : b.lane * .4;
      const steeringLimit = counterflow ? 2 : .45;
      let side = Math.max(-steeringLimit, Math.min(steeringLimit, (preferred - lateral) / (counterflow ? 120 : 300)));
      for (const other of nearby(b)) {
        // Oncoming bodies are still steered around; only the hard block is removed for them.
        if (other === b || b.unstickUntil > 0 || other.unstickUntil > 0) continue;
        const forward = (other.x - b.x) * dx + (other.y - b.y) * dy;
        const across = (other.x - b.x) * -dy + (other.y - b.y) * dx;
        if (forward > 0 && forward < b.radius + other.radius + 160
          && Math.abs(across) < b.radius + other.radius + 30) {
          // Keep a stable passing side; tiny changes across the center line must not reverse steering.
          const sign = counterflow ? -1 : Math.sign(b.lane - other.lane) || (number % 2 ? 1 : -1);
          const approach = Math.min(1, (b.radius + other.radius + 160 - forward) / 160);
          const alignment = 1 - Math.abs(across) / (b.radius + other.radius + 30);
          const influence = Math.min(1, other.weight / b.weight) * approach;
          if (counterflow || b.pattern === 'heavy') {
            side += sign * influence * alignment * (b.pattern === 'heavy' ? .12 : .65);
          } else {
            const passing = (across + sign * (b.radius + other.radius)) / 160 * influence;
            // Keep aiming for the passing gap until clear, rather than pulling back into the blocker.
            side = sign > 0 ? Math.max(side, passing) : Math.min(side, passing);
          }
        }
      }
      const distance = b.speed / 30 / steps;
      const length = Math.hypot(1, side);
      let desired = { x: b.x + (dx - dy * side) / length * distance,
        y: b.y + (dy + dx * side) / length * distance };
      const reversing = b.route[b.routeIndex - 1] === b.route[b.routeIndex + 1];
      if (counterflow && reversing && lateral > -120 && (b.x - from.x) * dx + (b.y - from.y) * dy < 200) {
        // Use the spare half-cell beyond the waypoint to make a U-turn around incoming traffic.
        const tx = from.x - dx * 260 - dy * preferred - b.x;
        const ty = from.y - dy * 260 + dx * preferred - b.y;
        const turnLength = Math.hypot(tx, ty);
        if (turnLength > 0) desired = { x: b.x + tx / turnLength * distance, y: b.y + ty / turnLength * distance };
      }
      const sideSign = Math.sign(side) || (number % 2 ? 1 : -1);
      let advanced = attempt(b, desired, true);
      if (!advanced) {
        const alternatives = [0, sideSign * .9, -sideSign * .9, sideSign * 2, -sideSign * 2];
        for (const s of alternatives) {
          const norm = Math.hypot(1, s);
          if (attempt(b, { x: b.x + (dx - dy * s) / norm * distance,
            y: b.y + (dy + dx * s) / norm * distance }, false)) { advanced = true; break; }
        }
        if (!advanced) {
          for (const s of reversing || counterflow ? [sideSign, -sideSign] : [sideSign]) {
            if (attempt(b, { x: b.x - dy * s * distance, y: b.y + dx * s * distance }, false)) { advanced = true; break; }
          }
        }
        if (!advanced && (reversing || counterflow)) {
          // A small yielding step creates the lateral gap needed to turn out of a packed dead end.
          for (const s of [sideSign, -sideSign]) {
            if (attempt(b, { x: b.x + (-dx - dy * s) * distance * .5,
              y: b.y + (-dy + dx * s) * distance * .5 }, false)) { advanced = true; break; }
          }
        }
        if (!advanced && reversing) advanced = attempt(b, { x: b.x - dx * distance, y: b.y - dy * distance }, false);
      }
      if (!advanced && b.unstickUntil > 0) {
        // Last resort while unsticking: step along the route centre line, which always lies in open cells.
        const along = (b.x - from.x) * dx + (b.y - from.y) * dy;
        const ahead = Math.min(1000, Math.max(0, along) + distance);
        const tx = from.x + dx * ahead - b.x, ty = from.y + dy * ahead - b.y, gap = Math.hypot(tx, ty);
        if (gap > .001) {
          const k = Math.min(1, distance / gap);
          setPosition(b, { x: quantize(b.x + tx * k), y: quantize(b.y + ty * k) });
        }
      }
      // Keep ordered route progress even where a path revisits a cell or doubles back.
      if ((b.x - from.x) * dx + (b.y - from.y) * dy >= 1000 - .001) b.routeIndex++;
    }
  }
  separateOverlaps(bodies, width);
  updateStalls(bodies, width);
}

/** Largest per-tick correction applied to an overlapping pair, in milli-cells. */
export const SEPARATION_MILLI_PER_TICK = 70;

/**
 * Overlap is allowed only as a way through a jam. Every tick, overlapping bodies are eased apart so they
 * never settle on top of one another: the lighter body yields more, and a body that is unsticking is
 * never pushed back (the other body makes way). Walls still bound every correction.
 */
function separateOverlaps(bodies: readonly CrowdBody[], width: number): void {
  const ordered = [...bodies].sort((a, b) => a.id.localeCompare(b.id));
  const corridor = new Map(bodies.map(b => [b, localCorridor(b)]));
  const nudge = (b: CrowdBody, dx: number, dy: number): boolean => {
    for (const k of [1, .5, .25]) {
      const p = { x: quantize(b.x + dx * k), y: quantize(b.y + dy * k) };
      if (fitsCorridor(p, b.radius, corridor.get(b)!, width)) { b.x = p.x; b.y = p.y; return true; }
    }
    return false;
  };
  for (let i = 0; i < ordered.length; i++) for (let j = i + 1; j < ordered.length; j++) {
    const a = ordered[i]!, b = ordered[j]!;
    const reach = a.radius + b.radius;
    if (Math.abs(a.x - b.x) >= reach || Math.abs(a.y - b.y) >= reach) continue;
    let dx = a.x - b.x, dy = a.y - b.y, distance = Math.hypot(dx, dy);
    const depth = reach - distance;
    if (depth <= .5) continue;
    if (distance < 1) {
      // Exactly stacked: split across the route direction, deterministically by id order.
      const from = point(a.route[a.routeIndex]!, width), toCell = a.route[a.routeIndex + 1] ?? a.route[a.routeIndex]!;
      const to = point(toCell, width);
      dx = -(to.y - from.y) / 1000 || 1; dy = (to.x - from.x) / 1000; distance = Math.hypot(dx, dy) || 1;
    }
    const directX = dx / distance, directY = dy / distance;
    let ux = directX, uy = directY;
    const total = Math.min(depth, SEPARATION_MILLI_PER_TICK);
    const aFixed = a.unstickUntil > 0, bFixed = b.unstickUntil > 0;
    if (aFixed !== bFixed) {
      // Make way sideways, across the unsticking body's lane, instead of being shoved along it.
      const mover = aFixed ? a : b;
      const from = point(mover.route[mover.routeIndex]!, width);
      const toCell = mover.route[mover.routeIndex + 1] ?? mover.route[mover.routeIndex]!;
      const to = point(toCell, width), hx = (to.x - from.x) / 1000, hy = (to.y - from.y) / 1000;
      const side = Math.sign(dx * -hy + dy * hx) || 1; // which side of the mover's lane a sits on
      ux = -hy * side; uy = hx * side;
      if (!hx && !hy) { ux = dx / distance; uy = dy / distance; }
    }
    const aShare = aFixed && !bFixed ? 0 : bFixed && !aFixed ? 1 : b.weight / (a.weight + b.weight);
    // If there is no room to step aside (a narrow lane), separate along the line between the bodies.
    if (aShare > 0 && !nudge(a, ux * total * aShare, uy * total * aShare) && aFixed !== bFixed) {
      nudge(a, directX * total * aShare, directY * total * aShare);
    }
    if (aShare < 1 && !nudge(b, -ux * total * (1 - aShare), -uy * total * (1 - aShare)) && aFixed !== bFixed) {
      nudge(b, -directX * total * (1 - aShare), -directY * total * (1 - aShare));
    }
  }
}

/**
 * Liveness guarantee: hard-body contact can deadlock (for example two Carapaces meeting head-on in a
 * one-cell corridor where a route doubles back). A body that makes no route progress for
 * STALL_LIMIT_TICKS temporarily stops colliding with other bodies until it is past the jam and clear.
 */
function updateStalls(bodies: readonly CrowdBody[], width: number): void {
  const heading = (b: CrowdBody): CrowdPoint => {
    const from = point(b.route[b.routeIndex]!, width), to = point(b.route[b.routeIndex + 1]!, width);
    return { x: (to.x - from.x) / 1000, y: (to.y - from.y) / 1000 };
  };
  // A follower waits while the body it is queued behind is still moving or is already clearing the jam.
  const waitingOnLeader = (b: CrowdBody): boolean => {
    const { x: dx, y: dy } = heading(b);
    return bodies.some(other => {
      if (other === b || other.routeIndex >= other.route.length - 1) return false;
      if (Math.hypot(other.x - b.x, other.y - b.y) > b.radius + other.radius + 60) return false;
      const oh = heading(other);
      // Ahead means in front along b's heading, or already on a later route segment (e.g. round a corner).
      const ahead = (other.x - b.x) * dx + (other.y - b.y) * dy > 0 || other.routeIndex > b.routeIndex;
      const oncoming = oh.x * dx + oh.y * dy < 0 && other.routeIndex <= b.routeIndex;
      return ahead && !oncoming && (other.unstickUntil > 0 || other.stallTicks < b.stallTicks - 1);
    });
  };
  for (const b of bodies) {
    if (b.routeIndex >= b.route.length - 1) continue;
    const progress = routeProgress(b, width);
    if (b.unstickUntil > 0) {
      if (progress >= b.unstickUntil
        && bodies.every(other => other === b || !bodiesOverlap(b, b.radius, other, other.radius))) {
        b.unstickUntil = 0; b.stallTicks = 0; b.bestProgress = progress;
      }
      continue;
    }
    if (progress >= b.bestProgress + STALL_PROGRESS_MILLI) {
      b.bestProgress = progress; b.stallTicks = 0;
      continue;
    }
    b.stallTicks++;
    if (b.stallTicks >= STALL_LIMIT_TICKS && (b.stallTicks >= STALL_LIMIT_TICKS * 3 || !waitingOnLeader(b))) {
      b.unstickUntil = Math.max(progress, b.bestProgress) + UNSTICK_DISTANCE_MILLI;
    }
  }
}
