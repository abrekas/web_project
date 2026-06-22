import {getNotes, getComments, saveComments, addComment, updateComment, deleteComment} from '../services/fs-storage.js';

let commentTooltip = null;
let floatingButton = null;
let floatingSuccessButton = null;
let savedSelectionRange = null;

// ---------- Инициализация тултипа ----------
export function initCommentTooltip() {
  if (document.getElementById('comment-tooltip')) return;
  const tooltip = document.createElement('div');
  tooltip.id = 'comment-tooltip';
  tooltip.className = 'comment-tooltip';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);
  commentTooltip = tooltip;
}

// ---------- Наведение для показа тултипа ----------
export function initAnnotationTooltips() {
  document.body.addEventListener('mouseenter', (e) => {
    const target = e.target.closest('.commented-text');
    if (!target) return;
    const comment = target.getAttribute('data-comment');
    if (!comment) return;
    if (!commentTooltip) initCommentTooltip();
    commentTooltip.textContent = comment;
    commentTooltip.style.display = 'block';
    const rect = target.getBoundingClientRect();
    commentTooltip.style.left = rect.left + 'px';
    commentTooltip.style.top = (rect.bottom + 8) + 'px';
    commentTooltip.style.opacity = '0';
    setTimeout(() => { commentTooltip.style.opacity = '1'; }, 10);
  });

  document.body.addEventListener('mouseleave', (e) => {
    const target = e.target.closest('.commented-text');
    if (!target) return;
    if (commentTooltip) {
      setTimeout(() => {
        if (commentTooltip) commentTooltip.style.display = 'none';
      }, 100);
    }
  });
}

// ---------- Плавающая кнопка ----------
function showFloatingCommentButton() {
  if (floatingButton) floatingButton.remove();
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.toString().trim() === '') return;
  savedSelectionRange = selection.getRangeAt(0).cloneRange();
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;
  
  // проверяем, что выделение внутри карточки
  let card = range.commonAncestorContainer.closest?.('.card');
  if (!card && range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
    card = range.commonAncestorContainer.parentElement?.closest('.card');
  }
  if (!card) return;
  
  floatingButton = document.createElement('div');
  floatingButton.className = 'floating-comment-btn';
  floatingButton.textContent = '💬 Добавить комментарий';
  Object.assign(floatingButton.style, {
    position: 'fixed',
    left: `${rect.left + window.scrollX}px`,
    top: `${rect.bottom + window.scrollY + 5}px`,
    zIndex: '10000',
    background: '#1e88e5',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    padding: '6px 12px',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    fontWeight: '500'
  });
  floatingButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    await addCommentToSelectedText();
    hideFloatingButton();
  });
  document.body.appendChild(floatingButton);
}

function hideFloatingButton() {
  if (floatingButton) {
    floatingButton.remove();
    floatingButton = null;
  }
  savedSelectionRange = null;
}

// Показывает временное уведомление (тост) в правом верхнем углу
function showSuccessToast(message = '💬 Комментарий добавлен!', duration = 2000) {
  // Удаляем предыдущий тост, если есть
  const existingToast = document.querySelector('.comment-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = 'comment-toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '10001',
    background: '#1ee535',
    color: '#fff',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: 'opacity 0.3s',
    opacity: '1'
  });
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 300);
  }, duration);
}

// ---------- Добавление комментария (исправленная версия с сохранением rect) ----------
async function addCommentToSelectedText() {
  if (!savedSelectionRange) {
    alert('Сначала выделите текст в заметке');
    return;
  }

  const range = savedSelectionRange;
  if (!range.startContainer.isConnected) {
    alert('Выделение устарело, попробуйте выделить текст заново');
    savedSelectionRange = null;
    return;
  }

  let card = range.commonAncestorContainer.closest?.('.card');
  if (!card && range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
    card = range.commonAncestorContainer.parentElement?.closest('.card');
  }
  if (!card) {
    alert('Выделите текст внутри заметки');
    savedSelectionRange = null;
    return;
  }

  const noteId = card.getAttribute('data-note-id');
  try{
    const allComments = await getComments();
  }
  catch{
    alert('Не удалось открыть comments.js');
  }

  // Находим текстовый узел и смещения
  let textNode = range.startContainer;
  let startOffset, endOffset;

  if (textNode.nodeType !== Node.TEXT_NODE) {
    const walker = document.createTreeWalker(card.querySelector('.card-body'), NodeFilter.SHOW_TEXT);
    textNode = walker.nextNode();
    if (!textNode) {
      alert('Не удалось найти текст в заметке');
      savedSelectionRange = null;
      return;
    }
    startOffset = 0;
    endOffset = textNode.textContent.length;
  } else {
    startOffset = range.startOffset;
    endOffset = range.endOffset;
    if (range.endContainer !== textNode) {
      endOffset = textNode.textContent.length;
    }
  }

  if (startOffset >= endOffset) return;

  const commentText = prompt('Введите комментарий к выделенному фрагменту:');
  if (!commentText || commentText.trim() === '') return;

  
  try {
    addComment(noteId, startOffset, endOffset, commentText.trim());
    hideFloatingButton();
    showSuccessToast('💬 Комментарий добавлен!');
  } catch (err) {
    console.error('Ошибка сохранения комментария:', err);
    alert('Не удалось сохранить комментарий');
  }

  savedSelectionRange = null;
}

// ---------- Применение аннотаций к DOM ----------
function applyAnnotationsToCard(card, comments){
  const bodyDiv = cardElement.querySelector('.card-body');
  if (!bodyDiv) return;

  const escapeHtml = (str) => String(str).replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
  let resultHtml = escapeHtml(fullText);
  comments.forEach(element => {
    
  });
  const highlight = new Highlight(range1, range2);
}

async function renderComments() {
  const [notes, comments] = await Promise.all([getNotes(), getComments()]);
  const cards = document.querySelectorAll('.card');

  // Группируем комментарии по noteId
  const commentsByNote = {};
  comments.forEach(comment => {
    if (!commentsByNote[comment.noteId]) {
      commentsByNote[comment.noteId] = [];
    }
    commentsByNote[comment.noteId].push(comment);
  });

  // Для каждой карточки проверяем, есть ли комментарии
  cards.forEach(card => {
    const noteId = card.dataset.noteId;
    const noteComments = commentsByNote[noteId] || [];
    if (noteComments.length > 0) {
      // Ваша существующая функция, но теперь она принимает массив комментариев
      applyAnnotationsToCard(card, noteComments);
    }
  });
}

// ---------- Глобальные обработчики ----------
function bindGlobalEvents() {
  document.addEventListener('mouseup', (e) => {
    if (e.target.closest('.floating-comment-btn') || e.target.closest('.custom-context-menu')) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim() !== '') {
      setTimeout(() => showFloatingCommentButton(), 10);
    } else {
      hideFloatingButton();
    }
  });
  
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.floating-comment-btn')) hideFloatingButton();
  });
  
  document.addEventListener('contextmenu', (e) => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim() !== '') {
      const range = selection.getRangeAt(0);
      let card = range.commonAncestorContainer.closest?.('.card');
      if (!card && range.commonAncestorContainer.nodeType === Node.TEXT_NODE) {
        card = range.commonAncestorContainer.parentElement?.closest('.card');
      }
    }
  });
}

// ---------- Полная инициализация модуля ----------
export function initAnnotations() {
  initCommentTooltip();
  initAnnotationTooltips();
  bindGlobalEvents();
  // При каждом рендере карточек нужно заново размечать аннотации.
  // Для этого мы переопределяем window.renderNotes (если не хотим трогать parser.js)
  // или просто вызываем applyAnnotationsToAllCards() после каждого рендера извне.
  // Лучше оставить вызов из parser.js после отрисовки.
}