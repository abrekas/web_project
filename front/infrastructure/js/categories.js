const categoriesUl = document.getElementById('categories-ul');
const newCategoryBtn = document.getElementById('folder-icon');

async function renderCategory(category) {
  const li = document.createElement('li');
  li.textContent = category;
  categoriesUl.appendChild(li);
}

async function loadAllCategories() {
  categoriesUl.innerHTML = '<li class="active">общее</li>';

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
  targetLi.classList.add('active');

  const selectedCategory = targetLi.textContent.trim();
  const searchInput = document.getElementById('search-input');
  const searchValue = searchInput ? searchInput.value : '';

  loadAllNotes(selectedCategory, searchValue);
});

function createNewCategory() {
  if (!window.fsStorage || !window.fsStorage.isReady()) {
    alert('Сначала разрешите доступ к папке данных');
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

window.addEventListener('DOMContentLoaded', loadAllCategories);
window.addEventListener('fs-ready', loadAllCategories);
