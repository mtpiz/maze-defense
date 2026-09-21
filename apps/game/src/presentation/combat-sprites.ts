import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { BenchmarkCreepId } from '@tower-defense/content';
import type { PresentationEvent, RenderSnapshot } from '@tower-defense/sim';

export const COMBAT_ATLAS_URL = new URL('../assets/combat-proxy-v1.png', import.meta.url).href;

// Measured regions, including an 8 px gutter. The generated sheet is not an exact grid.
const FRAMES = {
  foundation: [44, 45, 356, 360],
  rail: [521, 11, 290, 425],
  siege: [936, 54, 346, 355],
  drone: [1394, 29, 317, 369],
  carapace: [23, 445, 399, 392],
  broodling: [556, 509, 219, 270],
  glider: [874, 458, 471, 396],
} as const;
type FrameId = keyof typeof FRAMES;

export const CREEP_DIAMETER_CELLS: Readonly<Record<BenchmarkCreepId, number>> = {
  drone: 0.48, carapace: 0.62, broodling: 0.34, glider: 0.7,
};

interface SpriteLayout {
  readonly x: number;
  readonly y: number;
  readonly tileSize: number;
}

interface TowerSprite {
  readonly sprite: Sprite;
  firedAt: number;
}

export class CombatSprites {
  readonly towers = new Container({ label: 'combat-towers', eventMode: 'none' });
  readonly creeps = new Container({ label: 'combat-creeps', eventMode: 'none' });
  readonly #textures = new Map<FrameId, Texture>();
  readonly #towers = new Map<string, TowerSprite>();
  readonly #creeps = new Map<string, Sprite>();
  #lastTick = 0;

  get ready(): boolean { return this.#textures.size > 0; }

  setAtlas(atlas: Texture): void {
    for (const [name, [x, y, width, height]] of Object.entries(FRAMES)) {
      this.#textures.set(name as FrameId, new Texture({
        source: atlas.source, label: `proxy-v1:${name}`, frame: new Rectangle(x, y, width, height),
      }));
    }
  }

  sync(
    state: RenderSnapshot,
    layout: SpriteLayout,
    preferences: { readonly highContrast: boolean; readonly reducedMotion: boolean },
    events: readonly PresentationEvent[],
  ): void {
    this.towers.visible = this.creeps.visible = this.ready && !preferences.highContrast;
    if (!this.ready) return;
    if (state.tick < this.#lastTick) this.#clearUnits();
    this.#lastTick = state.tick;
    const center = (cell: number) => ({
      x: layout.x + (cell % state.arenaWidth + 0.5) * layout.tileSize,
      y: layout.y + (Math.floor(cell / state.arenaWidth) + 0.5) * layout.tileSize,
    });

    for (const { sprite } of this.#towers.values()) sprite.visible = false;
    for (const tower of state.towers) {
      const family = tower.familyId === 'rail' || tower.familyId === 'siege' ? tower.familyId : 'foundation';
      const texture = this.#textures.get(family)!;
      let unit = this.#towers.get(tower.id);
      if (unit === undefined) {
        unit = { sprite: this.#createSprite(texture, tower.id, this.towers), firedAt: -Infinity };
        this.#towers.set(tower.id, unit);
      }
      if (unit.sprite.texture !== texture) {
        unit.sprite.texture = texture;
        unit.sprite.rotation = 0;
        unit.firedAt = -Infinity;
      }
      unit.sprite.visible = true;
    }
    for (const event of events) {
      if (event.type !== 'tower-fired') continue;
      const { towerId, xMilli, yMilli, fromXMilli, fromYMilli } = event.payload;
      if (typeof towerId !== 'string' || typeof xMilli !== 'number' || typeof yMilli !== 'number'
        || typeof fromXMilli !== 'number' || typeof fromYMilli !== 'number') continue;
      const unit = this.#towers.get(towerId);
      if (unit === undefined || event.tick < unit.firedAt) continue;
      unit.sprite.rotation = Math.atan2(yMilli - fromYMilli, xMilli - fromXMilli) + Math.PI / 2;
      unit.firedAt = event.tick;
    }
    for (const tower of state.towers) {
      const unit = this.#towers.get(tower.id)!;
      const point = center(tower.cell);
      const recoil = preferences.reducedMotion ? 0 : Math.max(0, 1 - (state.tick - unit.firedAt) / 4) * layout.tileSize * 0.06;
      unit.sprite.position.set(point.x - Math.sin(unit.sprite.rotation) * recoil,
        point.y + Math.cos(unit.sprite.rotation) * recoil);
      unit.sprite.scale.set(layout.tileSize * 0.76 / Math.max(unit.sprite.texture.width, unit.sprite.texture.height));
      unit.sprite.alpha = state.tick < tower.operationalAtTick ? 0.45 : 1;
    }
    for (const [id, { sprite }] of this.#towers) {
      if (sprite.visible) continue;
      sprite.destroy();
      this.#towers.delete(id);
    }

    for (const sprite of this.#creeps.values()) sprite.visible = false;
    for (const creep of state.creeps) {
      let sprite = this.#creeps.get(creep.id);
      if (sprite === undefined) {
        sprite = this.#createSprite(this.#textures.get(creep.creepId)!, creep.id, this.creeps);
        this.#creeps.set(creep.id, sprite);
      }
      const from = center(creep.fromCell);
      const to = center(creep.toCell);
      const progress = creep.progressPermille / 1_000;
      sprite.visible = true;
      sprite.texture = this.#textures.get(creep.creepId)!;
      sprite.position.set(from.x + (to.x - from.x) * progress, from.y + (to.y - from.y) * progress);
      if (creep.fromCell !== creep.toCell) sprite.rotation = Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;
      sprite.scale.set(layout.tileSize * CREEP_DIAMETER_CELLS[creep.creepId] / Math.max(sprite.texture.width, sprite.texture.height));
    }
    for (const [id, sprite] of this.#creeps) {
      if (sprite.visible) continue;
      sprite.destroy();
      this.#creeps.delete(id);
    }
  }

  destroy(): void {
    this.#clearUnits();
    this.towers.destroy();
    this.creeps.destroy();
    // Frame wrappers belong to this view; the cached atlas source is shared across retries.
    for (const texture of this.#textures.values()) texture.destroy();
    this.#textures.clear();
  }

  #clearUnits(): void {
    for (const { sprite } of this.#towers.values()) sprite.destroy();
    for (const sprite of this.#creeps.values()) sprite.destroy();
    this.#towers.clear();
    this.#creeps.clear();
  }

  #createSprite(texture: Texture, id: string, layer: Container): Sprite {
    const sprite = new Sprite({ texture, label: id, eventMode: 'none' });
    sprite.anchor.set(0.5);
    layer.addChild(sprite);
    return sprite;
  }
}
