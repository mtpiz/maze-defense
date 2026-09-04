import { render } from 'preact';
import { BenchmarkApp } from './ui/benchmark-app.js';
import './styles.css';

const root = document.getElementById('app');
if (root === null) throw new Error('Missing #app mount');

render(<BenchmarkApp />, root);
