const aboutBtn = document.getElementById("about-btn");
const colorBtn = document.getElementById("color-btn");
//const searchBtn = document.getElementById('search-btn');
const modal = document.getElementById("universal-modal");
const modalBody = document.getElementById("modal-body");

let aboutInnerHTML = "<h3>О сайте</h3><p>Highliter.com — ваш помощник в работе с заметками.</p>";

let fullImageInnerHTML = "";

let colorInnerHTML = `<div class="color-container">
    <div>Выберите тему</div>

    <div class="grid-layout">
        <img id="mint" class="grid-item" src="media/theme4.png" alt="Тема 1">
        <img id="rose" class="grid-item" src="media/theme1.png" alt="Тема 2">
        <img id="sky" class="grid-item" src="media/theme2.png" alt="Тема 3">
        <img id="gum" class="grid-item" src="media/theme3.png" alt="Тема 4">
    </div>
</div>
<style>
    .modal-content {
        height: auto !important;
        max-height: 80% !important;
        width: 50% !important;
    }
    #modal-body {
        overflow-y: auto !important;
    }
    .color-container {
        max-height: none !important;
        overflow-y: visible !important;
    }
</style>`;

// let searchInnerHTML = `
// <div class="search-container">
//   <header class="search-header">
//     <div class="search-wrapper">
//       <input type="text" placeholder="введите фразу или слово" class="search-input">
//       <button type="submit" class="search-button">
//         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
//           <circle cx="11" cy="11" r="8"></circle>
//           <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
//         </svg>
//       </button>
//     </div>
//   </header>

//   <main class="search-results">
//     <article class="result-card">
//       <div class="result-content">
//         <span class="highlight">Градиентный спуск - это способ обучения и совершенствования модели машинного обучения...</span>
//       </div>
//       <footer class="result-footer">
//         <span class="category">стажировка</span>
//         <time datetime="2026-05-30T18:10">18:10 30.05.2026</time>
//       </footer>
//     </article>
//   </main>

//   <footer class="search-summary">
//     <span>Найдено 4 записи</span>
//   </footer>
// </div>
// `;

const themes = {
  mint: {
    "--background-color": "#ffffff",
    "--notes-header-color": "#8cdec7",
    "--second-color": "#E2E2E2",
    "--text-color": "#000000",
    "--card-color": "#2b2b40",
    "--accent-color": "#8cdec7",
  },
  rose: {
    "--background-color": "#ffffff",
    "--notes-header-color": "#D5A7B6",
    "--second-color": "#E2E2E2",
    "--text-color": "#000000",
    "--card-color": "#2b2b40",
    "--accent-color": "#D5A7B6",
  },
  sky: {
    "--background-color": "#5980E6",
    "--notes-header-color": "#000000",
    "--second-color": "#8fa6e0",
    "--text-color": "#fff700",
    "--card-color": "#1e293b",
    "--accent-color": "#5980E6",
  },
  gum: {
    "--background-color": "#DB72B6",
    "--notes-header-color": "#000000",
    "--second-color": "#cd93b8",
    "--text-color": "#fff700",
    "--card-color": "#000000",
    "--accent-color": "#DB72B6",
  },
};

function applyTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) return;

  const root = document.documentElement;

  Object.keys(theme).forEach((variable) => {
    root.style.setProperty(variable, theme[variable]);
  });

  localStorage.setItem("selectedTheme", themeName);
}

function closeModal() {
  const modalContent = modal.querySelector(".modal-content");

  modal.style.display = "none";

  if (modalContent) {
    modalContent.classList.remove("image-viewer");
  }
}

function initThemeHandlers() {
  const mintBtn = document.getElementById("mint");
  const roseBtn = document.getElementById("rose");
  const skyBtn = document.getElementById("sky");
  const gumBtn = document.getElementById("gum");

  if (mintBtn) {
    mintBtn.addEventListener("click", () => {
      applyTheme("mint");
      closeModal();
    });
  }

  if (roseBtn) {
    roseBtn.addEventListener("click", () => {
      applyTheme("rose");
      closeModal();
    });
  }

  if (skyBtn) {
    skyBtn.addEventListener("click", () => {
      applyTheme("sky");
      closeModal();
    });
  }

  if (gumBtn) {
    gumBtn.addEventListener("click", () => {
      applyTheme("gum");
      closeModal();
    });
  }
}

aboutBtn.addEventListener("click", () => {
  modal.querySelector(".modal-content")?.classList.remove("image-viewer");
  modalBody.innerHTML = aboutInnerHTML;
  modal.style.display = "flex";
});

colorBtn.addEventListener("click", () => {
  modal.querySelector(".modal-content")?.classList.remove("image-viewer");
  modalBody.innerHTML = colorInnerHTML;
  modal.style.display = "flex";
  initThemeHandlers();
});

// searchBtn.addEventListener('click', () => {
//     modalBody.innerHTML = searchInnerHTML;
//     modal.style.display = 'flex';
// });

modal.addEventListener("click", (e) => {
  console.log("Кликнутый элемент:", e.target); // Посмотри в консоль (F12)
  if (e.target === modal) {
    closeModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.style.display === "flex") {
    closeModal();
  }
});

const savedTheme = localStorage.getItem("selectedTheme");
if (savedTheme) {
  applyTheme(savedTheme);
}

// ---------------- Events ----------------
window.addEventListener("DOMContentLoaded", () => {
  const openGuideBtn = document.getElementById("open-guide-btn");
  const closeGuideBtn = document.getElementById("close-guide-btn");
  const guide = document.getElementById("startup-guide");
  const guideElements = document.querySelectorAll(".startup-guide-element");
  const chromeToggle = document.getElementById("guide-chrome-toggle");
  const firefoxToggle = document.getElementById("guide-firefox-toggle");

  const setGuideVisible = (visible) => {
    if (!guide) return;

    guide.classList.toggle("show", visible);

    if (openGuideBtn) {
      openGuideBtn.setAttribute("aria-expanded", visible ? "true" : "false");
    }
  };

  if (openGuideBtn) {
    openGuideBtn.addEventListener("click", () => {
      const next = !(guide && guide.classList.contains("show"));
      setGuideVisible(next);
    });
  }

  if (closeGuideBtn) {
    closeGuideBtn.addEventListener("click", () => setGuideVisible(false));
  }

  guideElements.forEach((element) => {
    const guideToggle = element.querySelector(".expand-menu");
    const guideGrid = element.querySelector(".startup-guide-grid");
    const guideName = guideToggle.querySelector(".guide-name");

    if (guideGrid) {
      guideGrid.style.display = "none";
    }

    const toggleGuideGrid = () => {
      if (!guideGrid) return;
      const isHidden = getComputedStyle(guideGrid).display === "none";
      guideGrid.style.display = isHidden ? "" : "none";
      if (guideName) guideName.classList.toggle("is-open", isHidden);
    };

    if (guideToggle) {
      guideToggle.addEventListener("click", toggleGuideGrid);
    }

    if (guideGrid) {
      guideGrid.addEventListener("click", (e) => {
        const img = e.target.closest(".startup-guide-image");
        if (!img) return;

        const src = img.getAttribute("src");
        if (!src) return;

        if (typeof window.openImageModal === "function") {
          window.openImageModal(src);
        } else {
          console.warn("openImageModal не найден. Проверьте подключение js/parser.js");
        }
      });
    }
  });
});
