window.addEventListener("DOMContentLoaded", () => {
    const openGuideBtn = document.getElementById("open-guide-btn");
    const closeGuideBtn = document.getElementById("close-guide-btn");
    const guide = document.getElementById("startup-guide");
    const guideElements = document.querySelectorAll(".startup-guide-element");
    const chromeToggle = document.getElementById("guide-chrome-toggle");
    const firefoxToggle = document.getElementById("guide-firefox-toggle");

    const setGuideVisible = (visible) => {

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
