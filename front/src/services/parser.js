import {fsStorage} from './fs-storage.js';
import {updateTagsBtnState, openNoteTagsModal} from '../features/tags.js';
import {loadAllCategories} from '../features/categories.js'
import {switchLayout} from './layout.js'
import { initAnnotations, renderComments } from '../features/comments.js';

const cardsList = document.getElementById('cards-list');
const searchInput = document.getElementById('search-input');
const filter = document.querySelector('.view-switch');
const sortMenu = document.querySelector('#sort-menu');
const sortOrder = document.querySelector('#sort-order');

const state = {
  category: 'общее',
  search: '',
  view: localStorage.getItem('currentView') || 'all',
  activeFilterTags: JSON.parse(localStorage.getItem('activeFilterTags') || '[]')
};

export function getActiveTagFilter() {
  return state.activeFilterTags;
}

let allNotes = [];
let allCategories = [];
let allTags = [];

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (m) => {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    if (m === "'") return '&#39;';
    return m;
  });
}

export async function loadCategoriesForSelects() {
  if (!fsStorage || !fsStorage.isReady) {
    allCategories = [];
    return;
  }

  try {
    const categories = await fsStorage.getCategories();
    allCategories = Array.isArray(categories) ? categories : [];
  } catch (e) {
    console.error('Ошибка загрузки категорий:', e);
    allCategories = [];
  }
}

export async function loadTagsForPicker() {
  if (!fsStorage || !fsStorage.isReady) {
    allTags = [];
    return;
  }

  try {
    const tags = await fsStorage.getTags();
    allTags = Array.isArray(tags) ? tags : [];
  } catch (e) {
    console.error('Ошибка загрузки тэгов:', e);
    allTags = [];
  }
}

function normalizeTagList(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map(t => String(t).trim().toLowerCase()).filter(Boolean);
}

function noteMatchesTagFilter(note, filterTags) {
  if (!filterTags.length) return true;
  const noteTags = normalizeTagList(note.tags);
  return filterTags.some(tag => noteTags.includes(tag));
}

function buildCategoryOptions(currentCategory) {
  const normalizedCurrent = String(currentCategory || 'общее').trim();

  const categoryNames = allCategories.map(cat => {
    if (typeof cat === 'string') return cat;
    return cat.name || 'общее';
  });

  const categoriesSet = new Set(['общее', ...categoryNames, normalizedCurrent]);
  const categories = Array.from(categoriesSet);

  return categories.map(category => {
    const selected = category === normalizedCurrent ? 'selected' : '';
    return `<option value="${escapeHtml(category)}" ${selected}>${escapeHtml(category)}</option>`;
  }).join('');
}

function renderTags(tags, noteId) {
  if (!Array.isArray(tags)) tags = [];
  const safeId = escapeHtml(noteId || '');

  const tagButtons = tags.map(tag => `
    <button type="button" class="tag-note" data-note-id="${safeId}" data-tag="${escapeHtml(tag)}" title="Удалить тэг">
      <span class="tag-note-text">#${escapeHtml(tag)}</span>
      <span class="tag-note-remove" aria-hidden="true">×</span>
    </button>
  `).join('');

  return `
    ${tagButtons}
    <button type="button" class="tag-add-btn" data-note-id="${safeId}" title="Добавить тэг">+</button>
  `;
}

export function getAvailableTagsForNote(noteId) {
  const note = allNotes.find(item => String(item.id) === String(noteId));
  if (!note) return [];

  const currentTags = normalizeTagList(note.tags || []);
  return allTags.filter(t => !currentTags.includes(String(t).toLowerCase()));
}

function renderNoteHtml(data) {
  const rawContent = data.content || '';
  const parsedContent = parseCodeBlocks(rawContent);
  const safeSiteRaw = String(data.site || '').replace(/^https?:\/\//, '');
  const domainOnly = safeSiteRaw.split('/')[0];
  const safeTime = escapeHtml(data.time || '');
  const href = safeSiteRaw ? `https://${safeSiteRaw}` : '#';
  const noteId = escapeHtml(data.id || '');
  const currentCategory = data.category || 'общее';
  const tags = data.tags || [];
  const noteType = data.type;
  const safeImageUrl = escapeHtml(data.imageUrl || '');

  let bodyContent = '';

  if (noteType === 'image' && safeImageUrl) {
    bodyContent = `<img class="note-image" id="${noteId}" src="${safeImageUrl}" style="max-height:30vh" alt="картинка записи"/>`;
  } else {
    bodyContent = `<div class="note-text-content">${parsedContent}</div>`;
  }

  function highlightText(text, query) {
    if (!query || query.trim() === '') return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  return `
    <article class="card" data-note-id="${noteId}">
      <header class="card-header">
        <select class="category-select" data-note-id="${noteId}">
          ${buildCategoryOptions(currentCategory)}
        </select>
        <div class="card-tags" data-note-id="${noteId}">
          ${renderTags(tags, data.id)}
        </div>
        <div class="card-actions">
          ${noteType !== 'image' ? `<button type="button" class="edit-note" data-note-id="${noteId}">
            <img class="edit-icon" src="media/pencil.png" alt="изменить запись">
          </button>` : ''}
          <button type="button" class="delete-note">
            <img class="delete-icon" src="media/trash.png" alt="удалить запись">
          </button>
        </div>
        <div class="header-link">
          <img class="link-icon" src="media/link.png">
          <a href="${escapeHtml(href)}" class="source-link" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(domainOnly || 'нет ссылки')}
          </a>
        </div>
      </header>
      <div class="card-content">
        <div class="card-body">
            ${highlightText(bodyContent, searchInput.value)}
        </div>
        <footer class="card-footer"><time>${safeTime}</time></footer>
      </div>
    </article>
  `;
}

function getDomainFromUrl(url) {
  const urlStr = String(url || '').toLowerCase().trim();
  if (!urlStr) return '';

  const withoutProtocol = urlStr.replace(/^https?:\/\//, '');
  return withoutProtocol.split('/')[0];
}

function filterNotes(category = 'общее', searchToken = '', site = null, view = 'all', filterTags = []) {
  const cat = String(category).trim().toLowerCase();
  const search = String(searchToken).trim().toLowerCase();
  const searchInverted = switchLayout(search);
  const selectedSite = site ? String(site).trim().toLowerCase() : null;
  const selectedDomain = selectedSite ? getDomainFromUrl(selectedSite) : null;
  const tagFilter = normalizeTagList(filterTags);

  return allNotes.filter(note => {
    const noteCategory = String(note.category || '').trim().toLowerCase();
    const noteContent = String(note.content || '').toLowerCase();
    const noteSite = String(note.site || '').toLowerCase();
    const noteDomain = getDomainFromUrl(noteSite);

    const byCategory = cat === 'общее' || noteCategory === cat;
    const bySearch = !search ||
        noteContent.includes(search) || noteContent.includes(searchInverted) ||
        noteSite.includes(search) || noteSite.includes(searchInverted) ||
        noteCategory.includes(search) || noteCategory.includes(searchInverted);

    let bySite = true;
    if (selectedDomain) bySite = noteDomain === selectedDomain;

    let byType = true;
    if (view === 'text') byType = note.type !== 'image';
    if (view === 'image') byType = note.type === 'image';

    const byTags = noteMatchesTagFilter(note, tagFilter);

    return byCategory && bySearch && bySite && byType && byTags;
  });
}

// Полностью переработанная функция отображения категории
function updateCategoryDisplay() {
  const titleElement = document.getElementById('category-title');
  if (!titleElement) return;

  const activeLi = document.querySelector('#categories-ul li.active');
  const currentCategory = activeLi ? activeLi.dataset.category : 'общее';

  // Полностью пересоздаем содержимое
  let html = `
    <div class="category-title-content">
      <span class="category-name-text">${currentCategory === 'общее' ? 'Основная категория' : currentCategory}</span>
      <div class="category-title-actions">
  `;

  if (currentCategory !== 'общее') {
    html += `<button id="category-rename-btn" class="rename-category-btn">✎ Переименовать</button>`;
  }

  html += `
        <button id="create-note-btn-top" class="create-note-btn-top">+ Создать заметку</button>
      </div>
    </div>
  `;

  titleElement.innerHTML = html;

  // Добавляем обработчики событий
  const renameBtn = document.getElementById('category-rename-btn');
  if (renameBtn) {
    renameBtn.addEventListener('click', renameCategory);
  }

  const createBtn = document.getElementById('create-note-btn-top');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      import('../features/notes.js').then(module => {
        module.openCreateNoteModal();
      }).catch(err => {
        console.error('Ошибка загрузки notes.js:', err);
      });
    });
  }
}

// Упрощенная функция переименования
async function renameCategory() {
  const activeLi = document.querySelector('#categories-ul li.active');
  const currentCategory = activeLi ? activeLi.dataset.category : 'общее';

  if (currentCategory === 'общее') {
    alert('Нельзя переименовать категорию "общее"');
    return;
  }

  const titleElement = document.getElementById('category-title');
  const currentName = currentCategory;

  // Создаем форму редактирования прямо в элементе
  titleElement.innerHTML = `
    <div class="category-rename-edit-wrapper">
      <div class="category-rename-edit">
        <input type="text" id="category-rename-input" value="${escapeHtml(currentName)}" placeholder="Введите новое название" autofocus>
        <button id="save-rename-btn" class="save-btn">Сохранить</button>
        <button id="cancel-rename-btn" class="cancel-btn">Отмена</button>
      </div>
    </div>
  `;

  const input = document.getElementById('category-rename-input');
  if (input) {
    input.focus();
    input.select();
  }

  // Обработчик сохранения
  document.getElementById('save-rename-btn').onclick = async () => {
    const newName = input.value.trim();

    if (!newName) {
      alert('Название категории не может быть пустым');
      return;
    }

    if (newName.toLowerCase() === currentName.toLowerCase()) {
      // Если имя не изменилось, просто обновляем отображение
      updateCategoryDisplay();
      return;
    }

    if (newName.toLowerCase() === 'общее') {
      alert('Название "общее" зарезервировано');
      return;
    }

    try {
      const categories = await fsStorage.getCategories();
      const nameExists = categories.some(cat =>
          cat.name.toLowerCase() === newName.toLowerCase()
      );

      if (nameExists) {
        alert(`Категория "${newName}" уже существует`);
        return;
      }

      const categoryObj = categories.find(cat =>
          cat.name.toLowerCase() === currentName.toLowerCase()
      );
      const description = categoryObj?.description || '';

      const success = await fsStorage.updateCategory(currentName, newName, description);

      if (success) {
        await loadCategoriesForSelects();
        await loadAllCategories();

        // Обновляем активную категорию в списке
        const allLis = document.querySelectorAll('#categories-ul li');
        allLis.forEach(li => {
          li.classList.remove('active');
          if (li.dataset.category === newName) {
            li.classList.add('active');
          }
        });

        // Обновляем отображение
        updateCategoryDisplay();

        // Перерисовываем заметки
        await refreshNotes();
      } else {
        alert('Не удалось переименовать категорию');
        updateCategoryDisplay();
      }
    } catch (e) {
      console.error('Ошибка переименования категории:', e);
      alert('Не удалось переименовать категорию');
      updateCategoryDisplay();
    }
  };

  // Обработчик отмены
  document.getElementById('cancel-rename-btn').onclick = () => {
    updateCategoryDisplay();
  };
}

// Функция инициализации - просто вызывает отображение
function initCategoryTitle() {
  updateCategoryDisplay();
}



async function changeCategoryDescription() {
  const activeLi = document.querySelector('#categories-ul li.active');
  const currentCategory = activeLi ? activeLi.dataset.category : 'общее';

  if (currentCategory === 'общее') {
    alert('Нельзя изменить описание категории "общее"');
    return;
  }

  const descElement = document.getElementById('category-description');
  const currentText = descElement.querySelector('.category-description-text')?.textContent || '';
  const actualDesc = currentText === 'Нет описания' ? '' : currentText;

  const editHtml = `
    <div class="category-description-edit">
      <input type="text" id="category-description-input" value="${escapeHtml(actualDesc)}" placeholder="Введите описание категории">
      <button id="save-description-btn">Сохранить</button>
      <button id="cancel-description-btn">Отмена</button>
    </div>
  `;

  const changeBtn = descElement.querySelector('#category-description-change-btn');
  const textSpan = descElement.querySelector('.category-description-text');
  const actionsDiv = descElement.querySelector('.category-description-actions');
  const createBtn = descElement.querySelector('#create-note-btn-top');

  if (changeBtn) changeBtn.style.display = 'none';
  if (textSpan) textSpan.style.display = 'none';

  if (createBtn) createBtn.style.display = 'inline-flex';

  const editDiv = document.createElement('div');
  editDiv.className = 'category-description-edit-wrapper';
  editDiv.innerHTML = editHtml;

  if (actionsDiv) {
    descElement.insertBefore(editDiv, actionsDiv);
  } else {
    descElement.insertBefore(editDiv, changeBtn);
  }

  const input = document.getElementById('category-description-input');
  if (input) input.focus();

  document.getElementById('save-description-btn').onclick = async () => {
    const newDescription = input.value.trim();

    try {
      const categoryObj = allCategories.find(cat => {
        const catName = typeof cat === 'string' ? cat : cat.name;
        return catName.toLowerCase() === currentCategory.toLowerCase();
      });

      if (categoryObj) {
        await fsStorage.setCategoryDescription(currentCategory, newDescription);

        if (categoryObj.description !== undefined) {
          categoryObj.description = newDescription;
        }

        updateCategoryDescription();
      }
    } catch (e) {
      console.error('Ошибка сохранения описания:', e);
      alert('Не удалось сохранить описание');
    }

    editDiv.remove();
    if (changeBtn) changeBtn.style.display = 'block';
    if (textSpan) textSpan.style.display = 'block';
  };

  document.getElementById('cancel-description-btn').onclick = () => {
    editDiv.remove();
    if (changeBtn) changeBtn.style.display = 'block';
    if (textSpan) textSpan.style.display = 'block';
  };
}

function initCategoryDescription() {
  const descElement = document.getElementById('category-description');
  if (!descElement) return;

  descElement.innerHTML = `
    <span class="category-description-text"></span>
    <div class="category-description-actions">
      <button id="category-description-change-btn">Изменить</button>
      <button id="create-note-btn-top" class="create-note-btn-top">Создать заметку</button>
    </div>
  `;

  const createBtn = document.getElementById('create-note-btn-top');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      import('../features/notes.js').then(module => {
        module.openCreateNoteModal();
      }).catch(err => {
        console.error('Ошибка загрузки notes.js:', err);
      });
    });
  }

  const changeBtn = document.getElementById('category-description-change-btn');
  if (changeBtn) {
    changeBtn.addEventListener('click', changeCategoryDescription);
  }

  updateCategoryDescription();
}

export function loadAllNotes(category = 'общее', searchToken = '', site = null, view = 'all', filterTags = state.activeFilterTags) {
  const filtered = filterNotes(category, searchToken, site, view, filterTags);

  if (!filtered.length) {
    cardsList.innerHTML = `<p>Заметки не найдены</p>`;
    return;
  }

  updateCategoryDisplay();
  cardsList.innerHTML = filtered.map(renderNoteHtml).join('');
  renderComments();
}

function getState() {
  const activeLi = document.querySelector('#categories-ul li.active');
  const site = activeLi && activeLi.dataset.site ? activeLi.dataset.site : null;
  const currentCategory = activeLi && activeLi.dataset.category ? activeLi.dataset.category : state.category;

  return {
    category: currentCategory,
    search: searchInput?.value || '',
    site: site,
    view: state.view,
    filterTags: state.activeFilterTags
  };
}

async function getSortedNotes() {
  const notes = await fsStorage.getNotes();
  const savedSort = localStorage.getItem('selectedOption');
  const savedOrder = localStorage.getItem('sortOrder') || 'asc';
  if (savedSort) {
    return await fsStorage.sortNotes(savedSort, savedOrder);
  }
  return notes;
}

export function renderNotes() {
  const {category, search, site, view, filterTags} = getState();
  loadAllNotes(category, search, site, view, filterTags);
}

export async function refreshNotes() {
  if (!fsStorage || !fsStorage.isReady) {
    cardsList.innerHTML = `<p>Сначала разрешите доступ к папке с данными</p>`;
    return;
  }

  try {
    await loadCategoriesForSelects();
    await loadTagsForPicker();
    allNotes = await getSortedNotes();
    renderNotes()
  } catch (e) {
    console.error(e);
    cardsList.innerHTML = `<p>Ошибка чтения notes.json</p>`;
  }
}

async function changeNoteTags(noteId, newTags) {
  try {
    const note = allNotes.find(item => String(item.id) === String(noteId));
    if (!note) return;

    note.tags = normalizeTagList(newTags);

    await fsStorage.updateNote(note);
    allNotes = await getSortedNotes();
    renderNotes();
  } catch (e) {
    console.error('Ошибка смены тэгов заметки:', e);
    alert('Не удалось изменить тэги');
  }
}

export async function appendTagsToNote(noteId, tagsToAdd) {
  const note = allNotes.find(item => String(item.id) === String(noteId));
  if (!note) return;

  const merged = [...new Set([...normalizeTagList(note.tags || []), ...normalizeTagList(tagsToAdd)])];
  await changeNoteTags(noteId, merged);
}

const saveIconHtml = '<svg class="save-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function startNoteEdit(card, note) {
  document.querySelector('.card-editing')?.classList.remove('card-editing');
  card.classList.add('card-editing');

  const body = card.querySelector('.card-body');
  const linkWrap = card.querySelector('.header-link');
  const editBtn = card.querySelector('.edit-note');

  const ta = document.createElement('textarea');
  ta.className = 'note-edit-text';
  ta.value = note.content || '';
  body.replaceChildren(ta);

  const site = String(note.site || '').replace(/^https?:\/\//, '');
  linkWrap.innerHTML = `<img class="link-icon" src="media/link.png" alt=""><input class="note-edit-link" value="${escapeHtml(site)}" placeholder="site.com">`;

  editBtn.className = 'save-note';
  editBtn.innerHTML = saveIconHtml;
  ta.focus();
}

async function saveNoteEdit(card) {
  const noteId = card.dataset.noteId;
  const note = allNotes.find(item => String(item.id) === String(noteId));
  if (!note) return;

  const content = card.querySelector('.note-edit-text')?.value.trim() ?? '';
  const siteRaw = card.querySelector('.note-edit-link')?.value.trim() ?? '';
  if (!content) {
    alert('Текст заметки не может быть пустым');
    return;
  }

  note.content = content;
  note.site = siteRaw.replace(/^https?:\/\//, '');

  try {
    await fsStorage.updateNote(note);
    allNotes = await getSortedNotes();
    const fresh = allNotes.find(item => String(item.id) === String(noteId)) || note;
    const wrap = document.createElement('div');
    wrap.innerHTML = renderNoteHtml(fresh);
    card.replaceWith(wrap.firstElementChild);
  } catch (e) {
    console.error(e);
    alert('Не удалось сохранить заметку');
  }
}

async function changeNoteCategory(noteId, newCategory) {
  try {
    const note = allNotes.find(item => String(item.id) === String(noteId));
    if (!note) return;

    note.category = newCategory;

    await fsStorage.updateNote(note);
    allNotes = await getSortedNotes();

    loadAllCategories();
    renderNotes();
  } catch (e) {
    console.error('Ошибка смены категории заметки:', e);
    alert('Не удалось изменить категорию');
  }
}

const IMAGE_MODAL_PADDING = 16;
const IMAGE_MODAL_MIN_LONGEST = 700;
const IMAGE_MODAL_MAX_UPSCALE = 4;

function fitImageInModal(img) {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) return;

  const maxW = window.innerWidth - IMAGE_MODAL_PADDING * 2;
  const maxH = window.innerHeight - IMAGE_MODAL_PADDING * 2;
  const longest = Math.max(nw, nh);

  let scale = Math.min(maxW / nw, maxH / nh, 1);

  if (longest * scale < IMAGE_MODAL_MIN_LONGEST) {
    scale = Math.min(IMAGE_MODAL_MIN_LONGEST / longest, IMAGE_MODAL_MAX_UPSCALE);
  }

  scale = Math.min(scale, maxW / nw, maxH / nh);

  img.style.width = `${Math.round(nw * scale)}px`;
  img.style.height = `${Math.round(nh * scale)}px`;
}

function openImageModal(src) {
  const modal = document.getElementById('universal-modal');
  const modalBody = document.getElementById('modal-body');
  const modalContent = modal.querySelector('.modal-content');

  modalContent.className = 'modal-content image-viewer';
  modalBody.innerHTML = '';

  const img = document.createElement('img');
  img.src = src;
  img.alt = 'изображение заметки';
  img.className = 'full-modal-image';

  const onReady = () => fitImageInModal(img);
  img.addEventListener('load', onReady);
  if (img.complete) onReady();

  modalBody.appendChild(img);
  modal.style.display = 'flex';
}

function updateSortOrderLabels() {
  if (!sortOrder) return;

  const ascOpt = sortOrder.querySelector('option[value="asc"]');
  const descOpt = sortOrder.querySelector('option[value="desc"]');
  if (!ascOpt || !descOpt) return;

  if (sortMenu.value === 'bySite') {
    ascOpt.textContent = 'A → Z';
    descOpt.textContent = 'Z ← A';
    return;
  }

  ascOpt.textContent = 'сначала старые';
  descOpt.textContent = 'сначала новые';
}

async function applySort() {
  const selectedValue = sortMenu.value;
  const order = sortOrder ? sortOrder.value : 'asc';

  localStorage.setItem('selectedOption', selectedValue);
  if (sortOrder) localStorage.setItem('sortOrder', order);

  if (!fsStorage || !fsStorage.isReady) return;

  try {
    const sorted = await fsStorage.sortNotes(selectedValue, order);
    allNotes = Array.isArray(sorted) ? sorted : await fsStorage.getNotes();
    renderNotes();
  } catch (e) {
    console.error('Ошибка сортировки заметок:', e);
  }
}

export function setActiveTagFilter(tags) {
  state.activeFilterTags = normalizeTagList(tags);
  localStorage.setItem('activeFilterTags', JSON.stringify(state.activeFilterTags));
  updateTagsBtnState();
  renderNotes();
}

function parseMarkdown(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  html = html.replace(/^### (.+)$/gm, '<h3 class="markdown-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="markdown-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="markdown-h1">$1</h1>');

  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  html = html.replace(/\n/g, '<br>');

  return html;
}

function parseCodeBlocks(text) {
  if (!text) return parseMarkdown(text);

  const codeBlockRegex = /```\n([\s\S]*?)\n```/g;

  let lastIndex = 0;
  let result = '';
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const beforeText = text.slice(lastIndex, match.index);
    result += parseMarkdown(beforeText);

    const code = match[1];

    const blockId = 'code-block-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);

    result += `
            <div class="code-wrapper" data-code-id="${blockId}">
                <div class="code-header">
                    <button class="copy-code-btn" data-code-id="${blockId}" data-code-text="${code.replace(/"/g, '&quot;')}">
                        <img class="copy-icon" src="media/copy.png" alt="копировать">
                        Копировать
                    </button>
                </div>
                <pre class="code-block" id="${blockId}"><code>${code}</code></pre>
            </div>
        `;

    lastIndex = match.index + match[0].length;
  }

  const remainingText = text.slice(lastIndex);
  result += parseMarkdown(remainingText);

  return result;
}

export async function initParser() {
  await fsStorage.restoreFolder();
  await refreshNotes();
  initCategoryTitle();
  updateTagsBtnState();
  initAnnotations();
  if (filter) filter.classList.add('ready');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      state.search = searchInput.value;
      renderNotes();
    });
  }

  if (sortMenu) {
    const savedValue = localStorage.getItem('selectedOption');
    if (savedValue) sortMenu.value = savedValue;
    const savedOrder = localStorage.getItem('sortOrder');
    if (sortOrder && savedOrder) sortOrder.value = savedOrder;
    updateSortOrderLabels();

    sortMenu.addEventListener('change', () => {
      updateSortOrderLabels();
      void applySort();
    });
  }

  if (sortOrder) {
    sortOrder.addEventListener('change', applySort);
  }

  if (filter) {
    filter.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      document.querySelectorAll('.view-switch button')
          .forEach(b => b.classList.remove('active'));

      btn.classList.add('active');

      state.view = btn.dataset.view;
      localStorage.setItem('currentView', state.view);
      renderNotes();
    });
  }

  if (cardsList) {
    cardsList.addEventListener('change', async (e) => {
      const select = e.target.closest('.category-select');
      if (!select) return;

      const noteId = select.dataset.noteId;
      const newCategory = select.value;

      await changeNoteCategory(noteId, newCategory);
    });

    cardsList.addEventListener('click', async (e) => {
      const addTagBtn = e.target.closest('.tag-add-btn');
      if (addTagBtn) {
        e.stopPropagation();
        await openNoteTagsModal(addTagBtn.dataset.noteId);
        return;
      }

      const tagBtn = e.target.closest('.tag-note');
      if (tagBtn) {
        const noteId = tagBtn.dataset.noteId;
        const tag = tagBtn.dataset.tag;
        const note = allNotes.find(item => String(item.id) === String(noteId));
        if (!note) return;

        const tags = normalizeTagList(note.tags || []).filter(t => t !== String(tag).toLowerCase());
        await changeNoteTags(noteId, tags);
        return;
      }

      const editBtn = e.target.closest('.edit-note');
      if (editBtn) {
        const card = editBtn.closest('.card');
        const note = allNotes.find(item => String(item.id) === String(card?.dataset.noteId));
        if (card && note) startNoteEdit(card, note);
        return;
      }

      const saveBtn = e.target.closest('.save-note');
      if (saveBtn) {
        await saveNoteEdit(saveBtn.closest('.card'));
        return;
      }

      const deleteBtn = e.target.closest('.delete-note');
      if (deleteBtn) {
        const card = deleteBtn.closest('.card');
        if (confirm('Удалить заметку?')) {
          const noteId = card.getAttribute('data-note-id');
          allNotes = await fsStorage.deleteNote(noteId);
          card.remove();
        }
        return;
      }

      const image = e.target.closest('.note-image');
      if (image) {
        openImageModal(image.src);
        return;
      }

      const copyBtn = e.target.closest('.copy-code-btn');
      if (copyBtn) {
        e.stopPropagation();
        let codeText = copyBtn.dataset.codeText;
        if (codeText) {
          codeText = codeText.replace(/&quot;/g, '"');
          try {
            await navigator.clipboard.writeText(codeText);
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<img class="copy-icon" src="media/copy.png"> Скопировано!';
            copyBtn.style.backgroundColor = '#4caf50';

            setTimeout(() => {
              copyBtn.innerHTML = originalText;
              copyBtn.style.backgroundColor = '';
            }, 2000);
          } catch (err) {
            console.error('Не удалось скопировать:', err);
            copyBtn.innerHTML = '<img class="copy-icon" src="media/copy.png"> Ошибка';
            setTimeout(() => {
              copyBtn.innerHTML = originalText;
            }, 2000);
          }
        }
      }
    });
  }

  window.addEventListener('fs-ready', async () => {
    try {
      await loadAllCategories();
      await loadCategoriesForSelects();
      renderNotes();
    } catch (err) {
      console.error("Ошибка при старте приложения:", err);
    }
  });
}