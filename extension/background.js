let folderHandle = null;
let notesFileName = 'notes.json';
let categoriesFileName = 'categories.json';
let restorePromise = null;

const DB_NAME = 'NotesExtensionDB';
const STORE_NAME = 'folderHandle';
const DB_VERSION = 1;

let categoriesCache = null;
let categoriesCacheTime = 0;
const CACHE_TTL = 10000;

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

async function saveFolderHandle(handle) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(handle, 'folderHandle');
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function loadFolderHandle() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('folderHandle');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function ensureFolderHandle() {
  if (folderHandle) return folderHandle;
  if (restorePromise) {
    await restorePromise;
    return folderHandle;
  }
  restorePromise = loadFolderHandle();
  folderHandle = await restorePromise;
  restorePromise = null;
  return folderHandle;
}

async function readNotesArray() {
  await ensureFolderHandle();
  if (!folderHandle) throw new Error('Папка не выбрана');

  try {
    const fileHandle = await folderHandle.getFileHandle(notesFileName, { create: false });
    const file = await fileHandle.getFile();
    const content = await file.text();
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err.name === 'NotFoundError') return [];
    throw err;
  }
}

async function writeNotesArray(notesArray) {
  await ensureFolderHandle();
  if (!folderHandle) throw new Error('Папка не выбрана');

  const fileHandle = await folderHandle.getFileHandle(notesFileName, { create: true });
  const writable = await fileHandle.createWritable();
  const content = JSON.stringify(notesArray, null, 2);
  await writable.write(content);
  await writable.close();
}

function formatDateForNote() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

async function addTextNote(noteData) {
  const notes = await readNotesArray();
  const newNote = {
    id: String(Date.now()),
    type: 'text',
    content: noteData.text,
    site: noteData.url || '',
    time: formatDateForNote(),
    category: noteData.category || 'общее'
  };
  notes.push(newNote);
  await writeNotesArray(notes);
  console.log('Текстовая заметка добавлена, категория:', newNote.category);
  return newNote;
}

async function addImageNote(imageData) {
  const notes = await readNotesArray();
  const newNote = {
    id: String(Date.now()),
    type: 'image',
    imageUrl: imageData.imageUrl,
    altText: imageData.altText || '',
    content: imageData.altText || 'Изображение',
    site: imageData.pageUrl || '',
    time: formatDateForNote(),
    category: imageData.category || 'общее'
  };
  notes.push(newNote);
  await writeNotesArray(notes);
  console.log('Картинка сохранена, категория:', newNote.category);
  return newNote;
}

async function readCategoriesArray() {
  await ensureFolderHandle();
  if (!folderHandle) throw new Error('Папка не выбрана');

  try {
    const fileHandle = await folderHandle.getFileHandle(categoriesFileName, { create: false });
    const file = await fileHandle.getFile();
    const content = await file.text();
    const data = JSON.parse(content);

    if (Array.isArray(data)) {
      if (data.length > 0 && typeof data[0] === 'object' && data[0].name) {
        return data.map(item => item.name);
      }
      return data.filter(item => typeof item === 'string');
    }
    return ['общее'];
  } catch (err) {
    if (err.name === 'NotFoundError') return ['общее'];
    throw err;
  }
}

async function getCategories() {
  const now = Date.now();
  if (categoriesCache && (now - categoriesCacheTime) < CACHE_TTL) {
    return categoriesCache;
  }
  try {
    categoriesCache = await readCategoriesArray();
    categoriesCacheTime = now;
    return categoriesCache;
  } catch (err) {
    console.error('Ошибка чтения categories.json:', err);
    return ['общее'];
  }
}

function invalidateCategoriesCache() {
  categoriesCache = null;
  categoriesCacheTime = 0;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      await ensureFolderHandle();

      if (message.type === 'GET_CATEGORIES') {
        const categories = await getCategories();
        sendResponse({ success: true, categories });
        return;
      }

      if (message.type === 'SAVE_LAST_CATEGORY') {
        await chrome.storage.local.set({ lastCategory: message.category });
        sendResponse({ success: true });
        return;
      }

      if (!folderHandle) {
        sendResponse({ success: false, error: 'Folder not selected' });
        return;
      }

      if (message.type === 'SAVE_TEXT') {
        await addTextNote({
          text: message.text,
          url: message.url || sender.tab?.url,
          title: message.title || sender.tab?.title,
          category: message.category || 'общее'
        });
        sendResponse({ success: true });
      } else if (message.type === 'SAVE_IMAGE') {
        await addImageNote({
          imageUrl: message.imageUrl,
          altText: message.altText,
          pageUrl: message.pageUrl,
          pageTitle: message.pageTitle,
          category: message.category || 'общее'
        });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (err) {
      console.error('Ошибка обработки сообщения:', err);
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true;
});

chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (msg) => {
    if (msg.type === 'FOLDER_HANDLE') {
      folderHandle = msg.handle;
      await saveFolderHandle(folderHandle);
      invalidateCategoriesCache();
      console.log('Дескриптор папки получен и сохранён');
      port.postMessage({ type: 'FOLDER_SAVED' });
    }
  });
});

(async () => {
  await ensureFolderHandle();
  if (folderHandle) {
    console.log('Дескриптор папки восстановлен из IndexedDB');
  } else {
    console.log('Папка не выбрана, откройте страницу настроек');
  }
})();