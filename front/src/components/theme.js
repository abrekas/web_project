import { closeModal, openModal } from './modal.js';

const colorBtn = document.getElementById("color-btn");

const TAG_ICON_LIGHT = 'media/tag.png';
const TAG_ICON_DARK = 'media/tag white.png';
const DARK_THEMES = new Set(['sky']);

const themes = {
    mint: {
        '--background-color': '#ffffff',
        '--notes-header-color': '#8cdec7',
        '--second-color': '#E2E2E2',
        '--text-color': '#000000',
        '--notes-text-color': '#000000',
        '--card-color': '#2b2b40',
        '--accent-color': '#8cdec7',
        '--link-color': '#5757d0',
        '--card-bg': '#ffffff',
        '--card-content-bg': '#ffffff',
        '--icon-filter': 'none'
    },
    rose: {
        '--background-color': '#ffffff',
        '--notes-header-color': '#e8dfe2',
        '--second-color': '#e8e5e6',
        '--text-color': '#000000',
        '--notes-text-color': '#000000',
        '--card-color': '#515161',
        '--accent-color': '#cfc9cb',
        '--link-color': '#5757d0',
        '--card-bg': '#ffffff',
        '--card-content-bg': '#ffffff',
        '--icon-filter': 'none'
    },
    sky: {
        '--background-color': '#1B1B1D',
        '--notes-header-color': '#222224',
        '--second-color': '#161616',
        '--text-color': '#ebebeb',
        '--notes-text-color': '#d3d3d3',
        '--card-color': '#3A3A3F',
        '--accent-color': '#272729',
        '--link-color': '#b9b9b9',
        '--card-bg': '#333336',
        '--card-content-bg': '#333336',
        '--icon-filter': 'invert(1) brightness(2)'
    },
    gum: {
        '--background-color': '#EEE8D5',
        '--notes-header-color': '#D3CBB7',
        '--second-color': '#D3CBB7',
        '--text-color': '#171717',
        '--notes-text-color': '#000000',
        '--card-color': '#000000',
        '--accent-color': '#EEE8D5',
        '--link-color': '#89554D',
        '--card-bg': '#FDF6E3',
        '--card-content-bg': '#FDF6E3',
        '--icon-filter': 'none'
    }
};

function initThemeHandlers() {
    const mintBtn = document.getElementById("mint");
    const roseBtn = document.getElementById("rose");
    const skyBtn = document.getElementById("sky");
    const gumBtn = document.getElementById("gum");

    if (mintBtn) {
        mintBtn.addEventListener("click", () => {
            applyTheme("mint");
            closeModal();
        });
    }

    if (roseBtn) {
        roseBtn.addEventListener("click", () => {
            applyTheme("rose");
            closeModal();
        });
    }

    if (skyBtn) {
        skyBtn.addEventListener("click", () => {
            applyTheme("sky");
            closeModal();
        });
    }

    if (gumBtn) {
        gumBtn.addEventListener("click", () => {
            applyTheme("gum");
            closeModal();
        });
    }
}

function updateTagIcon(themeName) {
    const img = document.getElementById('tags-btn-icon');
    if (!img) return;
    img.src = DARK_THEMES.has(themeName) ? TAG_ICON_DARK : TAG_ICON_LIGHT;
}

function applyTheme(themeName) {
    const theme = themes[themeName];

    const root = document.documentElement;

    Object.keys(theme).forEach((variable) => {
        root.style.setProperty(variable, theme[variable]);
    });

    updateTagIcon(themeName);
    localStorage.setItem("selectedTheme", themeName);
}

const savedTheme = localStorage.getItem("selectedTheme");
if (savedTheme) {
    applyTheme(savedTheme);
} else {
    applyTheme("mint"); 
}

colorBtn.addEventListener("click", () => {
    openModal("modal-color-template", "color-modal");
    initThemeHandlers();
});