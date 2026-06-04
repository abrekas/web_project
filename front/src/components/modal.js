export const modal = document.getElementById("universal-modal");
export const modalBody = document.getElementById("modal-body");

let allSystemTags = [];
let selectedFilterTags = [];
let selectedNoteTags = [];
let noteTagsModalNoteId = null;

const escapeHtml = (str) => String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

export function openModal(templateId, additionalClass = "") {
  const template = document.getElementById(templateId);
  modalBody.innerHTML = "";
  modalBody.appendChild(template.content.cloneNode(true));

  const modalContent = modal.querySelector(".modal-content");
  modalContent.className = "modal-content";
  if (additionalClass) modalContent.classList.add(additionalClass);

  modal.style.display = "flex";
}

export function closeModal() {
  modal.style.display = "none";
}

async function loadSystemTags() {
  if (!window.fsStorage?.isReady()) {
    allSystemTags = [];
    return;
  }

  try {
    const tags = await window.fsStorage.getTags();
    allSystemTags = Array.isArray(tags) ? [...tags] : [];
  } catch (e) {
    console.error('Ошибка загрузки тэгов:', e);
    allSystemTags = [];
  }
}

function renderTagButtons(containerId, tags, selectedTags) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!tags.length) {
    container.innerHTML = '<p class="tags-empty-hint">Нет доступных тэгов. Создайте их через кнопку тэгов в шапке.</p>';
    return;
  }

  container.innerHTML = tags.map(tag => {
    const isActive = selectedTags.includes(tag) ? 'active' : '';
    return `<button type="button" class="form-tag-btn ${isActive}" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`;
  }).join('');
}

function renderFormTags() {
  const container = document.getElementById('form-tags-list');
  if (!container) return;

  if (!allSystemTags.length) {
    container.innerHTML = '<p class="tags-empty-hint">Тэгов пока нет — создайте первый выше</p>';
    return;
  }

  container.innerHTML = allSystemTags.map(tag => {
    const isActive = selectedFilterTags.includes(tag) ? 'active' : '';
    return `
      <div class="form-tag-chip ${isActive}">
        <button type="button" class="form-tag-btn" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>
        <button type="button" class="form-tag-delete" data-tag="${escapeHtml(tag)}" aria-label="Удалить тэг ${escapeHtml(tag)}">×</button>
      </div>
    `;
  }).join('');
}

function renderNoteTagsList(availableTags) {
  renderTagButtons('note-tags-list', availableTags, selectedNoteTags);
}

function updateTagsBtnState() {
  const btn = document.getElementById('tags-btn');
  if (!btn) return;
  const active = window.getActiveTagFilter?.().length > 0;
  btn.classList.toggle('filter-active', active);
}

async function openTagsFilterModal() {
  if (!window.fsStorage?.isReady()) {
    alert('Сначала разрешите доступ к папке');
    return;
  }

  selectedFilterTags = [...(window.getActiveTagFilter?.() || [])];
  await loadSystemTags();

  openModal("modal-choose-tags-template", "create-note-modal");
  renderFormTags();
  updateTagsBtnState();
}

export async function openNoteTagsModal(noteId) {
  if (!window.fsStorage?.isReady()) {
    alert('Сначала разрешите доступ к папке');
    return;
  }

  const available = window.getAvailableTagsForNote?.(noteId) || [];
  if (!available.length) {
    alert('Нет доступных тэгов. Создайте их через кнопку тэгов в шапке.');
    return;
  }

  noteTagsModalNoteId = noteId;
  selectedNoteTags = [];

  openModal('modal-note-tags-template', 'create-note-modal');
  renderNoteTagsList(available);
}

document.getElementById("tags-btn")?.addEventListener("click", () => {
  void openTagsFilterModal();
});

modalBody.addEventListener('click', (e) => {
  const deleteTagBtn = e.target.closest('.form-tag-delete');
  if (deleteTagBtn && document.getElementById('form-tags-list')) {
    void (async () => {
      const tag = deleteTagBtn.dataset.tag;
      if (!tag) return;

      if (!confirm(`Удалить тэг «${tag}»? Он будет убран из всех заметок.`)) return;

      if (!window.fsStorage?.isReady()) {
        alert('Сначала разрешите доступ к папке');
        return;
      }

      const ok = await window.fsStorage.deleteTag(tag);
      if (!ok) {
        alert('Не удалось удалить тэг');
        return;
      }

      allSystemTags = allSystemTags.filter(t => t !== tag);
      selectedFilterTags = selectedFilterTags.filter(t => t !== tag);
      window.setActiveTagFilter?.([...selectedFilterTags]);

      renderFormTags();
      await window.loadTagsForPicker?.();
      await window.refreshNotes?.();
    })();
    return;
  }

  const tagBtn = e.target.closest('.form-tag-btn');
  if (tagBtn) {
    const tag = tagBtn.dataset.tag;
    const isNoteModal = !!document.getElementById('note-tags-list');

    if (isNoteModal) {
      if (selectedNoteTags.includes(tag)) {
        selectedNoteTags = selectedNoteTags.filter(t => t !== tag);
        tagBtn.classList.remove('active');
      } else {
        selectedNoteTags.push(tag);
        tagBtn.classList.add('active');
      }
    } else {
      if (selectedFilterTags.includes(tag)) {
        selectedFilterTags = selectedFilterTags.filter(t => t !== tag);
      } else {
        selectedFilterTags.push(tag);
      }
      renderFormTags();
    }
    return;
  }

  if (e.target.closest('#apply-note-tags-btn')) {
    void (async () => {
      if (!noteTagsModalNoteId || !selectedNoteTags.length) {
        closeModal();
        return;
      }
      await window.appendTagsToNote?.(noteTagsModalNoteId, selectedNoteTags);
      noteTagsModalNoteId = null;
      selectedNoteTags = [];
      closeModal();
    })();
    return;
  }

  if (e.target.closest('#close-note-tags-btn')) {
    noteTagsModalNoteId = null;
    selectedNoteTags = [];
    closeModal();
    return;
  }

  if (e.target.closest('#add-tag-form-btn')) {
    void (async () => {
      const input = document.getElementById('new-tag-input');
      const tagText = input?.value.trim().toLowerCase();

      if (!tagText) return;

      if (!window.fsStorage?.isReady()) {
        alert('Сначала разрешите доступ к папке');
        return;
      }

      const added = await window.fsStorage.addTag(tagText);
      if (!added && !allSystemTags.includes(tagText)) {
        alert('Такой тэг уже существует');
        return;
      }

      const tag = added || tagText;
      if (!allSystemTags.includes(tag)) {
        allSystemTags.push(tag);
        allSystemTags.sort((a, b) => a.localeCompare(b, 'ru'));
      }

      if (!selectedFilterTags.includes(tag)) {
        selectedFilterTags.push(tag);
      }

      if (input) input.value = '';
      renderFormTags();
      await window.loadTagsForPicker?.();
    })();
    return;
  }

  if (e.target.closest('#apply-tags-filter-btn')) {
    window.setActiveTagFilter?.(selectedFilterTags);
    updateTagsBtnState();
    closeModal();
    return;
  }

  if (e.target.closest('#clear-tags-filter-btn')) {
    selectedFilterTags = [];
    window.setActiveTagFilter?.([]);
    renderFormTags();
    updateTagsBtnState();
    return;
  }

  if (e.target.closest('#close-tags-modal-btn')) {
    closeModal();
  }
});

document.getElementById("about-btn")?.addEventListener("click", () => {
  openModal("modal-about-template");
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.style.display === "flex") closeModal();
});

window.updateTagsBtnState = updateTagsBtnState;
window.openNoteTagsModal = openNoteTagsModal;
