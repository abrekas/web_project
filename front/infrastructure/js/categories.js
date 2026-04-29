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
  const li = e.target.closest('li');
  if (!li) return;

  state.category = li.textContent.trim();

  document.querySelectorAll('#categories-ul li')
      .forEach(x => x.classList.remove('active'));

  li.classList.add('active');

  renderNotes();
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

    if (!added || val === "общее") {
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
