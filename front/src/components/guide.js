import { modal, modalBody } from './modal.js';

function openImageModal(src) {
    if (!modal || !modalBody) {
        console.error("Модальное окно не найдено в DOM.");
        return;
    }

    modalBody.innerHTML = `<img class="full-modal-image" src="${src}" alt="Скриншот гайда">`;

    const modalContent = modal.querySelector(".modal-content");
    if (modalContent) {
        modalContent.className = "modal-content image-viewer";
    }

    modal.style.display = "flex";
}

window.addEventListener("DOMContentLoaded", () => {
    const openGuideBtn = document.getElementById("open-guide-btn");
    const closeGuideBtn = document.getElementById("close-guide-btn");
    const guide = document.getElementById("startup-guide");
    const guideElements = document.querySelectorAll(".startup-guide-element");

    const setGuideVisible = (visible) => {
        if (guide) guide.classList.toggle("show", visible);
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
        const guideName = guideToggle?.querySelector(".guide-name");

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
                if (src) {
                    openImageModal(src);
                }
            });
        }
    });
});