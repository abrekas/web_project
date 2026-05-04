let button = null;
let currentImageUrl = null;
let currentImageAlt = null;

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

function saveText(text) {
  chrome.runtime.sendMessage({ 
    type: 'SAVE_TEXT', 
    text: text,
    url: window.location.href,
    title: document.title
  }, (response) => {
    if (response && response.success) {
      showNotification('✓ Заметка сохранена!', false);
      if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '✓ Сохранено!';
        setTimeout(() => {
          if (button) button.innerHTML = originalText;
        }, 1000);
      }
    } else {
      showNotification('❌ Ошибка при сохранении', true);
      if (button) {
        button.innerHTML = '❌ Ошибка';
        setTimeout(() => {
          if (button) button.innerHTML = '💾 Сохранить текст';
        }, 1500);
      }
    }
  });
  hideButton();
}

function saveImage(imageUrl, altText) {
  chrome.runtime.sendMessage({ 
    type: 'SAVE_IMAGE', 
    imageUrl: imageUrl,
    altText: altText,
    pageUrl: window.location.href,
    pageTitle: document.title
  }, (response) => {
    if (response && response.success) {
      showNotification('✓ Ссылка на картинку сохранена!', false);
      if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '✓ Сохранено!';
        setTimeout(() => {
          if (button) button.innerHTML = originalText;
        }, 1000);
      }
    } else {
      showNotification('❌ Ошибка при сохранении картинки', true);
      if (button) {
        button.innerHTML = '❌ Ошибка';
        setTimeout(() => {
          if (button) button.innerHTML = '🖼️ Сохранить картинку';
        }, 1500);
      }
    }
  });
  hideButton();
}

function createButton() {
  const btn = document.createElement('div');
  btn.id = 'highlight-save-btn';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (currentImageUrl) {
      saveImage(currentImageUrl, currentImageAlt);
      currentImageUrl = null;
      currentImageAlt = null;
    } else {
      const selectedText = window.getSelection().toString();
      if (selectedText) {
        saveText(selectedText);
      }
    }
    hideButton();
  });
  document.body.appendChild(btn);
  return btn;
}

function showButton(x, y, isImage = false, altText = '') {
  if (!button) button = createButton();
  
  if (isImage) {
    button.innerHTML = '🖼️ Сохранить картинку';
  } else {
    button.innerHTML = '💾 Сохранить текст';
  }
  
  button.style.display = 'block';
  button.style.left = `${x + 10}px`;
  button.style.top = `${y + 10}px`;
}

function hideButton() {
  if (button) button.style.display = 'none';
}

function getEventCoordinates(e) {
  return {
    x: e.pageX,
    y: e.pageY
  };
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
    const coords = getEventCoordinates(e);
    showButton(coords.x, coords.y, true, currentImageAlt);
    return false;
  }
});

function handleTextSelection() {
  if (currentImageUrl) return;
  
  const selectedText = window.getSelection().toString().trim();
  if (selectedText.length > 0) {
    const coords = getSelectionCoordinates();
    if (coords) showButton(coords.x, coords.y, false);
  } else {
    hideButton();
  }
}

document.addEventListener('mousedown', (e) => {
  if (button && !button.contains(e.target)) {
    hideButton();
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
  if (button && button.style.display === 'block') hideButton();
});

button = createButton();
hideButton();