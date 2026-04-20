const categoriesUl = document.getElementById('categories-ul');
const newCategoryBtn = document.getElementById('folder-icon');

async function renderCategory(category) {
  const tmpl = document.getElementById('category-item-template');
  if (!tmpl) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = category;
    li.appendChild(span);
    categoriesUl.appendChild(li);
    return;
  }

  const node = tmpl.content.firstElementChild.cloneNode(true);
  const span = node.querySelector('span');
  span.textContent = category;

  const delBtn = node.querySelector('.delete-category');
  if (category === 'общее' && delBtn) delBtn.remove();

  if (delBtn) {
    delBtn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      if (!window.fsStorage || !window.fsStorage.isReady()) {
        alert('Сначала разрешите доступ к папке данных');
        return;
      }

      if (!confirm(`Удалить категорию "${category}"?`))
        return;

      try {
        const ok = await window.fsStorage.deleteCategory(category);
        if (!ok) {
          alert('Не удалось удалить категорию');
          return;
        }
        await loadAllCategories();
        loadAllNotes('общее', '');
      } catch (e) {
        console.error(e);
        alert('Ошибка при удалении категории');
      }
    });
  }

  categoriesUl.appendChild(node);
}

async function loadAllCategories() {
  categoriesUl.innerHTML = '<li class="active"><span>общее</span></li>';


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

  const span = targetLi.querySelector('span');
  const selectedCategory = (span ? span.textContent : targetLi.textContent).trim();
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

    if (!added || val === 'общее') {
      alert('Такая категория уже существует');
        li.remove();
      return;
    }
      await loadAllCategories();
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
