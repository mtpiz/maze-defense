export function coveragePolygon(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  facingMilliDegrees: number,
  coverageArcMilliDegrees: number,
): number[] {
  const segments = Math.max(4, Math.ceil(coverageArcMilliDegrees / 15_000));
  const start = (facingMilliDegrees - coverageArcMilliDegrees / 2) * Math.PI / 180_000;
  const sweep = coverageArcMilliDegrees * Math.PI / 180_000;
  const points: number[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = start + sweep * index / segments;
    points.push(centerX + Math.cos(angle) * outerRadius, centerY + Math.sin(angle) * outerRadius);
  }
  if (innerRadius <= 0) {
    points.push(centerX, centerY);
  } else {
    for (let index = segments; index >= 0; index -= 1) {
      const angle = start + sweep * index / segments;
      points.push(centerX + Math.cos(angle) * innerRadius, centerY + Math.sin(angle) * innerRadius);
    }
  }
  return points;
}
