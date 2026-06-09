const categoriesUl = document.getElementById('categories-ul');
const newCategoryBtn = document.getElementById('folder-icon');

let selectedCategory = 'общее';
let selectedSite = null;

async function getSitesInCategory(category) {
  if (!window.fsStorage || !window.fsStorage.isReady()) {
    return [];
  }
  
  try {
    const notes = await window.fsStorage.getNotes();
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
    const span = document.createElement('span');
    span.textContent = categoryName;
    li.dataset.category = categoryName;
  
    li.appendChild(span);
    categoriesUl.appendChild(li);
  
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
  const span = node.querySelector('span');
  span.textContent = categoryName;
  
  node.dataset.category = categoryName;

  const delBtn = node.querySelector('.delete-category');
  if (categoryName === 'общее' && delBtn) delBtn.remove();

  if (delBtn) {
    delBtn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      if (!window.fsStorage || !window.fsStorage.isReady()) {
        alert('Сначала разрешите доступ к папке');
        return;
      }

      if (!confirm(`Удалить категорию "${categoryName}"?`))
        return;

      try {
        const ok = await window.fsStorage.deleteCategory(categoryName);
        if (!ok) {
          alert('Не удалось удалить категорию');
          return;
        }
        await loadAllCategories();
        if (window.refreshNotes) {
          await window.refreshNotes('общее');
        }
      } catch (e) {
        console.error(e);
        alert('Ошибка при удалении категории');
      }
    });
  }

  categoriesUl.appendChild(node);

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

async function loadAllCategories() {
  categoriesUl.innerHTML = '';
  
  const generalLi = document.createElement('li');
  generalLi.textContent = 'общее';
  generalLi.className = 'active category-item';
  generalLi.dataset.category = 'общее';
  categoriesUl.appendChild(generalLi);
  
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

  if (!window.fsStorage || !window.fsStorage.isReady()) {
    return;
  }

  try {
    const list = await window.fsStorage.getCategories();
    list.forEach(category => renderCategory(category));
  } catch (e) {
    console.error('Ошибка загрузки категорий', e);
  }
}

categoriesUl.addEventListener('click', (e) => {
  const targetLi = e.target.closest('li');
  if (!targetLi || targetLi.querySelector('input')) return;
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

  if (window.renderNotes) {
    window.renderNotes();
  } else {
    loadAllNotes(currentCategory, searchValue, currentSite);
  }
});

categoriesUl.addEventListener('dblclick', (e) => {
  const targetLi = e.target.closest('li');
  if (!targetLi || targetLi.dataset.site) {
    return;
  }
  
  const sitesList = targetLi.querySelector('.sites-list');
  if (sitesList) {
    sitesList.classList.toggle('collapsed');
  }
});

function createNewCategory() {
  if (!window.fsStorage || !window.fsStorage.isReady()) {
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

    const added = await window.fsStorage.addCategory(val);

    if (!added || val === 'общее') {
      alert('Такая категория уже существует');
        li.remove();
      return;
    }
      await loadAllCategories();
      
      if (window.loadCategoriesForSelects) {
        await window.loadCategoriesForSelects();
      }
      
      const activeCategory = document.querySelector('#categories-ul li.active');
      const selectedCategory = activeCategory ? activeCategory.dataset.category : 'общее';
      
      let selectedSite = null;
      if (activeCategory && activeCategory.dataset.site) {
        selectedSite = activeCategory.dataset.site;
      }
      
      if (window.renderNotes) {
        window.renderNotes();
      } else if (window.loadAllNotes) {
        window.loadAllNotes(selectedCategory, searchValue, selectedSite);
      }
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

window.loadAllCategories = loadAllCategories;

window.addEventListener('DOMContentLoaded', loadAllCategories);
window.addEventListener('fs-ready', loadAllCategories);