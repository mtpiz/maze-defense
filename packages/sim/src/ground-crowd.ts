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
}

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
      const from = point(body.route[body.routeIndex]!, width);
      const toCell = body.route[body.routeIndex + 1];
      if (bodies.length > 1 && toCell !== undefined && hasCounterflow(body.route, body.route[body.routeIndex]!, toCell)) {
        const to = point(toCell, width), dx = (to.x - from.x) / 1000, dy = (to.y - from.y) / 1000;
        const lateral = (body.x - from.x) * -dy + (body.y - from.y) * dx;
        const nextLateral = (target.x - from.x) * -dy + (target.y - from.y) * dx;
        // Steering yields before entering the oncoming stream; this is not a collision wall.
        if (nextLateral > -body.radius - 4 && nextLateral > lateral - .001
          && (target.x - body.x) * dx + (target.y - body.y) * dy >= 0) return false;
      }
      const changed = new Map<CrowdBody, CrowdPoint>();
      const move = (b: CrowdBody, p: CrowdPoint, depth: number): boolean => {
        p = { x: quantize(p.x), y: quantize(p.y) };
        if (!fitsCorridor(p, b.radius, corridors.get(b)!, width)) return false;
        for (const other of nearby(p)) {
          if (other === b) continue;
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
        if (other === b) continue;
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
      if (!attempt(b, desired, true)) {
        const alternatives = [0, sideSign * .9, -sideSign * .9, sideSign * 2, -sideSign * 2];
        let advanced = false;
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
        if (!advanced && reversing) attempt(b, { x: b.x - dx * distance, y: b.y - dy * distance }, false);
      }
      // Keep ordered route progress even where a path revisits a cell or doubles back.
      if ((b.x - from.x) * dx + (b.y - from.y) * dy >= 1000 - .001) b.routeIndex++;
    }
  }
}
