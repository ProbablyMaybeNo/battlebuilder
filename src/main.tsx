import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './workspace/App';
import './workspace/styles.css';
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
