// @ts-nocheck

const STORAGE_KEY = "resindart-products";
const categoryNames = { clock: "Часы", decor: "Посуда и декор", table: "Столы", art: "Картины" };
const statusNames = { available: "В наличии", order: "Под заказ" };

let products = loadProducts();
let pendingDeleteId = null;

const form = document.querySelector("#product-form");
const list = document.querySelector("#product-list");
const deleteDialog = document.querySelector("#delete-dialog");
const toast = document.querySelector("#toast");
const toastMessage = document.querySelector("#toast-message");
const toastUndo = document.querySelector("#toast-undo");
const imageInput = document.querySelector("#image-file");
const imageValue = document.querySelector("#image");
const imagePreview = document.querySelector("#image-preview");
const removeImageButton = document.querySelector("#remove-image");
const dimensionToggles = document.querySelectorAll("[data-dimension-toggle]");
let toastTimer;
let undoAction = null;

function loadProducts() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : structuredClone(window.RESINDART_PRODUCTS ?? []);
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  renderProducts();
}

function hideToast() {
  toast.classList.remove("is-visible");
  undoAction = null;
  toastUndo.hidden = true;
}

function showToast(text, type = "success", onUndo = null) {
  clearTimeout(toastTimer);
  toast.classList.remove("is-visible");
  void toast.offsetWidth;
  undoAction = onUndo;
  toastUndo.hidden = !onUndo;
  toast.dataset.type = type;
  toast.querySelector(".toast-icon").textContent = type === "error" ? "!" : "✓";
  toastMessage.textContent = text;
  toast.classList.add("is-visible");
  toastTimer = setTimeout(hideToast, 5000);
}

function showUndoableToast(text, previousProducts) {
  showToast(text, "success", () => {
    products = previousProducts;
    saveProducts();
    resetForm();
    showToast("Действие отменено.");
  });
}

toastUndo.addEventListener("click", () => {
  if (!undoAction) return;
  clearTimeout(toastTimer);
  const action = undoAction;
  hideToast();
  action();
});

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function showImagePreview(source = "") {
  imageValue.value = source;
  imagePreview.innerHTML = source ? `<img src="${escapeHtml(source)}" alt="Предпросмотр фотографии" />` : "<span>Фото не выбрано</span>";
  removeImageButton.hidden = !source;
}

function getDimensions(product) {
  if (product.dimensions) return { ...product.dimensions, depth: product.dimensions.depth ?? product.dimensions.length ?? "" };
  const size = product.size ?? "";
  const diameter = size.match(/Ø\s*([\d.,]+)/i);
  const values = size.match(/\d+(?:[.,]\d+)?/g) ?? [];
  if (diameter) return { diameter: diameter[1], height: values[1] ?? "" };
  if (values.length >= 3) return { depth: values[0], width: values[1], height: values[2] };
  if (values.length === 2 && product.category === "art") return { width: values[0], height: values[1] };
  if (values.length === 2) return { width: values[0], depth: values[1] };
  return {};
}

function formatSize(dimensions) {
  const linear = [
    dimensions.height && `В ${dimensions.height}`,
    dimensions.width && `Ш ${dimensions.width}`,
    dimensions.depth && `Г ${dimensions.depth}`,
  ].filter(Boolean).join(" × ");
  const diameter = dimensions.diameter ? `Ø ${dimensions.diameter} см` : "";
  return [linear && `${linear} см`, diameter].filter(Boolean).join("; ");
}

function setDimensionState(name, enabled, value = "") {
  const toggle = document.querySelector(`[data-dimension-toggle="${name}"]`);
  const input = document.querySelector(`#${name}`);
  toggle.checked = enabled;
  input.disabled = !enabled;
  input.value = enabled ? value : "";
}

function renderProducts() {
  document.querySelector("#product-count").textContent = products.length;
  list.innerHTML = products.map((product) => `
    <article class="admin-product">
      <div class="product-thumb">${product.image ? `<img src="${escapeHtml(product.image)}" alt="" />` : escapeHtml(product.name.slice(0, 1))}</div>
      <div class="product-details">
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.categoryName)} · ${escapeHtml(product.price)}</p>
        <span class="visibility ${product.published === false ? "hidden" : ""}">${product.published === false ? "Скрыт" : "Опубликован"}</span>
      </div>
      <div class="product-actions">
        <button type="button" data-action="edit" data-id="${product.id}">Редактировать</button>
        <button type="button" data-action="toggle" data-id="${product.id}">${product.published === false ? "Показать" : "Скрыть"}</button>
        <button class="delete" type="button" data-action="delete" data-id="${product.id}">Удалить</button>
      </div>
    </article>
  `).join("");
}

function resetForm() {
  form.reset();
  dimensionToggles.forEach((toggle) => setDimensionState(toggle.dataset.dimensionToggle, false));
  showImagePreview();
  document.querySelector("#product-id").value = "";
  document.querySelector("#published").checked = true;
  document.querySelector("#form-title").textContent = "Новый товар";
  document.querySelector("#cancel-edit").hidden = true;
}

function editProduct(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;
  document.querySelector("#product-id").value = product.id;
  document.querySelector("#name").value = product.name;
  document.querySelector("#category").value = product.category;
  document.querySelector("#status").value = product.status;
  document.querySelector("#price").value = product.price;
  const dimensions = getDimensions(product);
  dimensionToggles.forEach((toggle) => {
    const name = toggle.dataset.dimensionToggle;
    setDimensionState(name, Boolean(dimensions[name]), dimensions[name] ?? "");
  });
  document.querySelector("#time").value = product.time ?? "";
  showImagePreview(product.image ?? "");
  document.querySelector("#description").value = product.description;
  document.querySelector("#published").checked = product.published !== false;
  document.querySelector("#form-title").textContent = "Редактирование";
  document.querySelector("#cancel-edit").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const previousProducts = structuredClone(products);
  const currentId = Number(document.querySelector("#product-id").value);
  const dimensions = {
    height: document.querySelector('[data-dimension-toggle="height"]').checked ? document.querySelector("#height").value.trim() : "",
    width: document.querySelector('[data-dimension-toggle="width"]').checked ? document.querySelector("#width").value.trim() : "",
    depth: document.querySelector('[data-dimension-toggle="depth"]').checked ? document.querySelector("#depth").value.trim() : "",
    diameter: document.querySelector('[data-dimension-toggle="diameter"]').checked ? document.querySelector("#diameter").value.trim() : "",
  };
  const product = {
    id: currentId || Math.max(0, ...products.map((item) => item.id)) + 1,
    published: document.querySelector("#published").checked,
    category: document.querySelector("#category").value,
    categoryName: categoryNames[document.querySelector("#category").value],
    name: document.querySelector("#name").value.trim(),
    status: document.querySelector("#status").value,
    statusName: statusNames[document.querySelector("#status").value],
    price: document.querySelector("#price").value.trim(),
    dimensions,
    size: formatSize(dimensions),
    time: document.querySelector("#time").value.trim(),
    image: imageValue.value,
    description: document.querySelector("#description").value.trim(),
  };

  const existingIndex = products.findIndex((item) => item.id === currentId);
  if (existingIndex >= 0) products[existingIndex] = product;
  else products.unshift(product);
  saveProducts();
  resetForm();
  showUndoableToast(existingIndex >= 0 ? "Изменения товара сохранены." : "Товар добавлен в каталог.", previousProducts);
});

dimensionToggles.forEach((toggle) => {
  toggle.addEventListener("change", () => {
    const input = document.querySelector(`#${toggle.dataset.dimensionToggle}`);
    input.disabled = !toggle.checked;
    if (!toggle.checked) input.value = "";
    else input.focus();
  });
});

document.querySelectorAll(".dimension-field > input").forEach((input) => {
  input.addEventListener("input", () => {
    const digitsOnly = input.value.replace(/\D/g, "");
    if (input.value !== digitsOnly) {
      input.value = digitsOnly;
      showToast("В размерах можно использовать только цифры.", "error");
    }
  });
});

imageInput.addEventListener("change", () => {
  const [file] = imageInput.files;
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    imageInput.value = "";
    showToast("Файл слишком большой. Выберите изображение до 2 МБ.", "error");
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    showImagePreview(reader.result);
    showToast("Фотография добавлена. Сохраните товар, чтобы применить изменения.");
  });
  reader.readAsDataURL(file);
});

removeImageButton.addEventListener("click", () => {
  imageInput.value = "";
  showImagePreview();
  showToast("Фотография удалена из формы. Сохраните товар, чтобы применить изменения.");
});

list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === "edit") editProduct(id);
  if (button.dataset.action === "toggle") {
    const previousProducts = structuredClone(products);
    const product = products.find((item) => item.id === id);
    product.published = product.published === false;
    saveProducts();
    showUndoableToast(product.published ? `«${product.name}» опубликован.` : `«${product.name}» скрыт из магазина.`, previousProducts);
  }
  if (button.dataset.action === "delete") {
    pendingDeleteId = id;
    const product = products.find((item) => item.id === id);
    document.querySelector("#delete-copy").textContent = `«${product.name}» будет удалён из локального каталога.`;
    deleteDialog.showModal();
  }
});

document.querySelector("#confirm-delete").addEventListener("click", () => {
  const previousProducts = structuredClone(products);
  products = products.filter((item) => item.id !== pendingDeleteId);
  saveProducts();
  resetForm();
  showUndoableToast("Товар удалён из каталога.", previousProducts);
});

document.querySelector("#cancel-edit").addEventListener("click", resetForm);

document.querySelector("#reset-catalog").addEventListener("click", () => {
  const previousProducts = structuredClone(products);
  products = structuredClone(window.RESINDART_PRODUCTS ?? []);
  saveProducts();
  resetForm();
  showUndoableToast("Исходный каталог восстановлен.", previousProducts);
});

document.querySelector("#export-catalog").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "resindart-products.json";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Файл каталога подготовлен к скачиванию.");
});

renderProducts();
