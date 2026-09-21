import { render } from 'preact';
import { BenchmarkApp } from './ui/benchmark-app.js';
import { GateStressApp } from './ui/gate-stress-app.js';
import { LocalSettingsStore } from './platform/local-settings.js';
import './styles.css';

const root = document.getElementById('app');
if (root === null) throw new Error('Missing #app mount');

if (new URLSearchParams(window.location.search).has('stress')) {
  render(<GateStressApp />, root);
} else {
  const settingsStore = new LocalSettingsStore();
  void settingsStore.load(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    .then((initialSettings) => render(<BenchmarkApp initialSettings={initialSettings} settingsStore={settingsStore} />, root));
}
