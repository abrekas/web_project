// Этот код выполняется при установке расширения или запуске браузера
chrome.runtime.onInstalled.addListener(() => {
  // Создаем пункт в контекстном меню для выделенного текста
  chrome.contextMenus.create({
    id: "my-custom-action",
    title: 'Сделать "aboba" с выделенным: "%s"', // %s подставит выделенный текст
    contexts: ["selection"] // Пункт будет появляться только когда что-то выделено
  });
});

// Слушаем клик по нашему пункту меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Проверяем, что кликнули по нашему пункту
  if (info.menuItemId === "my-custom-action") {
    // Отправляем сообщение в контент-скрипт активной вкладки
    chrome.tabs.sendMessage(tab.id, { action: "logAboba", selection: info.selectionText });
  }
});