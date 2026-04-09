const aboutBtn = document.getElementById('about-btn');
const colorBtn = document.getElementById('color-btn');
const searchBtn = document.getElementById('search-btn');
const modal = document.getElementById('universal-modal');
const modalBody = document.getElementById('modal-body');

let aboutInnerHTML = '<h3>О сайте</h3><p>Highliter.com — ваш помощник в работе с заметками.</p>';
let colorInnerHTML = '<h3>Выбор цвета</h3><p>Выберите одну из тем</p>';
let searchInnerHTML = '<h3>Поиск заметки</h3><p>Введите...</p>';

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
