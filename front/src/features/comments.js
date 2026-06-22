import { getNotes, getComments, saveComments, addComment, updateComment, deleteComment } from '../services/fs-storage.js';

let commentTooltip = null;
let floatingButton = null;
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
  // ВАЖНО: при использовании CSS Highlight API у нас нет элементов с классом .commented-text,
  // поэтому тултипы нужно показывать по-другому – например, по клику или при наведении на подсвеченную область.
  // Для простоты оставим пока без тултипов, либо позже реализуем через position: absolute.
  // Но если вы хотите сохранить прежний механизм, нужно искать элементы с классом .highlight, но мы не создаём span'ы.
  // Рекомендую переделать тултипы на отображение при клике или с помощью собственных событий.
  // Пока оставим заглушку.
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
    // Ищем первый текстовый узел внутри .card-body (или .note-text-content)
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

// ---------- Применение аннотаций через CSS Custom Highlight API ----------
function applyAnnotationsToCard(card, comments) {
  // const highlightName = 'comment-highlight'; // статичное имя
  const noteId = card.getAttribute('data-note-id');
  // Удаляем старый highlight для этой заметки, если есть
  const highlightName = 'comment-highlight';
  if (CSS.highlights.has(highlightName)) {
    CSS.highlights.delete(highlightName);
  }

  // Находим контейнер с текстом
  const textContainer = card.querySelector('.note-text-content') || card.querySelector('.card-body');
  if (!textContainer) return;
  console.log(textContainer);

  // Получаем текстовые узлы внутри контейнера (может быть несколько, но мы будем искать по всему тексту)
  // Чтобы найти позиции start/end, нам нужно получить полный текст без разметки.
  // Так как внутри могут быть другие элементы (картинки, код), лучше работать с .note-text-content,
  // но для простоты предполагаем, что весь текст находится в одном текстовом узле.
  // Однако, если внутри есть дочерние элементы, проще взять textContent и найти нужный текстовый узел.
  // Для корректной работы с Range мы должны найти текстовый узел, соответствующий каждому смещению.
  // Простейший способ: найти первый текстовый узел в контейнере и использовать его для всех диапазонов,
  // предполагая, что все комментарии относятся к одному текстовому блоку.
  // Если у вас текст может быть разбит по разным узлам, то нужно более сложное решение (например, итератор по текстовым узлам).
  // Для демонстрации ограничимся одним текстовым узлом.
  
  const walker = document.createTreeWalker(textContainer, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }
  
  if (textNodes.length === 0) return;

  // Если несколько текстовых узлов, мы объединим весь текст в один строковый буфер и будем искать смещения.
  // Но Range может быть создан только на конкретном текстовом узле. Поэтому нужно преобразовать глобальные смещения
  // в локальные для каждого узла. Для упрощения примера будем считать, что весь текст находится в первом текстовом узле.
  // Если у вас могут быть вложенные элементы, лучше использовать более продвинутый подход (см. примечание ниже).
  // Для большинства заметок (текстовых) подойдёт использование первого текстового узла.
  
  const mainTextNode = textNodes[0];
  const fullText = mainTextNode.textContent;

  const ranges = [];

  comments.forEach(comment => {
    // Проверяем, что start/end не выходят за границы
    if (comment.start < 0 || comment.end > fullText.length || comment.start >= comment.end) return;
    
    const range = new Range();
    range.setStart(mainTextNode, comment.start);
    range.setEnd(mainTextNode, comment.end);
    ranges.push(range);
  });

  if (ranges.length === 0) return;

  // Создаём Highlight и регистрируем
  const highlight = new Highlight(...ranges);
  console.log(highlight);
  CSS.highlights.set(highlightName, highlight);
}

// ---------- Основная функция рендера комментариев ----------
export async function renderComments() {
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

  // Собираем все диапазоны
  const allRanges = [];
  cards.forEach(card => {
    const noteId = card.dataset.noteId;
    const noteComments = commentsByNote[noteId] || [];
    if (noteComments.length > 0) {
      const ranges = getRangesForCard(card, noteComments);
      allRanges.push(...ranges);
    }
  });

  // Удаляем старый highlight (если есть)
  const highlightName = 'comment-highlight';
  if (CSS.highlights.has(highlightName)) {
    CSS.highlights.delete(highlightName);
  }

  // Создаём новый Highlight со всеми диапазонами
  if (allRanges.length > 0) {
    const highlight = new Highlight(...allRanges);
    CSS.highlights.set(highlightName, highlight);
  }
}

function getRangesForCard(card, comments) {
  const textContainer = card.querySelector('.note-text-content') || card.querySelector('.card-body');
  if (!textContainer) return [];

  const walker = document.createTreeWalker(textContainer, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }
  if (textNodes.length === 0) return [];

  const mainTextNode = textNodes[0];
  const fullText = mainTextNode.textContent;

  const ranges = [];
  comments.forEach(comment => {
    if (comment.start < 0 || comment.end > fullText.length || comment.start >= comment.end) return;
    const range = new Range();
    range.setStart(mainTextNode, comment.start);
    range.setEnd(mainTextNode, comment.end);
    ranges.push(range);
  });
  return ranges;
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
  initCommentTooltip();
  // initAnnotationTooltips(); // пока отключаем, т.к. нет элементов
  bindGlobalEvents();
  // При инициализации можно сразу отрендерить комментарии, но лучше вызывать извне после рендера карточек
}