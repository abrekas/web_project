const categoriesUl = document.getElementById('categories-ul');
const newCategoryBtn = document.getElementById('folder-icon');

let selectedCategory = 'общее';
let selectedSite = null;

async function getSitesInCategory(category) {
  if (!window.fsStorage || !window.fsStorage.isReady()) return [];
  
  try {
    const notes = await window.fsStorage.getNotes();
    const sitesSet = new Set();
        
    notes.forEach(note => {
      if (String(note.category || '').trim().toLowerCase() === String(category).trim().toLowerCase()) {
        const site = String(note.site || '').trim();
        if (site) {
          sitesSet.add(site);
        }
      }
    });
    
    return Array.from(sitesSet).sort();
  } catch (e) {
    console.error('Ошибка получения сайтов:', e);
    return [];
  }
}

async function renderCategory(category) {
  const li = document.createElement('li');
  li.className = 'category-item';
  li.textContent = category;
  li.dataset.category = category;
  
  categoriesUl.appendChild(li);
  
  const sites = await getSitesInCategory(category);
  if (sites.length > 0) {
    const sitesList = document.createElement('ul');
    sitesList.className = 'sites-list';
    
    sites.forEach(site => {
      const siteLi = document.createElement('li');
      siteLi.textContent = site;
      siteLi.dataset.category = category;
      siteLi.dataset.site = site;
      sitesList.appendChild(siteLi);
    });
    
    li.appendChild(sitesList);
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
      siteLi.textContent = site;
      siteLi.dataset.category = 'общее';
      siteLi.dataset.site = site;
      sitesList.appendChild(siteLi);
    });
    
    generalLi.appendChild(sitesList);
  }

  if (!window.fsStorage || !window.fsStorage.isReady()) return;

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
  
  if (targetLi.dataset.site) {
    selectedSite = targetLi.dataset.site;
    selectedCategory = targetLi.dataset.category;
  } else {
    selectedCategory = targetLi.dataset.category;
    selectedSite = null;
  }

  loadAllNotes(selectedCategory, searchValue, selectedSite);
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

    if (!added) {
      alert('Такая категория уже есть');
      li.remove();
      return;
    }

    li.textContent = added;
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
