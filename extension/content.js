let button = null;

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
          const originalText = btn.innerHTML;
          btn.innerHTML = '✓ Сохранено!';
          setTimeout(() => {
            if (button) btn.innerHTML = originalText;
          }, 1000);
        } else {
          console.error('Ошибка сохранения:', response?.error);
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