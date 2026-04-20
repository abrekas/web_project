(() => {
  const DB_NAME = 'HighliterDB';
  const STORE_NAME = 'appStore';
  const DB_VERSION = 1;

  const NOTES_FILE = 'notes.json';
  const CATEGORIES_FILE = 'categories.json';

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

  // ---------------- Folder init ----------------
  async function chooseFolderByUser() {
    if (!window.showDirectoryPicker) {
      throw new Error('Браузер не поддерживает File System Access API');
    }

    const handle = await window.showDirectoryPicker();
    const ok = await verifyPermission(handle, 'readwrite');

    if (!ok) {
      throw new Error('Доступ к папке не был предоставлен');
    }

    folderHandle = handle;
    await dbSet('dataFolderHandle', handle);

    await ensureFileExists(NOTES_FILE, []);
    await ensureFileExists(CATEGORIES_FILE, []);

    hideStartupOverlay();
    return handle;
  }

  async function restoreFolder() {
  const saved = await dbGet('dataFolderHandle');
  if (!saved) {
    showStartupOverlay();
    return null;
  }

  try {
    const ok = await verifyPermission(saved, 'readwrite');
    if (!ok) {
      showStartupOverlay('Нужно заново разрешить доступ к папке.');
      return null;
    }

    folderHandle = saved;
    await ensureFileExists(NOTES_FILE, []);
    await ensureFileExists(CATEGORIES_FILE, []);
    hideStartupOverlay();

    window.dispatchEvent(new CustomEvent('fs-ready')); // ВАЖНО

    return saved;
  } catch (e) {
    showStartupOverlay('Не удалось восстановить доступ к папке.');
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
  async function getNotes() {
    return await readJsonFile(NOTES_FILE, []);
  }

  async function saveNotes(notesArray) {
    await writeJsonFile(NOTES_FILE, notesArray);
  }

  async function addNote(note) {
    const notes = await getNotes();

    const newNote = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      category: note.category || 'общее',
      site: note.site || '',
      content: note.content || '',
      time: note.time || new Date().toLocaleString('ru-RU')
    };

    notes.unshift(newNote);
    await saveNotes(notes);
    return newNote;
  }

  async function updateNote(updatedNote) {
    const notes = await getNotes();
    const index = notes.findIndex(n => n.id === updatedNote.id);
    if (index === -1) throw new Error('Заметка не найдена');

    notes[index] = { ...notes[index], ...updatedNote };
    await saveNotes(notes);
    return notes[index];
  }

  async function deleteNote(noteId) {
    const notes = await getNotes();
    const filtered = notes.filter(n => n.id !== noteId);
    await saveNotes(filtered);
  }

  // ---------------- Categories API ----------------
  async function getCategories() {
    console.log('hjsdbhj')
    return await readJsonFile(CATEGORIES_FILE, []);
  }

  async function saveCategories(categories) {
    await writeJsonFile(CATEGORIES_FILE, categories);
  }

  async function addCategory(categoryName) {
    const value = String(categoryName || '').trim();
    if (!value) return null;

    const list = await getCategories();
    const exists = list.some(item => String(item).toLowerCase() === value.toLowerCase());

    if (exists) return null;

    list.push(value);
    await saveCategories(list);
    return value;
  }

  async function deleteCategory(categoryName) {
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

  // ---------------- Events ----------------
  window.addEventListener('DOMContentLoaded', () => {
    const grantBtn = document.getElementById('grant-access-btn');
    const cancelBtn = document.getElementById('startup-cancel-btn');
    const err = document.getElementById('startup-error');

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
  });

  // ---------------- Public API ----------------
  window.fsStorage = {
    restoreFolder,
    chooseFolderByUser,

    getNotes,
    saveNotes,
    addNote,
    updateNote,
    deleteNote,

    getCategories,
    saveCategories,
    addCategory,
    deleteCategory,

    isReady: () => !!folderHandle
  };
})();
