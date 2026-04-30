let folderHandle = null;
let notesFileName = 'notes.json';

const DB_NAME = 'NotesExtensionDB';
const STORE_NAME = 'folderHandle';
const DB_VERSION = 1;

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

async function readNotesArray() {
  if (!folderHandle) throw new Error('Папка не выбрана');
  try {
    const fileHandle = await folderHandle.getFileHandle(notesFileName, { create: false });
    const file = await fileHandle.getFile();
    const content = await file.text();
    return JSON.parse(content);
  } catch (err) {
    if (err.name === 'NotFoundError') return [];
    throw err;
  }
}

async function writeNotesArray(notesArray) {
  if (!folderHandle) throw new Error('Папка не выбрана');
  const fileHandle = await folderHandle.getFileHandle(notesFileName, { create: true });
  const writable = await fileHandle.createWritable();
  const content = JSON.stringify(notesArray, null, 2);
  await writable.write(content);
  await writable.close();
}

async function addNote(noteData) {
  const notes = await readNotesArray();
  const newNote = {
    id: Date.now(),
    content: noteData.text,
    site: noteData.url,
    title: noteData.title,
    savedAt: new Date().toISOString(),
    category: 0
  };
  notes.push(newNote);
  await writeNotesArray(notes);
  console.log('Заметка добавлена, всего заметок:', notes.length);
  return newNote;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BUTTON_CLICKED') {
    if (!folderHandle) {
      sendResponse({ success: false, error: 'Folder not selected' });
      return;
    }
    addNote({
      text: message.selectedText,
      url: message.url || sender.tab?.url,
      title: message.title || sender.tab?.title
    }).then(() => {
      sendResponse({ success: true });
    }).catch(err => {
      console.error('Ошибка сохранения:', err);
      sendResponse({ success: false, error: err.message });
    });
    return true;
  }
  
  if (message.type === 'FOLDER_UPDATED') {
    (async () => {
      folderHandle = await loadFolderHandle();
      console.log('Дескриптор перезагружен после обновления');
      sendResponse({ success: true });
    })();
    return true;
  }
});

(async () => {
  folderHandle = await loadFolderHandle();
  if (folderHandle) {
    console.log('Дескриптор папки восстановлен из IndexedDB');
    try {
      await folderHandle.queryPermission({ mode: 'readwrite' });
    } catch (e) {
      console.warn('Дескриптор недействителен');
      folderHandle = null;
      await saveFolderHandle(null);
    }
  } else {
    console.log('Папка не выбрана');
  }
})();