import { fsStorage } from '../services/fs-storage.js';
import { openModal, closeModal, modalBody } from '../components/modal.js';
import { loadTagsForPicker, setActiveTagFilter, refreshNotes, appendTagsToNote, getActiveTagFilter, getAvailableTagsForNote } from '../services/parser.js';

let allSystemTags = [];
let selectedFilterTags = [];
let selectedNoteTags = [];
let noteTagsModalNoteId = null;

const MAX_TAG_LEN = 40;

const escapeHtml = (str) => String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

// Функции для управления ошибкой
function showTagError(message) {
    let errorMsg = document.getElementById('tag-error-msg');
    if (!errorMsg) {
        errorMsg = document.createElement('div');
        errorMsg.id = 'tag-error-msg';
        errorMsg.style.cssText = `
            color: #e74c3c;
            font-size: 12px;
            margin-top: 4px;
            display: none;
            animation: fadeIn 0.3s ease;
        `;
        const inputRow = document.querySelector('.tag-input-row');
        if (inputRow) {
            inputRow.parentNode.insertBefore(errorMsg, inputRow.nextSibling);
        }
    }
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';

    const input = document.getElementById('new-note-tag-input');
    if (input) {
        input.style.borderColor = '#e74c3c';
        input.style.border = '2px solid #e74c3c';
        input.classList.add('error');
    }
}

function hideTagError() {
    const errorMsg = document.getElementById('tag-error-msg');
    if (errorMsg) {
        errorMsg.style.display = 'none';
    }
    const input = document.getElementById('new-note-tag-input');
    if (input) {
        input.style.borderColor = '';
        input.style.border = '';
        input.classList.remove('error');
    }
}

async function loadSystemTags() {
    if (!fsStorage || !fsStorage.isReady) {
        allSystemTags = [];
        return;
    }
    try {
        const tags = await fsStorage.getTags();
        allSystemTags = Array.isArray(tags) ? [...tags] : [];
    } catch (e) {
        console.error('Ошибка загрузки тэгов:', e);
        allSystemTags = [];
    }
}

function renderTagButtons(containerId, tags, selectedTags) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!tags.length) {
        container.innerHTML = '<p class="tags-empty-hint">Нет доступных тэгов.</p>';
        return;
    }

    container.innerHTML = tags.map(tag => {
        const isActive = selectedTags.includes(tag) ? 'active' : '';
        return `<button type="button" class="form-tag-btn ${isActive}" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`;
    }).join('');
}

function renderFormTags() {
    const container = document.getElementById('form-tags-list');
    if (!container) return;

    if (!allSystemTags.length) {
        container.innerHTML = '<p class="tags-empty-hint">Тэгов пока нет</p>';
        return;
    }

    container.innerHTML = allSystemTags.map(tag => {
        const isActive = selectedFilterTags.includes(tag) ? 'active' : '';
        return `
      <div class="form-tag-chip ${isActive}">
        <button type="button" class="form-tag-btn" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>
        <button type="button" class="form-tag-delete" data-tag="${escapeHtml(tag)}">×</button>
      </div>
    `;
    }).join('');
}

function renderNoteTagsForm() {
    const container = document.getElementById('note-tags-list');
    if (!container) return;

    if (!allSystemTags.length) {
        container.innerHTML = '<p class="tags-empty-hint">Тэгов пока нет</p>';
        return;
    }

    container.innerHTML = allSystemTags.map(tag => {
        const isActive = selectedNoteTags.includes(tag) ? 'active' : '';
        return `
      <div class="form-tag-chip ${isActive}">
        <button type="button" class="form-tag-btn" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>
        <button type="button" class="form-tag-delete" data-tag="${escapeHtml(tag)}">×</button>
      </div>
    `;
    }).join('');
}

export function updateTagsBtnState() {
    const btn = document.getElementById('tags-btn');
    if (!btn) return;
    const active = getActiveTagFilter().length > 0;
    btn.classList.toggle('filter-active', active);
}

export async function openTagsFilterModal() {
    if (!fsStorage || !fsStorage.isReady) {
        alert('Сначала разрешите доступ к папке');
        return;
    }
    selectedFilterTags = [...getActiveTagFilter() || []];
    await loadSystemTags();

    openModal("modal-choose-tags-template", "create-note-modal");
    renderFormTags();
    updateTagsBtnState();
}

export async function openNoteTagsModal(noteId) {
    if (!fsStorage || !fsStorage.isReady) {
        alert('Сначала разрешите доступ к папке');
        return;
    }
    const available = getAvailableTagsForNote(noteId) || [];
    noteTagsModalNoteId = noteId;
    selectedNoteTags = [];

    await loadSystemTags();

    openModal('modal-note-tags-template', 'create-note-modal');
    renderNoteTagsForm();

    // Инициализируем обработчики для поля ввода после открытия модалки
    setTimeout(() => {
        initTagInputHandlers();
    }, 100);
}

// Функция инициализации обработчиков для поля ввода тэга
function initTagInputHandlers() {
    const tagInput = document.getElementById('new-note-tag-input');
    if (!tagInput) return;

    // Удаляем старые обработчики, чтобы не дублировать
    tagInput.removeEventListener('keydown', handleTagInputKeydown);
    tagInput.removeEventListener('input', handleTagInputInput);
    tagInput.removeEventListener('focus', handleTagInputFocus);

    // Добавляем новые
    tagInput.addEventListener('keydown', handleTagInputKeydown);
    tagInput.addEventListener('input', handleTagInputInput);
    tagInput.addEventListener('focus', handleTagInputFocus);
}

// Обработчик нажатия клавиш
function handleTagInputKeydown(e) {
    const controlKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Escape', 'Enter', 'Home', 'End'];

    if (this.value.length >= MAX_TAG_LEN && !controlKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        showTagError('Максимальная длина тэга - ' + MAX_TAG_LEN + ' символов');
        // Визуальная обратная связь
        this.style.animation = 'shake 0.3s ease';
        setTimeout(() => {
            this.style.animation = '';
        }, 300);
    }
}

// Обработчик ввода текста
function handleTagInputInput() {
    if (this.value.length > MAX_TAG_LEN) {
        this.value = this.value.slice(0, MAX_TAG_LEN);
        showTagError('Максимальная длина тэга - ' + MAX_TAG_LEN + ' символов');
    } else if (this.value.length > 0) {
        hideTagError();
    } else {
        hideTagError();
    }
}

// Обработчик фокуса
function handleTagInputFocus() {
    if (this.value.length < MAX_TAG_LEN) {
        hideTagError();
    }
}

document.getElementById("tags-btn")?.addEventListener("click", openTagsFilterModal);

modalBody.addEventListener('click', async (e) => {
    const deleteTagBtn = e.target.closest('.form-tag-delete');
    if (deleteTagBtn) {
        const isNoteModal = !!document.getElementById('note-tags-list');
        const tag = deleteTagBtn.dataset.tag;

        if (tag && confirm(`Удалить тэг «${tag}»?`)) {
            if (await fsStorage.deleteTag(tag)) {
                allSystemTags = allSystemTags.filter(t => t !== tag);

                if (isNoteModal) {
                    selectedNoteTags = selectedNoteTags.filter(t => t !== tag);
                    renderNoteTagsForm();
                } else {
                    selectedFilterTags = selectedFilterTags.filter(t => t !== tag);
                    setActiveTagFilter(selectedFilterTags);
                    renderFormTags();
                    await loadTagsForPicker();
                    await refreshNotes();
                }
            }
        }
        return;
    }

    const tagBtn = e.target.closest('.form-tag-btn');
    if (tagBtn) {
        const tag = tagBtn.dataset.tag;
        const isNoteModal = !!document.getElementById('note-tags-list');

        if (isNoteModal) {
            if (selectedNoteTags.includes(tag)) {
                selectedNoteTags = selectedNoteTags.filter(t => t !== tag);
                renderNoteTagsForm();
            } else {
                selectedNoteTags.push(tag);
                renderNoteTagsForm();
            }
        } else {
            if (selectedFilterTags.includes(tag)) {
                selectedFilterTags = selectedFilterTags.filter(t => t !== tag);
            } else {
                selectedFilterTags.push(tag);
            }
            renderFormTags();
        }
        return;
    }

    if (e.target.closest('#apply-note-tags-btn')) {
        if (selectedNoteTags.length) {
            await appendTagsToNote(noteTagsModalNoteId, selectedNoteTags);
        }
        closeModal();
        return;
    }

    if (e.target.closest('#close-note-tags-btn') || e.target.closest('#close-tags-modal-btn')) {
        closeModal();
        return;
    }

    if (e.target.closest('#add-note-tag-btn')) {
        const input = document.getElementById('new-note-tag-input');
        const tagText = input?.value.trim().toLowerCase();

        if (!tagText) {
            showTagError('Введите текст тэга');
            input?.focus();
            return;
        }

        if (tagText.length > MAX_TAG_LEN) {
            showTagError('Максимальная длина тэга - ' + MAX_TAG_LEN + ' символов');
            input.value = input.value.slice(0, MAX_TAG_LEN);
            input?.focus();
            return;
        }

        hideTagError();

        if (fsStorage?.isReady) {
            const added = await fsStorage.addTag(tagText);
            const tag = added || tagText;

            if (!allSystemTags.includes(tag)) {
                allSystemTags.push(tag);
                allSystemTags.sort((a, b) => a.localeCompare(b, 'ru'));
            }
            if (!selectedNoteTags.includes(tag)) {
                selectedNoteTags.push(tag);
            }
            input.value = '';
            renderNoteTagsForm();
            await loadTagsForPicker();
            hideTagError();
            input?.focus();
        }
        return;
    }

    if (e.target.closest('#apply-tags-filter-btn')) {
        setActiveTagFilter(selectedFilterTags);
        updateTagsBtnState();
        closeModal();
        return;
    }

    if (e.target.closest('#clear-tags-filter-btn')) {
        selectedFilterTags = [];
        setActiveTagFilter([]);
        renderFormTags();
        updateTagsBtnState();
    }
});
