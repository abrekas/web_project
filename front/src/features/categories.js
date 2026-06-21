import { fsStorage } from '../services/fs-storage.js';
import { renderNotes, loadCategoriesForSelects, refreshNotes } from '../services/parser.js';

const categoriesUl = document.getElementById('categories-ul');
const newCategoryBtn = document.getElementById('folder-icon');

let selectedCategory = 'общее';
let selectedSite = null;

async function getSitesInCategory(category) {
  if (!fsStorage || !fsStorage.isReady) {
    return [];
  }

  try {
    const notes = await fsStorage.getNotes();
    const sitesMap = new Map();

    const lowerCaseCategory = String(category).trim().toLowerCase();

    if (lowerCaseCategory === 'общее') {
      notes.forEach(note => {
        const site = String(note.site || '').trim();
        if (site) {
          const domain = site.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
          if (!sitesMap.has(domain)) {
            sitesMap.set(domain, site);
          }
        }
      });
    } else {
      notes.forEach(note => {
        if (String(note.category || '').trim().toLowerCase() === lowerCaseCategory) {
          const site = String(note.site || '').trim();
          if (site) {
            const domain = site.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
            if (!sitesMap.has(domain)) {
              sitesMap.set(domain, site);
            }
          }
        }
      });
    }

    return Array.from(sitesMap.values()).sort();
  } catch (e) {
    console.error('Ошибка получения сайтов:', e);
    return [];
  }
}

function getCategoryName(category) {
  if (typeof category === 'string') return category;
  return category.name || 'общее';
}

async function renderCategory(category) {
  const categoryName = getCategoryName(category);

  const tmpl = document.getElementById('category-item-template');
  if (!tmpl) {
    const li = document.createElement('li');
    li.className = 'category-item';

    // Добавляем стрелочку
    const toggle = document.createElement('span');
    toggle.className = 'category-toggle';
    toggle.innerHTML = `<svg class="category-arrow" width="12" height="12" viewBox="0 0 12 12">
      <path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`;

    const span = document.createElement('span');
    span.className = 'category-name';
    span.textContent = categoryName;

    li.dataset.category = categoryName;
    li.appendChild(toggle);
    li.appendChild(span);
    categoriesUl.appendChild(li);

    // Обработчик для стрелочки
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const sitesList = li.querySelector('.sites-list');
      if (sitesList) {
        sitesList.classList.toggle('collapsed');
        toggle.classList.toggle('collapsed');
      }
    });

    const sites = await getSitesInCategory(categoryName);
    if (sites.length > 0) {
      const sitesList = document.createElement('ul');
      sitesList.className = 'sites-list';

      sites.forEach(site => {
        const siteLi = document.createElement('li');
        const siteDisplay = String(site || '').replace(/^https?:\/\//, '').split('/')[0];
        siteLi.textContent = siteDisplay;
        siteLi.dataset.category = categoryName;
        siteLi.dataset.site = site;
        sitesList.appendChild(siteLi);
      });

      li.appendChild(sitesList);
    }
    return;
  }

  const node = tmpl.content.firstElementChild.cloneNode(true);

  // Находим и обновляем название
  const nameSpan = node.querySelector('.category-name') || node.querySelector('span:not(.category-toggle)');
  if (nameSpan) nameSpan.textContent = categoryName;

  // Добавляем стрелочку если её нет
  let toggle = node.querySelector('.category-toggle');
  if (!toggle) {
    toggle = document.createElement('span');
    toggle.className = 'category-toggle';
    toggle.innerHTML = `<svg class="category-arrow" width="12" height="12" viewBox="0 0 12 12">
      <path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`;
    const delBtn = node.querySelector('.delete-category');
    if (delBtn) {
      delBtn.after(toggle);
    } else {
      node.prepend(toggle);
    }
  }

  node.dataset.category = categoryName;

  const delBtn = node.querySelector('.delete-category');
  if (categoryName === 'общее' && delBtn) delBtn.remove();

  if (delBtn) {
    delBtn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      if (!fsStorage || !fsStorage.isReady) {
        alert('Сначала разрешите доступ к папке');
        return;
      }

      if (!confirm(`Удалить категорию "${categoryName}"?`))
        return;

      try {
        const ok = await fsStorage.deleteCategory(categoryName);
        if (!ok) {
          alert('Не удалось удалить категорию');
          return;
        }
        await loadAllCategories();
        await refreshNotes('общее');
      } catch (e) {
        console.error(e);
        alert('Ошибка при удалении категории');
      }
    });
  }

  categoriesUl.appendChild(node);

  // Обработчик для стрелочки
  if (toggle) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const sitesList = node.querySelector('.sites-list');
      if (sitesList) {
        sitesList.classList.toggle('collapsed');
        toggle.classList.toggle('collapsed');
      }
    });
  }

  const sites = await getSitesInCategory(categoryName);
  if (sites.length > 0) {
    const sitesList = document.createElement('ul');
    sitesList.className = 'sites-list';

    sites.forEach(site => {
      const siteLi = document.createElement('li');
      const siteDisplay = String(site || '').replace(/^https?:\/\//, '').split('/')[0];
      siteLi.textContent = siteDisplay;
      siteLi.dataset.category = categoryName;
      siteLi.dataset.site = site;
      sitesList.appendChild(siteLi);
    });

    node.appendChild(sitesList);
  }
}

export async function loadAllCategories() {
  categoriesUl.innerHTML = '';

  const generalLi = document.createElement('li');
  generalLi.className = 'active category-item';
  generalLi.dataset.category = 'общее';

  // Добавляем стрелочку для "общее"
  const toggle = document.createElement('span');
  toggle.className = 'category-toggle';
  toggle.innerHTML = `<svg class="category-arrow" width="12" height="12" viewBox="0 0 12 12">
    <path d="M4 2l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;

  const nameSpan = document.createElement('span');
  nameSpan.className = 'category-name';
  nameSpan.textContent = 'общее';

  generalLi.appendChild(toggle);
  generalLi.appendChild(nameSpan);
  categoriesUl.appendChild(generalLi);

  // Обработчик для стрелочки "общее"
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const sitesList = generalLi.querySelector('.sites-list');
    if (sitesList) {
      sitesList.classList.toggle('collapsed');
      toggle.classList.toggle('collapsed');
    }
  });

  const generalSites = await getSitesInCategory('общее');
  if (generalSites.length > 0) {
    const sitesList = document.createElement('ul');
    sitesList.className = 'sites-list';

    generalSites.forEach(site => {
      const siteLi = document.createElement('li');
      const siteDisplay = String(site || '').replace(/^https?:\/\//, '').split('/')[0];
      siteLi.textContent = siteDisplay;
      siteLi.dataset.category = 'общее';
      siteLi.dataset.site = site;
      sitesList.appendChild(siteLi);
    });

    generalLi.appendChild(sitesList);
  }

  if (!fsStorage || !fsStorage.isReady) {
    return;
  }

  try {
    const list = await fsStorage.getCategories();
    list.forEach(category => renderCategory(category));
  } catch (e) {
    console.error('Ошибка загрузки категорий', e);
  }
}

categoriesUl.addEventListener('click', async (e) => {
  const targetLi = e.target.closest('li');
  if (!targetLi || targetLi.querySelector('input')) return;

  // Игнорируем клики по стрелочке
  if (e.target.closest('.category-toggle')) return;

  document.querySelectorAll('#categories-ul li').forEach(li => li.classList.remove('active'));
  document.querySelectorAll('.sites-list li').forEach(li => li.classList.remove('active'));

  targetLi.classList.add('active');

  const searchInput = document.getElementById('search-input');
  const searchValue = searchInput ? searchInput.value : '';

  let currentCategory = selectedCategory;
  let currentSite = selectedSite;

  if (targetLi.dataset.site) {
    currentSite = targetLi.dataset.site;
    currentCategory = targetLi.dataset.category;
  } else {
    currentCategory = targetLi.dataset.category;
    currentSite = null;
  }

  selectedCategory = currentCategory;
  selectedSite = currentSite;

  await loadCategoriesForSelects();
  renderNotes();
});

categoriesUl.addEventListener('dblclick', (e) => {
  const targetLi = e.target.closest('li');
  if (!targetLi || targetLi.dataset.site) {
    return;
  }

  const sitesList = targetLi.querySelector('.sites-list');
  if (sitesList) {
    sitesList.classList.toggle('collapsed');
    const toggle = targetLi.querySelector('.category-toggle');
    if (toggle) {
      toggle.classList.toggle('collapsed');
    }
  }
});

function createNewCategory() {
  if (!fsStorage || !fsStorage.isReady) {
    alert('Сначала разрешите доступ к папке');
    return;
  }

  const li = document.createElement('li');
  const input = document.createElement('input');

  input.type = 'text';
  input.className = 'category-input';

  li.appendChild(input);
  categoriesUl.appendChild(li);
  input.focus();

  const save = async () => {
    const val = input.value.trim();

    if (!val) {
      li.remove();
      return;
    }

    const added = await fsStorage.addCategory(val);

    if (!added || val === 'общее') {
      alert('Такая категория уже существует');
      li.remove();
      return;
    }
    await loadAllCategories();

    const activeCategory = document.querySelector('#categories-ul li.active');
    const selectedCategory = activeCategory ? activeCategory.dataset.category : 'общее';

    let selectedSite = null;
    if (activeCategory && activeCategory.dataset.site) {
      selectedSite = activeCategory.dataset.site;
    }

    await loadCategoriesForSelects();
    renderNotes();
  };

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      input.removeEventListener('blur', save);
      await save();
    }
    if (e.key === 'Escape') li.remove();
  });

  input.addEventListener('blur', save);
}

if (newCategoryBtn) {
  newCategoryBtn.addEventListener('click', createNewCategory);
}

window.addEventListener('DOMContentLoaded', loadAllCategories);
window.addEventListener('fs-ready', loadAllCategories);