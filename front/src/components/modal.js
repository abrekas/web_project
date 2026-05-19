const aboutBtn = document.getElementById("about-btn");
export const modal = document.getElementById("universal-modal");
export const modalBody = document.getElementById("modal-body");

export function openModal(templateId, additionalClass = "") {
  const template = document.getElementById(templateId);

  modalBody.innerHTML = "";
  modalBody.appendChild(template.content.cloneNode(true));

  const modalContent = modal.querySelector(".modal-content");
  modalContent.className = "modal-content"; 
  if (additionalClass) {
    modalContent.classList.add(additionalClass);
  }

  modal.style.display = "flex";
}

export function closeModal() {
  const modalContent = modal.querySelector(".modal-content");
  modal.style.display = "none";
  if (modalContent) {
    modalContent.classList.remove("image-viewer", "color-modal");
  }
}

aboutBtn.addEventListener("click", () => {
  openModal("modal-about-template");
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.style.display === "flex") {
    closeModal();
  }
});
