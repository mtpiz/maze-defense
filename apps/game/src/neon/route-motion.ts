export interface RoutePoint { readonly x: number; readonly y: number }

export interface RouteSegment {
  readonly from: RoutePoint;
  readonly to: RoutePoint;
  readonly startDistance: number;
  readonly length: number;
}

export interface RouteDash { readonly from: RoutePoint; readonly to: RoutePoint }

const pointForCell = (cell: number): RoutePoint => ({
  x: cell % 9 + .5,
  y: Math.floor(cell / 9) + .5,
});

const edgeKey = (a: number, b: number): string => a < b ? `${a}:${b}` : `${b}:${a}`;

export function routeSegments(path: readonly number[], backtrackOffset = .08): readonly RouteSegment[] {
  const directions = new Map<string, Set<number>>();
  for (let index = 0; index < path.length - 1; index += 1) {
    const a = path[index]!, b = path[index + 1]!;
    const key = edgeKey(a, b);
    const values = directions.get(key) ?? new Set<number>();
    values.add(a < b ? 1 : -1);
    directions.set(key, values);
  }

  let distance = 0;
  return path.slice(0, -1).map((cell, index) => {
    const next = path[index + 1]!;
    const rawFrom = pointForCell(cell), rawTo = pointForCell(next);
    const dx = rawTo.x - rawFrom.x, dy = rawTo.y - rawFrom.y;
    const length = Math.hypot(dx, dy);
    const offset = directions.get(edgeKey(cell, next))?.size === 2 ? backtrackOffset : 0;
    const ox = length > 0 ? dy / length * offset : 0;
    const oy = length > 0 ? -dx / length * offset : 0;
    const segment = {
      from: { x: rawFrom.x + ox, y: rawFrom.y + oy },
      to: { x: rawTo.x + ox, y: rawTo.y + oy },
      startDistance: distance,
      length,
    };
    distance += length;
    return segment;
  });
}

const pointAt = (segment: RouteSegment, localDistance: number): RoutePoint => {
  const t = segment.length === 0 ? 0 : localDistance / segment.length;
  return {
    x: segment.from.x + (segment.to.x - segment.from.x) * t,
    y: segment.from.y + (segment.to.y - segment.from.y) * t,
  };
};

export function movingRouteDashes(segments: readonly RouteSegment[], phaseDistance: number,
  dashLength = .22, gapLength = .18): readonly RouteDash[] {
  const total = segments.at(-1);
  if (!total) return [];
  const routeLength = total.startDistance + total.length;
  const period = dashLength + gapLength;
  const phase = ((phaseDistance % period) + period) % period;
  const dashes: RouteDash[] = [];

  for (let dashStart = phase - period; dashStart < routeLength; dashStart += period) {
    const dashEnd = dashStart + dashLength;
    for (const segment of segments) {
      const segmentEnd = segment.startDistance + segment.length;
      const fromDistance = Math.max(dashStart, segment.startDistance);
      const toDistance = Math.min(dashEnd, segmentEnd);
      if (toDistance <= fromDistance) continue;
      dashes.push({
        from: pointAt(segment, fromDistance - segment.startDistance),
        to: pointAt(segment, toDistance - segment.startDistance),
      });
    }
  }
  return dashes;
}

export function routeEndpointAngles(path: readonly number[]): { start: number; end: number } {
  if (path.length < 2) return { start: -Math.PI / 2, end: Math.PI / 2 };
  const start = pointForCell(path[0]!), next = pointForCell(path[1]!);
  const beforeExit = pointForCell(path[path.length - 2]!), exit = pointForCell(path[path.length - 1]!);
  return {
    start: Math.atan2(next.y - start.y, next.x - start.x),
    end: Math.atan2(exit.y - beforeExit.y, exit.x - beforeExit.x),
  };
}
