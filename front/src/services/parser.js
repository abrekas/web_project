import { fsStorage } from '../services/fs-storage.js';
import { updateTagsBtnState, openNoteTagsModal } from '../features/tags.js';
import { loadAllCategories } from '../features/categories.js'


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

  const categoriesSet = new Set(['общее', ...allCategories, normalizedCurrent]);
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
  const safeSiteRaw = String(data.site || '').replace(/^https?:\/\//, '');
  const domainOnly = safeSiteRaw.split('/')[0];
  const safeContent = escapeHtml(data.content || '');
  const safeTime = escapeHtml(data.time || '');
  const href = safeSiteRaw ? `https://${safeSiteRaw}` : '#';
  const noteId = escapeHtml(data.id || '');
  const currentCategory = data.category || 'общее';
  const tags = data.tags || [];
  const noteType = data.type;
  const safeImageUrl = escapeHtml(data.imageUrl || '');

  let bodyContent = '';

  if (noteType === 'image' && safeImageUrl) {
    bodyContent = `<img class="note-image" id="${noteId}" src="${safeImageUrl}" alt="картинка записи"/>`;
  } else {
    bodyContent = `<p>${safeContent}</p>`
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
        <button class="delete-note">
            <img class="delete-icon" src="media/trash.png" alt="удалить запись">
        </button>  
        <div class="header-link">
          <img class="link-icon" src="media/link.png">
          <a href="${escapeHtml(href)}" class="source-link" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(domainOnly || 'нет ссылки')}
          </a>
        </div>
      </header>
      <div class="card-content">
        <div class="card-body">
            ${bodyContent}
        </div>
        <footer class="card-footer"><time>${safeTime}</time></footer>
      </div>
    </article>
  `;

}

function getDomainFromUrl(url) {
  const urlStr = String(url || '').toLowerCase().trim();
  if (!urlStr) {
    return '';
  }
  
  const withoutProtocol = urlStr.replace(/^https?:\/\//, '');
  const domain = withoutProtocol.split('/')[0];
  return domain;
}

function filterNotes(category = 'общее', searchToken = '', site = null, view = 'all', filterTags = []) {
  const cat = String(category).trim().toLowerCase();
  const search = String(searchToken).trim().toLowerCase();
  const selectedSite = site ? String(site).trim().toLowerCase() : null;
  const selectedDomain = selectedSite ? getDomainFromUrl(selectedSite) : null;
  const tagFilter = normalizeTagList(filterTags);

  return allNotes.filter(note => {
    const noteCategory = String(note.category || '').trim().toLowerCase();
    const noteContent = String(note.content || '').toLowerCase();
    const noteSite = String(note.site || '').toLowerCase();
    const noteDomain = getDomainFromUrl(noteSite);

    const byCategory = cat === 'общее' || noteCategory === cat;
    const bySearch =
      !search ||
      noteContent.includes(search) ||
      noteSite.includes(search) ||
      noteCategory.includes(search);

    let bySite = true;
    if (selectedDomain) {
      bySite = noteDomain === selectedDomain;
    }

    let byType = true;

    if (view === 'text') byType = note.type != 'image';
    if (view === 'image') byType = note.type === 'image';

    const byTags = noteMatchesTagFilter(note, tagFilter);

    return byCategory && bySearch && bySite && byType && byTags;
  });
}

export function loadAllNotes(category = 'общее', searchToken = '', site = null, view = 'all', filterTags = state.activeFilterTags) {
  const filtered = filterNotes(category, searchToken, site, view, filterTags);

  if (!filtered.length) {
    cardsList.innerHTML = `<p>Заметки не найдены</p>`;
    return;
  }

  const html = filtered.map(renderNoteHtml).join('');
  cardsList.innerHTML = html;
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
  const { category, search, site, view, filterTags } = getState();
  loadAllNotes(category, search, site, view, filterTags);
}

export async function refreshNotes(category = 'общее') {
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

if (searchInput) {
  searchInput.addEventListener('input', () => {
    state.search = searchInput.value;
    renderNotes();
  });
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

function updateSortOrderLabels () {
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
};

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
  return sorted;
};

document.addEventListener('DOMContentLoaded', () => {
  if (!sortMenu) return;

  const savedValue = localStorage.getItem('selectedOption');
  if (savedValue) sortMenu.value = savedValue;
  const savedOrder = localStorage.getItem('sortOrder');
  if (sortOrder && savedOrder) sortOrder.value = savedOrder;
  updateSortOrderLabels();

  sortMenu.addEventListener('change', () => {
    updateSortOrderLabels();
    void applySort();
  });
  
  if (sortOrder) sortOrder.addEventListener('change', applySort);
});

export function setActiveTagFilter(tags) {
  state.activeFilterTags = normalizeTagList(tags);
  localStorage.setItem('activeFilterTags', JSON.stringify(state.activeFilterTags));
  updateTagsBtnState();
  renderNotes();
}

cardsList.addEventListener('click', async (e) => {
  const addTagBtn = e.target.closest('.tag-add-btn');
  if (addTagBtn) {
    e.stopPropagation();
    const noteId = addTagBtn.dataset.noteId;
    openNoteTagsModal(noteId);
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
  }
});


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

cardsList.addEventListener('change', async (e) => {
  const select = e.target.closest('.category-select');
  if (!select) return;

  const noteId = select.dataset.noteId;
  const newCategory = select.value;

  await changeNoteCategory(noteId, newCategory);
});

async function initParser() {
  await fsStorage.restoreFolder();
  await refreshNotes();
  updateTagsBtnState();
  filter.classList.add('ready');
}

window.addEventListener('DOMContentLoaded', initParser);
window.addEventListener('fs-ready', async () => {
  try {
    await loadAllCategories();       
    await loadCategoriesForSelects(); 
    await renderNotes();              
  } catch (err) {
    console.error("Ошибка при старте приложения:", err);
  }
});