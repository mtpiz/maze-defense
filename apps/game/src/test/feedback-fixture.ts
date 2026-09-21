export class AudioFixture {
  static current: AudioFixture;
  static instances: AudioFixture[] = [];
  readonly voices = new Set<object>();
  readonly destination = {};
  readonly currentTime = 0;
  state = 'running';

  constructor() {
    AudioFixture.current = this;
    AudioFixture.instances.push(this);
  }

  createOscillator() {
    const voice = {
      type: 'sine',
      onended: null as (() => void) | null,
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
      disconnect() {},
      start: () => { this.voices.add(voice); },
      stop: (at?: number) => { if (at === undefined) this.voices.delete(voice); },
    };
    return voice;
  }

  createGain() {
    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
  }

  async close(): Promise<void> { this.state = 'closed'; }
}
