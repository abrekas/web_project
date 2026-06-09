  const DB_NAME = 'HighliterDB';
  const STORE_NAME = 'appStore';
  const DB_VERSION = 1;

  const NOTES_FILE = 'notes.json';
  const CATEGORIES_FILE = 'categories.json';
  const TAGS_FILE = 'tags.json';

  let folderHandle = null;

  // ---------------- IndexedDB ----------------
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function dbSet(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function dbGet(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  // ---------------- Permission ----------------
  async function verifyPermission(handle, mode = 'readwrite') {
    const opts = { mode };

    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if ((await handle.requestPermission(opts)) === 'granted') return true;

    return false;
  }

  // ---------------- Startup overlay ----------------
  function showStartupOverlay(message = '') {
    const overlay = document.getElementById('startup-overlay');
    const err = document.getElementById('startup-error');
    if (err) err.textContent = message || '';
    if (overlay) overlay.classList.add('show');
  }

  function hideStartupOverlay() {
    const overlay = document.getElementById('startup-overlay');
    if (overlay) overlay.classList.remove('show');
}
  
let isFsReady = false;

export function isReady() {
  return isFsReady && !!folderHandle;
}

  // ---------------- Folder init ----------------
  export async function chooseFolderByUser() {
    if (!window.showDirectoryPicker) {
      throw new Error('Браузер не поддерживает File System Access API');
    }

    const handle = await window.showDirectoryPicker();
    const ok = await verifyPermission(handle, 'readwrite');

    if (!ok) {
      throw new Error('Доступ к папке не был предоставлен');
    }

    folderHandle = handle;
    isFsReady = true;
    await dbSet('dataFolderHandle', handle);

    await ensureFileExists(NOTES_FILE, []);
    await ensureFileExists(CATEGORIES_FILE, []);
    await ensureFileExists(TAGS_FILE, []);

    hideStartupOverlay();
    return handle;
  }

  export async function restoreFolder() {
  const saved = await dbGet('dataFolderHandle');
  if (!saved) {
    showStartupOverlay();
    isFsReady = false;
    return null;
  }

  try {
    const ok = await verifyPermission(saved, 'readwrite');
    if (!ok) {
      showStartupOverlay('Нужно заново разрешить доступ к папке.');
      isFsReady = false;
      return null;
    }

    folderHandle = saved;
    await ensureFileExists(NOTES_FILE, []);
    await ensureFileExists(CATEGORIES_FILE, []);
    await ensureFileExists(TAGS_FILE, []);
    hideStartupOverlay();

    isFsReady = true; 
    window.dispatchEvent(new CustomEvent('fs-ready')); // ВАЖНО

    return saved;
  } catch (e) {
    showStartupOverlay('Не удалось восстановить доступ к папке.');
    isFsReady = false;
    return null;
  }
}


  // ---------------- File helpers ----------------
  async function getFileHandle(fileName, create = true) {
    if (!folderHandle) throw new Error('Папка не выбрана');
    return await folderHandle.getFileHandle(fileName, { create });
  }

  async function ensureFileExists(fileName, defaultData) {
    const fileHandle = await getFileHandle(fileName, true);
    const file = await fileHandle.getFile();

    if (file.size === 0) {
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(defaultData, null, 2));
      await writable.close();
    }
  }

  async function readJsonFile(fileName, fallback = []) {
    const fileHandle = await getFileHandle(fileName, true);
    const file = await fileHandle.getFile();
    const text = await file.text();

    if (!text.trim()) {
      await writeJsonFile(fileName, fallback);
      return fallback;
    }

    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  }

  async function writeJsonFile(fileName, data) {
    const fileHandle = await getFileHandle(fileName, true);
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  }

  // ---------------- Notes API ----------------
  export async function getNotes() {
    return await readJsonFile(NOTES_FILE, []);
  }

  export async function saveNotes(notesArray) {
    await writeJsonFile(NOTES_FILE, notesArray);
  }

  export async function addNote(note) {
    const notes = await getNotes();
    const nowIso = new Date().toISOString();

    const newNote = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      type: note.type || 'text',
      content: note.type === 'text' ? (note.content || '') : null,
      imageUrl: note.type === 'image' ? (note.imageUrl || null) : null,
      category: note.category || 'общее',
      tags: note.tags || [],
      site: note.site || '',
      time: note.time || new Date().toLocaleString('ru-RU'),
      savedAt: note.savedAt || nowIso
    };

    notes.unshift(newNote);
    await saveNotes(notes);
    return newNote;
  }

  export async function updateNote(updatedNote) {
    const notes = await getNotes();
    const index = notes.findIndex(n => n.id === updatedNote.id);
    if (index === -1) throw new Error('Заметка не найдена');

    notes[index] = { ...notes[index], ...updatedNote };
    await saveNotes(notes);
    return notes[index];
  }

  export async function deleteNote(noteId) {
    const notes = await getNotes();
    const filtered = notes.filter(n => String(n.id) !== noteId);
    await saveNotes(filtered);
    return filtered;
  }
  
  function parseNoteDate(note) {
    if (!note) return new Date(0);

    if (note.time) {
      const [datePart, timePart] = note.time.split(' ');
      const [day, month, year] = datePart.split('.').map(Number);
      const [hours, minutes] = timePart.split(':').map(Number);
      const utcTimestamp = Date.UTC(year, month - 1, day, hours, minutes);
      return new Date(utcTimestamp);
    }

    return new Date(0);
  }

  export async function sortNotes(parameter, order = 'asc') {
    const notes = await getNotes();
    const dir = order === 'desc' ? -1 : 1;
    switch (parameter) {
      case "byDate":
        notes.sort((a, b) => (parseNoteDate(a) - parseNoteDate(b)) * dir);
        break;
      case "bySite":
        notes.sort((a, b) => (String(a.site || '').localeCompare(String(b.site || ''))) * dir);
        break;
      default:
        notes.sort((a, b) => (parseNoteDate(a) - parseNoteDate(b)) * dir);
        break;
    }
    await saveNotes(notes);
    return notes;
  }

  // ---------------- Categories API ----------------
  export async function getCategories() {
    return await readJsonFile(CATEGORIES_FILE, []);
  }

export async function saveCategories(categories) {
    await writeJsonFile(CATEGORIES_FILE, categories);
  }

export async function addCategory(categoryName) {
    const value = String(categoryName || '').trim();
    if (!value) return null;

    const list = await getCategories();
    const exists = list.some(item => String(item).toLowerCase() === value.toLowerCase());

    if (exists) return null;

    list.push(value);
    await saveCategories(list);
    return value;
  }

export async function deleteCategory(categoryName) {
    const value = String(categoryName || '').trim();
    if (!value) return false;
    if (value.toLowerCase() === 'общее') return false;

    const list = await getCategories();
    const idx = list.findIndex(item => String(item).toLowerCase() === value.toLowerCase());
    if (idx === -1) return false;

    list.splice(idx, 1);
    await saveCategories(list);

    const notes = await getNotes();
    let changed = false;
    const updated = notes.map(n => {
      if ((n.category || '').toLowerCase() === value.toLowerCase()) {
        changed = true;
        return { ...n, category: 'общее' };
      }
      return n;
    });

    if (changed) await saveNotes(updated);
    return true;
  }

  // ---------------- Tags API ----------------
export async function getTags() {
    return await readJsonFile(TAGS_FILE, []);
  }

export async function saveTags(tags) {
    await writeJsonFile(TAGS_FILE, tags);
  }

export async function addTag(tagName) {
    const value = String(tagName || '').trim().toLowerCase();
    if (!value) return null;

    const list = await getTags();
    const exists = list.some(item => String(item).toLowerCase() === value);

    if (exists) return null;

    list.push(value);
    await saveTags(list);
    return value;
  }

export async function deleteTag(tagName) {
    const value = String(tagName || '').trim().toLowerCase();
    if (!value) return false;

    const list = await getTags();
    const idx = list.findIndex(item => String(item).toLowerCase() === value);
    if (idx === -1) return false;

    list.splice(idx, 1);
    await saveTags(list);

    const notes = await getNotes();
    let changed = false;
    const updated = notes.map(n => {
      const tags = Array.isArray(n.tags) ? n.tags : [];
      const filtered = tags.filter(t => String(t).toLowerCase() !== value);
      if (filtered.length !== tags.length) {
        changed = true;
        return { ...n, tags: filtered };
      }
      return n;
    });

    if (changed) await saveNotes(updated);
    return true;
  }

  // ---------------- Events ----------------
  export function initFsStorage() {
    const grantBtn = document.getElementById('grant-access-btn');
    const cancelBtn = document.getElementById('startup-cancel-btn');
    const err = document.getElementById('startup-error');
    const helpBtn = document.getElementById('help-btn');

    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        showStartupOverlay();
      });
    }

    if (grantBtn) {
      grantBtn.addEventListener('click', async () => {
        try {
          if (err) err.textContent = '';
          await chooseFolderByUser();
          window.dispatchEvent(new CustomEvent('fs-ready'));
        } catch (e) {
          if (err) err.textContent = e.message || 'Не удалось получить доступ к папке';
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        hideStartupOverlay();
      });
    }
  }

  window.addEventListener('DOMContentLoaded', initFsStorage);

  export const fsStorage = {
    restoreFolder,
    chooseFolderByUser,
    getNotes,
    saveNotes,
    addNote,
    updateNote,
    deleteNote,
    sortNotes,
    getCategories,
    saveCategories,
    addCategory,
    deleteCategory,
    getTags,
    saveTags,
    addTag,
    deleteTag,
    isReady
  };
