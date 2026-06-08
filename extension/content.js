let saveContainer = null;
let currentImageUrl = null;
let currentImageAlt = null;
let currentIsImage = false;
let currentSelectedText = '';

function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000000;
    background: ${isError ? '#e74c3c' : '#27ae60'};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    opacity: 0;
    transform: translateX(100px);
    transition: opacity 0.3s ease, transform 0.3s ease;
    pointer-events: none;
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 10);
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100px)';
    setTimeout(() => {
      if (notification.parentNode) notification.remove();
    }, 300);
  }, 2500);
}

function saveTextWithCategory(text, category) {
  chrome.runtime.sendMessage({
    type: 'SAVE_TEXT',
    text: text,
    url: window.location.href,
    title: document.title,
    category: category
  }, (response) => {
    if (response && response.success) {
      showNotification('Заметка сохранена!', false);
      if (saveContainer) {
        const btn = saveContainer.querySelector('.save-btn');
        if (btn) {
          const originalText = btn.textContent;
          btn.textContent = 'Сохранено!';
          setTimeout(() => {
            if (btn) btn.textContent = originalText;
          }, 1000);
        }
      }
    } else {
      showNotification('Ошибка при сохранении', true);
    }
    hideSaveUI();
  });
}

function saveImageWithCategory(imageUrl, altText, category) {
  chrome.runtime.sendMessage({
    type: 'SAVE_IMAGE',
    imageUrl: imageUrl,
    altText: altText,
    pageUrl: window.location.href,
    pageTitle: document.title,
    category: category
  }, (response) => {
    if (response && response.success) {
      showNotification('Ссылка на картинку сохранена!', false);
      if (saveContainer) {
        const btn = saveContainer.querySelector('.save-btn');
        if (btn) {
          const originalText = btn.textContent;
          btn.textContent = 'Сохранено!';
          setTimeout(() => {
            if (btn) btn.textContent = originalText;
          }, 1000);
        }
      }
    } else {
      showNotification('Ошибка при сохранении картинки', true);
    }
    hideSaveUI();
  });
}

async function getLastCategory() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['lastCategory'], (result) => {
      resolve(result.lastCategory || null);
    });
  });
}

async function setLastCategory(category) {
  chrome.runtime.sendMessage({ type: 'SAVE_LAST_CATEGORY', category: category });
}

function createSaveContainer() {
  const container = document.createElement('div');
  container.id = 'note-save-container';
  container.style.display = 'none';

  const select = document.createElement('select');
  select.className = 'category-select';

  const btn = document.createElement('button');
  btn.className = 'save-btn';
  btn.textContent = 'Сохранить';

  container.appendChild(select);
  container.appendChild(btn);
  
  document.body.appendChild(container);
  return container;
}

async function showSaveUI(x, y, isImage, altText = '', selectedText = '') {
  if (!saveContainer) saveContainer = createSaveContainer();

  const categoriesResponse = await chrome.runtime.sendMessage({ type: 'GET_CATEGORIES' });
  let categories = ['общее'];
  if (categoriesResponse && categoriesResponse.success && categoriesResponse.categories.length) {
    categories = categoriesResponse.categories;
  }
  const lastCategory = await getLastCategory();
  const defaultCategory = (lastCategory && categories.includes(lastCategory)) ? lastCategory : categories[0];

  const select = saveContainer.querySelector('.category-select');
  
  select.replaceChildren(); 
  
  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    if (cat === defaultCategory) option.selected = true;
    select.appendChild(option);
  });

  const btn = saveContainer.querySelector('.save-btn');
  
  if (isImage) {
    btn.textContent = 'Сохранить картинку';
  } else {
    btn.textContent = 'Сохранить текст';
  }

  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', async () => {
    const selectedCategory = select.value;
    await setLastCategory(selectedCategory);
    if (isImage) {
      saveImageWithCategory(currentImageUrl, currentImageAlt, selectedCategory);
    } else {
      saveTextWithCategory(selectedText, selectedCategory);
    }
  });

  saveContainer.style.left = `${x + 10}px`;
  saveContainer.style.top = `${y + 10}px`;
  saveContainer.style.display = 'flex';
}

function hideSaveUI() {
  if (saveContainer) saveContainer.style.display = 'none';
  currentImageUrl = null;
  currentImageAlt = null;
  currentIsImage = false;
  currentSelectedText = '';
}

function getEventCoordinates(e) {
  return { x: e.pageX, y: e.pageY };
}

function getSelectionCoordinates() {
  const selection = window.getSelection();
  if (selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  return {
    x: rect.left + window.scrollX,
    y: rect.bottom + window.scrollY
  };
}

document.addEventListener('contextmenu', (e) => {
  let target = e.target;
  let imageElement = null;
  while (target && target !== document.body) {
    if (target.tagName === 'IMG') {
      imageElement = target;
      break;
    }
    target = target.parentElement;
  }
  if (imageElement) {
    e.preventDefault();
    currentImageUrl = imageElement.src;
    currentImageAlt = imageElement.alt || '';
    currentIsImage = true;
    const coords = getEventCoordinates(e);
    showSaveUI(coords.x, coords.y - 130, true, currentImageAlt, '');
    return false;
  }
});

async function handleTextSelection() {
  if (currentIsImage) return;
  const selectedText = window.getSelection().toString().trim();
  if (selectedText.length > 0) {
    currentSelectedText = selectedText;
    currentIsImage = false;
    const coords = getSelectionCoordinates();
    if (coords) showSaveUI(coords.x, coords.y, false, '', selectedText);
  } else {
    hideSaveUI();
  }
}

document.addEventListener('mousedown', (e) => {
  if (saveContainer && !saveContainer.contains(e.target)) {
    hideSaveUI();
  }
});

document.addEventListener('mouseup', handleTextSelection);

document.addEventListener('keyup', (e) => {
  if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    setTimeout(handleTextSelection, 10);
  }
});

window.addEventListener('scroll', () => {
  if (saveContainer && saveContainer.style.display === 'flex') hideSaveUI();
});

saveContainer = createSaveContainer();
hideSaveUI();