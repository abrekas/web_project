import './components/modal.js';
import './components/theme.js';
import './components/guide.js';

import './features/categories.js';
import './features/tags.js';
import './features/notes.js';

import { initParser } from './services/parser.js';

document.addEventListener('DOMContentLoaded', async () => {
    await initParser();
});