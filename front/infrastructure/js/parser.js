const cardsList = document.getElementById('cards-list');
const searchInput = document.getElementById('search-input');

let allNotes = [];
let allCategories = [];

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

async function loadCategoriesForSelects() {
  if (!window.fsStorage || !window.fsStorage.isReady()) {
    allCategories = [];
    return;
  }

  try {
    const categories = await window.fsStorage.getCategories();
    allCategories = Array.isArray(categories) ? categories : [];
  } catch (e) {
    console.error('Ошибка загрузки категорий:', e);
    allCategories = [];
  }
}

function buildCategoryOptions(currentCategory) {
  const normalizedCurrent = String(currentCategory || 'без категории').trim();

  const categoriesSet = new Set(['общее', ...allCategories, normalizedCurrent]);
  const categories = Array.from(categoriesSet);

  return categories.map(category => {
    const selected = category === normalizedCurrent ? 'selected' : '';
    return `<option value="${escapeHtml(category)}" ${selected}>${escapeHtml(category)}</option>`;
  }).join('');
}

function renderNote(data) {
  const safeSiteRaw = String(data.site || '').replace(/^https?:\/\//, '');
  const safeContent = escapeHtml(data.content || '');
  const safeTime = escapeHtml(data.time || '');
  const href = safeSiteRaw ? `https://${safeSiteRaw}` : '#';
  const noteId = escapeHtml(data.id || '');
  const currentCategory = data.category || 'без категории';

  cardsList.innerHTML += `
    <article class="card" data-note-id="${noteId}">
      <header class="card-header">
        <select class="category-select" data-note-id="${noteId}">
          ${buildCategoryOptions(currentCategory)}
        </select>
        <button class="delete-note">
            <img class="delete-icon" src="media/trash.png" alt="удалить запись">
        </button>
        <div class="header-link">
          <img class="link-icon" src="media/link.png">
          <a href="${escapeHtml(href)}" class="source-link" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(safeSiteRaw.slice(0, 20) || 'нет ссылки')}
          </a>
        </div>  
      </header>
      <div class="card-content">
        <div class="card-body"><p>${safeContent}</p></div>
        <footer class="card-footer"><time>${safeTime}</time></footer>
      </div>
    </article>
  `;
}

function filterNotes(category = 'общее', searchToken = '') {
  const cat = String(category).trim().toLowerCase();
  const search = String(searchToken).trim().toLowerCase();

  return allNotes.filter(note => {
    const noteCategory = String(note.category || '').trim().toLowerCase();
    const noteContent = String(note.content || '').toLowerCase();
    const noteSite = String(note.site || '').toLowerCase();

    const byCategory = cat === 'общее' || noteCategory === cat;
    const bySearch =
      !search ||
      noteContent.includes(search) ||
      noteSite.includes(search) ||
      noteCategory.includes(search);

    return byCategory && bySearch;
  });
}

function loadAllNotes(category = 'общее', searchToken = '') {
  cardsList.innerHTML = '';
  const filtered = filterNotes(category, searchToken);

  if (!filtered.length) {
    cardsList.innerHTML = `<p>Заметки не найдены</p>`;
    return;
  }

  filtered.forEach(renderNote);
}

async function refreshNotes(category = 'общее') {
  if (!window.fsStorage || !window.fsStorage.isReady()) {
    cardsList.innerHTML = `<p>Сначала разрешите доступ к папке с данными</p>`;
    return;
  }

  try {
    await loadCategoriesForSelects();
    allNotes = await window.fsStorage.getNotes();

    const searchValue = searchInput ? searchInput.value : '';
    loadAllNotes(category, searchValue);
  } catch (e) {
    console.error(e);
    cardsList.innerHTML = `<p>Ошибка чтения notes.json</p>`;
  }
}

async function changeNoteCategory(noteId, newCategory) {
  try {
    const note = allNotes.find(item => String(item.id) === String(noteId));
    if (!note) return;

    note.category = newCategory;

    await window.fsStorage.updateNote(note);

    const activeCategory = document.querySelector('#categories-ul li.active');
    const selectedCategory = activeCategory ? activeCategory.textContent.trim() : 'общее';
    const searchValue = searchInput ? searchInput.value : '';

    allNotes = await window.fsStorage.getNotes();
    loadAllNotes(selectedCategory, searchValue);
  } catch (e) {
    console.error('Ошибка смены категории заметки:', e);
    alert('Не удалось изменить категорию');
  }
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const activeCategory = document.querySelector('#categories-ul li.active');
    const selectedCategory = activeCategory ? activeCategory.textContent.trim() : 'общее';
    loadAllNotes(selectedCategory, searchInput.value);
  });
}

cardsList.addEventListener('click', async (e) => {
  const deleteBtn = e.target.closest('.delete-note');
  if (deleteBtn) {
    const card = deleteBtn.closest('.card');
    if (confirm('Удалить заметку?')) {
      const noteId = card.getAttribute('data-note-id');
      await window.fsStorage.deleteNote(noteId);
      card.remove();
      allNotes = await window.fsStorage.getNotes();
    }
  }
})

cardsList.addEventListener('change', async (e) => {
  const select = e.target.closest('.category-select');
  if (!select) return;

  const noteId = select.dataset.noteId;
  const newCategory = select.value;

  await changeNoteCategory(noteId, newCategory);
});

window.loadAllNotes = loadAllNotes;
window.refreshNotes = refreshNotes;

async function initParser() {
  await window.fsStorage.restoreFolder();
  await refreshNotes();
}

window.addEventListener('DOMContentLoaded', initParser);
window.addEventListener('fs-ready', async () => {
  await refreshNotes();
});
