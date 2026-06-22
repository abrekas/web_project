import { getNotes, getComments, saveComments, addComment, updateComment, deleteComment } from '../services/fs-storage.js';

let commentTooltip = null;
let floatingButton = null;
let savedSelectionRange = null;

// Хранилище для связи Range -> Comment (используется для тултипов)
let highlightItems = [];

// Состояние закреплённого тултипа
let isPinned = false;
let pinnedComment = null;

// ---------- Инициализация тултипа ----------
function createTooltip() {
  if (commentTooltip) return commentTooltip;
  const tooltip = document.createElement('div');
  tooltip.id = 'comment-tooltip';
  tooltip.style.cssText = `
    position: fixed;
    background: #333;
    color: #fff;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 13px;
    pointer-events: auto;
    display: none;
    z-index: 10000;
    max-width: 300px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: default;
  `;
  document.body.appendChild(tooltip);
  commentTooltip = tooltip;
  return tooltip;
}

// ---------- Инициализация обработчиков наведения и кликов ----------
function initTooltipEvents() {
  const tooltip = createTooltip();

  // ---- Наведение (временный тултип и курсор) ----
  document.addEventListener('mousemove', (e) => {
    const x = e.clientX;
    const y = e.clientY;

    let foundComment = null;

    for (let item of highlightItems) {
      const rects = item.range.getClientRects();
      for (let rect of rects) {
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          foundComment = item.comment;
          break;
        }
      }
      if (foundComment) break;
    }

    // Меняем курсор всегда
    if (foundComment) {
      document.body.style.cursor = 'pointer';
    } else {
      document.body.style.cursor = '';
    }

    // Тултип показываем только если не закреплён
    if (!isPinned) {
      if (foundComment) {
        tooltip.textContent = foundComment.content;
        tooltip.style.display = 'block';
        positionTooltip(tooltip, x, y);
      } else {
        tooltip.style.display = 'none';
      }
    }
  });

  // ---- Клик (закрепление / открепление) ----
  document.addEventListener('click', (e) => {
    const x = e.clientX;
    const y = e.clientY;

    if (tooltip.contains(e.target)) {
      return;
    }

    let clickedComment = null;
    let clickedRange = null;

    for (let item of highlightItems) {
      const rects = item.range.getClientRects();
      for (let rect of rects) {
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          clickedComment = item.comment;
          clickedRange = item.range;
          break;
        }
      }
      if (clickedComment) break;
    }

    if (clickedComment) {
      isPinned = true;
      pinnedComment = { comment: clickedComment, range: clickedRange };
      tooltip.textContent = clickedComment.content;
      tooltip.style.display = 'block';
      positionTooltip(tooltip, x, y);
      // При закреплении курсор остаётся pointer, если мышь над выделением (уже установлено)
    } else {
      if (isPinned) {
        isPinned = false;
        pinnedComment = null;
        tooltip.style.display = 'none';
        // Сбрасываем курсор, если мышь не над выделением (будет установлен снова при движении)
        document.body.style.cursor = '';
      }
    }
  });

  document.addEventListener('mouseleave', () => {
    // Сбрасываем курсор при выходе из окна
    document.body.style.cursor = '';
    if (!isPinned && tooltip) {
      tooltip.style.display = 'none';
    }
  });
}

// Вспомогательная функция для позиционирования тултипа
function positionTooltip(tooltip, x, y) {
  let left = x + 12;
  let top = y + 12;

  const tooltipRect = tooltip.getBoundingClientRect();
  if (left + tooltipRect.width > window.innerWidth) {
    left = x - tooltipRect.width - 12;
  }
  if (top + tooltipRect.height > window.innerHeight) {
    top = y - tooltipRect.height - 12;
  }
  left = Math.max(5, left);
  top = Math.max(5, top);

  tooltip.style.left = left + 'px';
  tooltip.style.top = top + 'px';
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

function showSuccessToast(message = '💬 Комментарий добавлен!', duration = 2000) {
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

// ---------- Добавление комментария ----------
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
  let allComments;
  try {
    allComments = await getComments();
  } catch {
    alert('Не удалось загрузить комментарии');
    return;
  }

  let textNode = range.startContainer;
  let startOffset, endOffset;

  if (textNode.nodeType !== Node.TEXT_NODE) {
    const container = card.querySelector('.note-text-content') || card.querySelector('.card-body');
    if (!container) {
      alert('Не удалось найти текст в заметке');
      savedSelectionRange = null;
      return;
    }
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
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
    await addComment(noteId, startOffset, endOffset, commentText.trim());
    hideFloatingButton();
    showSuccessToast('💬 Комментарий добавлен!');
    await renderComments();
  } catch (err) {
    console.error('Ошибка сохранения комментария:', err);
    alert('Не удалось сохранить комментарий');
  }

  savedSelectionRange = null;
}

// ---------- Сбор диапазонов для одной карточки (без создания Highlight) ----------
function collectRangesForCard(card, comments, allRanges) {
  const textContainer = card.querySelector('.note-text-content') || card.querySelector('.card-body');
  if (!textContainer) return;

  const walker = document.createTreeWalker(textContainer, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }
  if (textNodes.length === 0) return;

  const mainTextNode = textNodes[0];
  const fullText = mainTextNode.textContent;

  comments.forEach(comment => {
    if (comment.start < 0 || comment.end > fullText.length || comment.start >= comment.end) return;
    const range = new Range();
    range.setStart(mainTextNode, comment.start);
    range.setEnd(mainTextNode, comment.end);
    allRanges.push(range);
    highlightItems.push({ range, comment });
  });
}

// ---------- Основная функция рендера комментариев ----------
export async function renderComments() {
  // Сбрасываем закрепление и очищаем старые диапазоны
  isPinned = false;
  pinnedComment = null;
  if (commentTooltip) commentTooltip.style.display = 'none';
  highlightItems = [];
  document.body.style.cursor = ''; // сброс курсора

  const highlightName = 'comment-highlight';
  if (CSS.highlights.has(highlightName)) {
    CSS.highlights.delete(highlightName);
  }

  const [notes, comments] = await Promise.all([getNotes(), getComments()]);
  const cards = document.querySelectorAll('.card');

  const commentsByNote = {};
  comments.forEach(comment => {
    if (!commentsByNote[comment.noteId]) {
      commentsByNote[comment.noteId] = [];
    }
    commentsByNote[comment.noteId].push(comment);
  });

  const allRanges = [];

  cards.forEach(card => {
    const noteId = card.dataset.noteId;
    const noteComments = commentsByNote[noteId] || [];
    if (noteComments.length > 0) {
      collectRangesForCard(card, noteComments, allRanges);
    }
  });

  if (allRanges.length > 0) {
    const highlight = new Highlight(...allRanges);
    CSS.highlights.set(highlightName, highlight);
  }
}

// ---------- Редактирование комментария (по клику на закреплённый тултип) ----------
async function editPinnedComment() {
  if (!pinnedComment) return;
  const newText = prompt('Редактировать комментарий:', pinnedComment.comment.content);
  if (newText === null || newText.trim() === '') return;

  try {
    await updateComment(pinnedComment.comment.id, undefined, undefined, newText.trim());
    await renderComments();
    const tooltip = createTooltip();
    tooltip.textContent = newText.trim();
    tooltip.style.display = 'block';
    isPinned = true;
    pinnedComment.comment.content = newText.trim();
  } catch (err) {
    console.error('Ошибка обновления комментария:', err);
    alert('Не удалось обновить комментарий');
  }
}

// ---------- Удаление комментария (по клику на закреплённый тултип) ----------
async function deletePinnedComment() {
  if (!pinnedComment) return;
  if (!confirm('Удалить этот комментарий?')) return;

  try {
    await deleteComment(pinnedComment.comment.id);
    isPinned = false;
    pinnedComment = null;
    if (commentTooltip) commentTooltip.style.display = 'none';
    await renderComments();
  } catch (err) {
    console.error('Ошибка удаления комментария:', err);
    alert('Не удалось удалить комментарий');
  }
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

  document.addEventListener('dblclick', (e) => {
    if (e.target.closest('#comment-tooltip')) {
      editPinnedComment();
    }
  });

  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('#comment-tooltip')) {
      e.preventDefault();
      deletePinnedComment();
    }
  });
}

// ---------- Полная инициализация модуля ----------
export function initAnnotations() {
  createTooltip();
  initTooltipEvents();
  bindGlobalEvents();
}