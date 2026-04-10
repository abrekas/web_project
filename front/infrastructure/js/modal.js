const aboutBtn = document.getElementById('about-btn');
const colorBtn = document.getElementById('color-btn');
const searchBtn = document.getElementById('search-btn');
const modal = document.getElementById('universal-modal');
const modalBody = document.getElementById('modal-body');

let aboutInnerHTML = '<h3>О сайте</h3><p>Highliter.com — ваш помощник в работе с заметками.</p>';
let colorInnerHTML = '<h3>Выбор цвета</h3><p>Выберите одну из тем</p>';
let searchInnerHTML = `
<div class="search-container">
  <!-- Поле поиска -->
  <header class="search-header">
    <div class="search-wrapper">
  <input type="text" placeholder="введите фразу или слово" class="search-input">
  <button type="submit" class="search-button">
    <!-- Иконка лупы (можно использовать SVG или шрифт) -->
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  </button>
</div>

  </header>

  <main class="search-results">

    <article class="result-card">
      <div class="result-content">
          <span class="highlight">Градиентный спуск - это способ обучения и совершенствования модели машинного обучения. Он делает это, постоянно пытаясь лучше предсказать правильный ответ, корректируя свое "мышление". Для этого используется математическая формула, чтобы ...
      </div>
      <footer class="result-footer">
        <span class="category">стажировка</span>
        <time datetime="2026-05-30T18:10">18:10 30.05.2026</time>
      </footer>
    </article>
    
    <article class="result-card">
      <div class="result-content">
          <span class="highlight">Градиентный спуск - это способ обучения и совершенствования модели машинного обучения. Он делает это, постоянно пытаясь лучше предсказать правильный ответ, корректируя свое "мышление". Для этого используется математическая формула, чтобы ...
      </div>
      <footer class="result-footer">
        <span class="category">стажировка</span>
        <time datetime="2026-05-30T18:10">18:10 30.05.2026</time>
      </footer>
    </article>

    <article class="result-card">
      <div class="result-content">
          <span class="highlight">Градиентный спуск - это способ обучения и совершенствования модели машинного обучения. Он делает это, постоянно пытаясь лучше предсказать правильный ответ, корректируя свое "мышление". Для этого используется математическая формула, чтобы ...
      </div>
      <footer class="result-footer">
        <span class="category">стажировка</span>
        <time datetime="2026-05-30T18:10">18:10 30.05.2026</time>
      </footer>
    </article>

    <article class="result-card">
      <div class="result-content">
          В библиотеках <span class="highlight">гради</span>ентного бустинга...
      </div>
      <footer class="result-footer">
        <span class="category">стажировка</span>
        <time datetime="2026-05-30T18:10">18:10 30.05.2026</time>
      </footer>
    </article>

  </main>

  <!-- Футер со счетчиком -->
  <footer class="search-summary">
    <span>Найдено 4 записи</span>
  </footer>
</div>
`


aboutBtn.addEventListener('click', () => {
    modalBody.innerHTML = aboutInnerHTML;
    modal.style.display = 'flex';
});

colorBtn.addEventListener('click', () => {
    modalBody.innerHTML = colorInnerHTML;
    modal.style.display = 'flex';
});

searchBtn.addEventListener('click', () => {
    modalBody.innerHTML = searchInnerHTML;
    modal.style.display = 'flex';
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});
