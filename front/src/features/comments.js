import { getNotes, getComments, saveComments, addComment, updateComment, deleteComment } from '../services/fs-storage.js';

let commentTooltip = null;
let floatingButton = null;
let savedSelectionRange = null;

// Хранилище для связи Range -> Comment (используется для тултипов)
let highlightItems = [];

// Состояние закреплённого тултипа
let isPinned = false;
let pinnedComment = null;

// Режим редактирования
let isEditing = false;

// Последние координаты мыши (для позиционирования)
let lastMouseX = 0;
let lastMouseY = 0;

// ---------- Инициализация тултипа ----------
function createTooltip() {
  if (commentTooltip) return commentTooltip;

  const tooltip = document.createElement('div');
  tooltip.id = 'comment-tooltip';
  tooltip.className = 'comment-tooltip';
  tooltip.style.display = 'none';

  // Текст комментария (отображается по умолчанию)
  const textSpan = document.createElement('span');
  textSpan.className = 'tooltip-text';
  tooltip.appendChild(textSpan);

  // Поле для редактирования (скрыто)
  const editInput = document.createElement('textarea');
  editInput.className = 'tooltip-edit-input';
  editInput.style.display = 'none';
  tooltip.appendChild(editInput);

  // Кнопки редактирования (сохранить / отмена) – скрыты
  const editActions = document.createElement('div');
  editActions.className = 'tooltip-edit-actions';
  editActions.style.display = 'none';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'tooltip-save-btn';
  saveBtn.textContent = 'Сохранить';
  saveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    saveEditComment();
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'tooltip-cancel-btn';
  cancelBtn.textContent = 'Отмена';
  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cancelEditComment();
  });

  editActions.appendChild(saveBtn);
  editActions.appendChild(cancelBtn);
  tooltip.appendChild(editActions);

  // Основные кнопки (редактировать / удалить)
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'tooltip-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'tooltip-edit-btn';
  editBtn.innerHTML = `<img src="media/pencil.png" alt="Редактировать">`;
  editBtn.title = 'Редактировать комментарий';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    editPinnedComment();
  });

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'tooltip-delete-btn';
  deleteBtn.innerHTML = `<img src="media/trash.png" alt="Удалить">`;
  deleteBtn.title = 'Удалить комментарий';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deletePinnedComment();
  });

  actionsDiv.appendChild(editBtn);
  actionsDiv.appendChild(deleteBtn);
  tooltip.appendChild(actionsDiv);

  document.body.appendChild(tooltip);
  commentTooltip = tooltip;
  return tooltip;
}

// ---------- Проверка открытого модального окна ----------
function isModalOpen() {
  const modal = document.querySelector('.modal-overlay');
  return modal && window.getComputedStyle(modal).display !== 'none';
}

// ---------- Инициализация обработчиков наведения и кликов ----------
function initTooltipEvents() {
  const tooltip = createTooltip();

  // ---- Наведение (временный тултип) ----
  document.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    // Если открыто модальное окно или режим редактирования — скрываем тултип
    if (isModalOpen()) {
      if (tooltip.style.display !== 'none') {
        tooltip.style.display = 'none';
        if (isPinned) {
          isPinned = false;
          pinnedComment = null;
          tooltip.classList.remove('pinned');
        }
      }
      return;
    }

    if (isPinned) return; // если закреплён, ничего не меняем

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

    if (foundComment) {
      tooltip.querySelector('.tooltip-text').textContent = foundComment.content;
      tooltip.style.display = 'block';
      positionTooltip(tooltip, x, y);
    } else {
      tooltip.style.display = 'none';
    }
  });

  // ---- Клик (закрепление / открепление) ----
  document.addEventListener('click', (e) => {
    // Если открыто модальное окно — игнорируем
    if (isModalOpen()) return;

    // Если мы в режиме редактирования — игнорируем клики вне тултипа (не закрываем)
    if (isEditing) {
      return;
    }

    const x = e.clientX;
    const y = e.clientY;

    // Если кликнут на сам тултип — ничего не делаем (он остаётся закреплённым)
    if (tooltip.contains(e.target)) {
      return;
    }

    // Проверяем, кликнут ли внутри какого-либо диапазона
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
      // Закрепляем тултип на этом комментарии
      isPinned = true;
      pinnedComment = { comment: clickedComment, range: clickedRange };
      tooltip.querySelector('.tooltip-text').textContent = clickedComment.content;
      tooltip.classList.add('pinned');
      tooltip.style.display = 'block';
      positionTooltip(tooltip, x, y);
    } else {
      // Клик вне выделений и не на тултипе — снимаем закрепление
      if (isPinned) {
        isPinned = false;
        pinnedComment = null;
        tooltip.classList.remove('pinned');
        tooltip.style.display = 'none';
      }
    }
  });

  // При выходе мыши за пределы окна — скрываем временный тултип,
  // но не трогаем закреплённый
  document.addEventListener('mouseleave', () => {
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

// ---------- Режим редактирования (без перерендеринга) ----------

// Вход в режим редактирования
function editPinnedComment() {
  if (!pinnedComment) return;
  const tooltip = createTooltip();
  const textSpan = tooltip.querySelector('.tooltip-text');
  const editInput = tooltip.querySelector('.tooltip-edit-input');
  const editActions = tooltip.querySelector('.tooltip-edit-actions');
  const actionsDiv = tooltip.querySelector('.tooltip-actions');

  // Скрываем текст и основные кнопки
  textSpan.style.display = 'none';
  actionsDiv.style.display = 'none';

  // Показываем поле ввода с текущим текстом
  editInput.value = pinnedComment.comment.content;
  editInput.style.display = 'block';
  editActions.style.display = 'flex';
  editInput.focus();
  isEditing = true;
}

// Сохранение изменений (без перерисовки)
async function saveEditComment() {
  if (!pinnedComment) return;
  const tooltip = createTooltip();
  const editInput = tooltip.querySelector('.tooltip-edit-input');
  const newText = editInput.value.trim();
  if (!newText) {
    alert('Комментарий не может быть пустым');
    return;
  }

  try {
    await updateComment(pinnedComment.comment.id, undefined, undefined, newText);
    
    // Обновляем локальный объект
    pinnedComment.comment.content = newText;
    
    // Обновляем текст в тултипе (в режиме просмотра)
    const textSpan = tooltip.querySelector('.tooltip-text');
    textSpan.textContent = newText;
    
    // Выходим из режима редактирования
    exitEditMode();
    
    // Тултип остаётся закреплённым, показываем обновлённый текст
    tooltip.classList.add('pinned');
    tooltip.style.display = 'block';
    // Обновляем позицию по последним координатам мыши
    positionTooltip(tooltip, lastMouseX, lastMouseY);
    
    showSuccessToast('✅ Комментарий обновлён!', 1500);
  } catch (err) {
    console.error('Ошибка обновления комментария:', err);
    alert('Не удалось обновить комментарий');
  }
}

// Отмена редактирования
function cancelEditComment() {
  exitEditMode();
}

// Выход из режима редактирования
function exitEditMode() {
  const tooltip = createTooltip();
  const textSpan = tooltip.querySelector('.tooltip-text');
  const editInput = tooltip.querySelector('.tooltip-edit-input');
  const editActions = tooltip.querySelector('.tooltip-edit-actions');
  const actionsDiv = tooltip.querySelector('.tooltip-actions');

  // Возвращаем обычный вид
  textSpan.style.display = 'block';
  editInput.style.display = 'none';
  editActions.style.display = 'none';
  actionsDiv.style.display = 'flex';
  isEditing = false;
}

// ---------- Удаление комментария ----------
async function deletePinnedComment() {
  if (!pinnedComment) return;
  if (!confirm('Удалить этот комментарий?')) return;

  try {
    await deleteComment(pinnedComment.comment.id);
    // После удаления перерендериваем все комментарии (так как исчезает диапазон)
    await renderComments();
    // Закрепление сбрасывается внутри renderComments
  } catch (err) {
    console.error('Ошибка удаления комментария:', err);
    alert('Не удалось удалить комментарий');
  }
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

  // Находим текстовый узел и смещения
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
    // После добавления обновляем подсветку
    await renderComments();
  } catch (err) {
    console.error('Ошибка сохранения комментария:', err);
    alert('Не удалось сохранить комментарий');
  }

  savedSelectionRange = null;
}

// ---------- Сбор диапазонов для одной карточки ----------
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
  // Сбрасываем закрепление и режим редактирования
  isPinned = false;
  pinnedComment = null;
  isEditing = false;
  if (commentTooltip) {
    commentTooltip.style.display = 'none';
    commentTooltip.classList.remove('pinned');
  }
  highlightItems = [];

  // Удаляем старый Highlight
  const highlightName = 'comment-highlight';
  if (CSS.highlights.has(highlightName)) {
    CSS.highlights.delete(highlightName);
  }

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
}

// ---------- Полная инициализация модуля ----------
export function initAnnotations() {
  createTooltip();
  initTooltipEvents();
  bindGlobalEvents();
}