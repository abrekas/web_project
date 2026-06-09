import { fsStorage } from '../services/fs-storage.js';
import { openModal, closeModal } from '../components/modal.js';

const createNoteBtn = document.getElementById('create-note-btn');

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        if (m === "'") return '&#39;';
        return m;
    });
}

async function loadCategoriesForForm() {
    if (!fsStorage || !fsStorage.isReady) return;

    const categorySelect = document.getElementById('note-category');
    if (!categorySelect) return;

    try {
        const categories = await fsStorage.getCategories();
        const options = ['общее', ...categories];

        categorySelect.innerHTML = options
            .map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`)
            .join('');
    } catch (e) {
        console.error('Ошибка загрузки категорий:', e);
    }
}

function initFormHandlers() {
    const typeSelect = document.getElementById('note-type');
    const contentGroup = document.getElementById('content-group');
    const imageGroup = document.getElementById('image-group');

    if (typeSelect) {
        const handler = () => {
            const isImage = typeSelect.value === 'image';
            contentGroup?.classList.toggle('hidden', isImage);
            imageGroup?.classList.toggle('hidden', !isImage);
        };
        typeSelect.addEventListener('change', handler);
    }

    const saveBtn = document.getElementById('save-note-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveNewNote);
    }

    const cancelBtn = document.getElementById('cancel-create-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
}

async function saveNewNote() {
    const typeSelect = document.getElementById('note-type');
    const content = document.getElementById('note-content')?.value.trim();
    const imageUrl = document.getElementById('note-image-url')?.value.trim();
    const site = document.getElementById('note-site')?.value.trim();
    const category = document.getElementById('note-category')?.value || 'общее';

    const noteType = typeSelect?.value || 'text';

    if (noteType === 'text' && !content) {
        alert('Введите текст заметки');
        return;
    }

    if (noteType === 'image' && !imageUrl) {
        alert('Введите URL изображения');
        return;
    }

    try {
        const newNote = {
            type: noteType,
            content: noteType === 'text' ? content : null,
            imageUrl: noteType === 'image' ? imageUrl : null,
            site: site || '',
            category: category,
            time: new Date().toLocaleString('ru-RU')
        };

        await fsStorage.addNote(newNote);

        const activeCategoryLi = document.querySelector('#categories-ul li.active');
        const selectedCategory = activeCategoryLi?.dataset?.category || 'общее';

        if (window.refreshNotes) {
            await window.refreshNotes(selectedCategory);
        }

        if (window.loadAllCategories) {
            await window.loadAllCategories();
        }

        closeModal();

    } catch (e) {
        console.error('Ошибка сохранения заметки:', e);
        alert('Не удалось сохранить заметку');
    }
}

export async function openCreateNoteModal() {
    if (!fsStorage || !fsStorage.isReady) {
        alert('Сначала разрешите доступ к папке с данными');
        return;
    }

    openModal('modal-create-note-template', 'create-note-modal');

    setTimeout(async () => {
        await loadCategoriesForForm();
        initFormHandlers();
    }, 50);
}

if (createNoteBtn) {
    createNoteBtn.addEventListener('click', openCreateNoteModal);
}