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

function updateAllCategorySelects() {
  document.querySelectorAll('.category-select').forEach(select => {
    const noteId = select.dataset.noteId;
    const note = allNotes.find(n => String(n.id) === String(noteId));
    if (note) {
      const currentCategory = note.category || 'общее';
      select.innerHTML = buildCategoryOptions(currentCategory);
    }
  });
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

function renderNote(data) {
  const safeSiteRaw = String(data.site || '').replace(/^https?:\/\//, '');
  const domainOnly = safeSiteRaw.split('/')[0];
  const safeContent = escapeHtml(data.content || '');
  const safeTime = escapeHtml(data.time || '');
  const href = safeSiteRaw ? `https://${safeSiteRaw}` : '#';
  const noteId = escapeHtml(data.id || '');
  const currentCategory = data.category || 'общее';

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
            ${escapeHtml(domainOnly || 'нет ссылки')}
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

function filterNotes(category = 'общее', searchToken = '', site = null) {
  const cat = String(category).trim().toLowerCase();
  const search = String(searchToken).trim().toLowerCase();
  const selectedSite = site ? String(site).trim().toLowerCase() : null;

  const filtered = allNotes.filter(note => {
    const noteCategory = String(note.category || '').trim().toLowerCase();
    const noteContent = String(note.content || '').toLowerCase();
    const noteSite = String(note.site || '').toLowerCase();

    const bySearch = !search || noteContent.includes(search) || noteSite.includes(search) || noteCategory.includes(search);

    if (selectedSite) {
      const bySite = noteSite === selectedSite;
      if (cat === 'общее') {
        return bySite && bySearch;
      }
      return bySite && noteCategory === cat && bySearch;
    }

    if (cat === 'общее') {
      return bySearch;
    }
    return noteCategory === cat && bySearch;
  });

  return filtered;
}

function loadAllNotes(category = 'общее', searchToken = '', site = null) {
  cardsList.innerHTML = '';
  const filtered = filterNotes(category, searchToken, site);

  if (!filtered.length) {
    cardsList.innerHTML = `<p>Заметки не найдены</p>`;
    return;
  }

  filtered.forEach(renderNote);
}

async function refreshNotes(category = 'общее') {
  if (!window.fsStorage || !window.fsStorage.isReady()) {
    cardsList.innerHTML = `<p>Сначала разрешите доступ к папке</p>`;
    return;
  }

  try {
    await loadCategoriesForSelects();
    allNotes = await window.fsStorage.getNotes();

    if (window.loadAllCategories) {
      await window.loadAllCategories();
    }

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
    if (!note) {
      return;
    }

    note.category = newCategory;

    await window.fsStorage.updateNote(note);

    const activeCategory = document.querySelector('#categories-ul li.active');
    const selectedCategory = activeCategory ? activeCategory.dataset.category : 'общее';
    
    let selectedSite = null;
    if (activeCategory && activeCategory.dataset.site) {
      selectedSite = activeCategory.dataset.site;
    }
    
    const searchValue = searchInput ? searchInput.value : '';

    allNotes = await window.fsStorage.getNotes();
    
    if (window.loadAllCategories) {
      await window.loadAllCategories();
    }
    
    loadAllNotes(selectedCategory, searchValue, selectedSite);
  } catch (e) {
    console.error('Ошибка смены категории заметки:', e);
    alert('Не удалось изменить категорию');
  }
}

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const activeCategory = document.querySelector('#categories-ul li.active');
    const selectedCategory = activeCategory ? activeCategory.dataset.category : 'общее';
    
    let selectedSite = null;
    if (activeCategory && activeCategory.dataset.site) {
      selectedSite = activeCategory.dataset.site;
    }
    
    loadAllNotes(selectedCategory, searchInput.value, selectedSite);
  });
}

cardsList.addEventListener('click', async (e) => {
  const deleteBtn = e.target.closest('.delete-note');
  if (deleteBtn) {
    const card = deleteBtn.closest('.card');
    if (confirm('Удалить заметку?')) {
      const noteId = card.getAttribute('data-note-id');
      allNotes = await window.fsStorage.deleteNote(noteId);
      card.remove();
      
      if (window.loadAllCategories) {
        await window.loadAllCategories();
      }
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
window.loadCategoriesForSelects = loadCategoriesForSelects;
window.updateAllCategorySelects = updateAllCategorySelects;

async function initParser() {
  await window.fsStorage.restoreFolder();
  
  if (window.loadAllCategories) {
    await window.loadAllCategories();
  }
  
  await refreshNotes();
}

window.addEventListener('DOMContentLoaded', initParser);
window.addEventListener('fs-ready', async () => {
  await refreshNotes();
});
