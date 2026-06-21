export const modal = document.getElementById("universal-modal");
export const modalBody = document.getElementById("modal-body");

export function openModal(templateId, additionalClass = "") {
  const template = document.getElementById(templateId);
  modalBody.innerHTML = "";
  modalBody.appendChild(template.content.cloneNode(true));

  const modalContent = modal.querySelector(".modal-content");
  modalContent.className = "modal-content";
  if (additionalClass) modalContent.classList.add(additionalClass);

  modal.style.display = "flex";
}

export function closeModal() {
  modal.style.display = "none";
}

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.style.display === "flex") closeModal();
});