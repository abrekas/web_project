let button = null;

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

function createButton() {
  const btn = document.createElement('div');
  btn.id = 'highlight-save-btn';
  btn.innerHTML = '💾 Сохранить';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      
      chrome.runtime.sendMessage({ 
        type: 'BUTTON_CLICKED', 
        selectedText: selectedText,
        url: window.location.href,
        title: document.title
      }, (response) => {
        if (response && response.success) {
          console.log('Заметка сохранена');
          showNotification('✓ Заметка сохранена!', false);
          const originalText = btn.innerHTML;
          btn.innerHTML = '✓ Сохранено!';
          setTimeout(() => {
            if (button) btn.innerHTML = originalText;
          }, 1000);
        } else {
          console.error('Ошибка сохранения:', response?.error);
          showNotification('❌ Ошибка при сохранении', true);
          btn.innerHTML = '❌ Ошибка';
          setTimeout(() => {
            if (button) btn.innerHTML = '💾 Сохранить';
          }, 1500);
        }
      });
      hideButton();
    }
  });
  document.body.appendChild(btn);
  return btn;
}


function showButton(x, y) {
  if (!button) button = createButton();
  button.style.display = 'block';
  button.style.left = `${x + 10}px`;
  button.style.top = `${y + 10}px`;
}

function hideButton() {
  if (button) button.style.display = 'none';
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

function handleTextSelection() {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText.length > 0) {
    const coords = getSelectionCoordinates();
    if (coords) showButton(coords.x, coords.y);
  } else {
    hideButton();
  }
}

document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('mousedown', (e) => {
  if (button && !button.contains(e.target)) hideButton();
});
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