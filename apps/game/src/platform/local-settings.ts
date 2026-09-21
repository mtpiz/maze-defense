import { Preferences } from '@capacitor/preferences';

export interface LocalSettings {
  readonly highContrast: boolean;
  readonly reducedMotion: boolean;
  readonly showAirRoute: boolean;
  readonly effectsEnabled: boolean;
  readonly hapticsEnabled: boolean;
  readonly frameRate: 30 | 60;
}

const SETTINGS_KEY = 'maze-defense.settings';
const READ_TIMEOUT_MILLISECONDS = 2_000;
type SettingsStorage = Pick<typeof Preferences, 'get' | 'set'>;

export class LocalSettingsStore {
  #pendingWrite: Promise<void> = Promise.resolve();

  constructor(private readonly storage: SettingsStorage = Preferences) {}

  async load(systemReducedMotion: boolean): Promise<LocalSettings> {
    let frameRate: 30 | 60 = 60;
    const settings = {
      highContrast: false,
      reducedMotion: systemReducedMotion,
      showAirRoute: true,
      effectsEnabled: true,
      hapticsEnabled: true,
    };
    let readSucceeded = false;
    try {
      // A native reply can be lost after WebView navigation. One read-only retry is bounded.
      const { value } = await this.#read().catch(() => this.#read());
      readSucceeded = true;
      const stored: unknown = value === null ? null : JSON.parse(value);
      if (
        typeof stored === 'object' && stored !== null &&
        'schemaVersion' in stored && stored.schemaVersion === 1 &&
        'settings' in stored && typeof stored.settings === 'object' && stored.settings !== null
      ) {
        const values = stored.settings as Record<string, unknown>;
        for (const key of Object.keys(settings) as (keyof typeof settings)[]) {
          if (typeof values[key] === 'boolean') settings[key] = values[key];
        }
        if (values.frameRate === 30 || values.frameRate === 60) frameRate = values.frameRate;
      }
    } catch {
      // Unavailable or corrupt preferences must not prevent the Mission from opening.
      if (!readSucceeded) {
        settings.effectsEnabled = false;
        settings.hapticsEnabled = false;
      }
    }
    return Object.freeze({ ...settings, frameRate });
  }

  async #read(): ReturnType<SettingsStorage['get']> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.storage.get({ key: SETTINGS_KEY }),
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('Settings read timed out')), READ_TIMEOUT_MILLISECONDS);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }

  save(settings: LocalSettings): Promise<void> {
    const value = JSON.stringify({ schemaVersion: 1, settings });
    // Native writes are asynchronous; preserve the order of rapid toggle changes.
    this.#pendingWrite = this.#pendingWrite.catch(() => undefined)
      .then(() => this.storage.set({ key: SETTINGS_KEY, value }));
    return this.#pendingWrite;
  }
}
