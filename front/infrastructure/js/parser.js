const cardsList = document.getElementById('cards-list');
const searchInput = document.getElementById('search-input');
const filter = document.querySelector('.view-switch');
const sortMenu = document.querySelector('#sort-menu');
const sortOrder = document.querySelector('#sort-order');

const state = {
  category: 'общее',
  search: '',
  view: localStorage.getItem('currentView') || 'all',
  site: null
};

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

function renderNoteHtml(data) {
  const safeSiteRaw = String(data.site || '').replace(/^https?:\/\//, '');
  const domainOnly = safeSiteRaw.split('/')[0];
  const safeContent = escapeHtml(data.content || '');
  const safeTime = escapeHtml(data.time || '');
  const href = safeSiteRaw ? `https://${safeSiteRaw}` : '#';
  const noteId = escapeHtml(data.id || '');
  const currentCategory = data.category || 'общее';
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

function filterNotes(category = 'общее', searchToken = '', view = 'all', site = null) {
  const cat = String(category).trim().toLowerCase();
  const search = String(searchToken).trim().toLowerCase();
  const selectedSite = site ? String(site).trim().toLowerCase() : null;

  return allNotes.filter(note => {
    const noteCategory = String(note.category || '').trim().toLowerCase();
    const noteContent = String(note.content || '').toLowerCase();
    const noteSite = String(note.site || '').toLowerCase();

    const byCategory = cat === 'общее' || noteCategory === cat;

    const bySite = true;
    if (selectedSite !== null) {
      bySite = noteSite === selectedSite;
    }

    const bySearch =
      !search ||
      noteContent.includes(search) ||
      noteSite.includes(search) ||
      noteCategory.includes(search);

    let byType = true;

    if (view === 'text') byType = note.type != 'image';
    
    if (view === 'image') byType = note.type === 'image';

    return byCategory && bySearch && byType && bySite;
  });
}

function loadAllFilteredNotes(category = 'общее', searchToken = '', view = 'all', site = null) {
  const filtered = filterNotes(category, searchToken, view, site);

  if (!filtered.length) {
    cardsList.innerHTML = `<p>Заметки не найдены</p>`;
    return;
  }

  const html = filtered.map(renderNoteHtml).join('');
  cardsList.innerHTML = html;
}

function getState() {
  return {
    category: state.category,
    search: searchInput?.value || '',
    view: state.view,
    site: state.site
  };
}

function renderNotes() {
  const { category, search, view, site } = getState();
  loadAllFilteredNotes(category, search, view, site);
}

async function refreshNotes(category = 'общее') {
  if (!window.fsStorage || !window.fsStorage.isReady()) {
    cardsList.innerHTML = `<p>Сначала разрешите доступ к папке</p>`;
    return;
  }

  try {
    await loadCategoriesForSelects();
    allNotes = await window.fsStorage.getNotes();
    renderNotes()
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

function openImageModal(src) {
  const modal = document.getElementById('universal-modal');
  const modalBody = document.getElementById('modal-body');
  const modalContent = modal.querySelector('.modal-content');

  modalContent.classList.add('image-viewer');

  modalBody.innerHTML = '';

  const img = document.createElement('img');
  img.src = src;
  img.alt = 'изображение заметки';
  img.className = 'full-modal-image';

  img.addEventListener('load', () => {
    const MIN_IMAGE_SIZE = 700; 
    const MAX_SCALE = 3;

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    const availableWidth = window.innerWidth - 64;
    const availableHeight = window.innerHeight - 64;

    const longestSide = Math.max(naturalWidth, naturalHeight);

    let scale = 1;

    if (longestSide < MIN_IMAGE_SIZE) {
      scale = MIN_IMAGE_SIZE / longestSide;
    }

    scale = Math.min(scale, MAX_SCALE);

    const fitScale = Math.min(
      availableWidth / naturalWidth,
      availableHeight / naturalHeight
    );

    scale = Math.min(scale, fitScale);

    img.style.width = `${naturalWidth * scale}px`;
    img.style.height = `${naturalHeight * scale}px`;
  });

  modalBody.appendChild(img);

  modal.style.display = 'flex';
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

    return;
  }
  const image = e.target.closest('.note-image');

  if (image) {
    openImageModal(image.src);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  if (!sortMenu) return;

  const updateSortOrderLabels = () => {
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

  const savedValue = localStorage.getItem('selectedOption');
  if (savedValue) sortMenu.value = savedValue;
  const savedOrder = localStorage.getItem('sortOrder');
  if (sortOrder && savedOrder) sortOrder.value = savedOrder;
  updateSortOrderLabels();

  
  const applySort = async () => {
    const selectedValue = sortMenu.value;
    const order = sortOrder ? sortOrder.value : 'asc';

    localStorage.setItem('selectedOption', selectedValue);
    if (sortOrder) localStorage.setItem('sortOrder', order);

    if (!window.fsStorage || !window.fsStorage.isReady()) return;

    try {
      const sorted = await window.fsStorage.sortNotes(selectedValue, order);
      allNotes = Array.isArray(sorted) ? sorted : await window.fsStorage.getNotes();
      renderNotes();
    } catch (e) {
      console.error('Ошибка сортировки заметок:', e);
    }
  };

  sortMenu.addEventListener('change', () => {
    updateSortOrderLabels();
    void applySort();
  });
  if (sortOrder) sortOrder.addEventListener('change', applySort);
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



window.loadAllFilteredNotes = loadAllFilteredNotes;
window.refreshNotes = refreshNotes;
window.loadCategoriesForSelects = loadCategoriesForSelects;
window.updateAllCategorySelects = updateAllCategorySelects;

async function initParser() {
  await window.fsStorage.restoreFolder();
  
  if (window.loadAllCategories) {
    await window.loadAllCategories();
  }
  
  await refreshNotes();
  filter.classList.add('ready');
}

window.addEventListener('DOMContentLoaded', initParser);
