import { isPointInWeaponCoverage, type MissionSession } from '@tower-defense/sim';

export function aimTowersForRoute(session: MissionSession): void {
  const render = session.getRenderSnapshot();
  for (const tower of render.towers) {
    if (tower.familyId === 'foundation') continue;
    const route = tower.weapon.targets.ground ? render.groundRoute : render.airRoute;
    const towerX = tower.cell % render.arenaWidth * 1_000;
    const towerY = Math.floor(tower.cell / render.arenaWidth) * 1_000;
    let bestFacing = tower.facingMilliDegrees;
    let bestScore = -1;
    for (let facing = 0; facing < 360_000; facing += 1_000) {
      const score = route.reduce((total, cell) => {
        const x = cell % render.arenaWidth * 1_000;
        const y = Math.floor(cell / render.arenaWidth) * 1_000;
        return total + Number(isPointInWeaponCoverage(
          tower.weapon, facing, x - towerX, y - towerY,
        ));
      }, 0);
      if (score > bestScore) {
        bestFacing = facing;
        bestScore = score;
      }
    }
    const result = session.dispatch({
      type: 'aim-tower', towerId: tower.id, facingMilliDegrees: bestFacing,
    });
    if (!result.accepted) throw new Error(`Could not aim ${tower.id}: ${result.reason}`);
  }
}
