document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('changeColorBtn');

    button.addEventListener('click', async () => {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.create({ url: 'https://localhost:7242/'});
    });
});
