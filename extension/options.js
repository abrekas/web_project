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

document.getElementById('selectFolderBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  
  if (!window.showDirectoryPicker) {
    statusDiv.textContent = '❌ Ваш браузер не поддерживает File System Access API.';
    statusDiv.className = 'error';
    return;
  }
  
  try {
    const folderHandle = await window.showDirectoryPicker();
    const permission = await folderHandle.requestPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      throw new Error('Необходимо разрешение на чтение и запись');
    }
    
    await saveFolderHandle(folderHandle);
    
    statusDiv.textContent = 'Папка успешно выбрана! Теперь можно выделять текст и сохранять заметки.';
    statusDiv.className = 'success';
    
    chrome.runtime.sendMessage({ type: 'FOLDER_UPDATED' }).catch(() => {});
    
  } catch (err) {
    if (err.name !== 'AbortError') {
      statusDiv.textContent = `Ошибка: ${err.message}`;
      statusDiv.className = 'error';
      console.error(err);
    }
  }
});