
// Слушаем сообщения от background-скрипта
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "logAboba") {
    console.log("aboba"); // Выводим "aboba" в консоль веб-страницы
    alert(`Вы выделили текст: "${request.selection}"`); // Показываем уведомление
    // Здесь вы можете выполнить любой другой код, который должен работать на странице
  }
});