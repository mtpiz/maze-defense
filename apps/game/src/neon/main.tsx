import { render } from 'preact';
import { NeonApp } from './neon-app.js';
import './neon.css';

render(<NeonApp />, document.getElementById('app')!);
