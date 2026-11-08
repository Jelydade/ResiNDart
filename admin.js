// @ts-nocheck

const API_BASE = "https://resindart-catalog-api.jelydade-resindart.workers.dev";
const SESSION_KEY = "resindart-admin-session";
const categoryNames = { clock: "Часы", decor: "Посуда и декор", table: "Столы", art: "Картины" };
const statusNames = { available: "В наличии", order: "Под заказ" };

let products = [];
let catalogSha = "";
let pendingDeleteId = null;
let selectedImageFile = null;

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
const loginForm = document.querySelector("#login-form");
const loginFields = document.querySelector("#login-fields");
const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const authStatus = document.querySelector("#auth-status");
let toastTimer;

function getToken() {
  return sessionStorage.getItem(SESSION_KEY);
}

function setInterfaceEnabled(enabled) {
  form.querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = !enabled;
  });
  document.querySelector("#export-catalog").disabled = !enabled;
}

function hideToast() {
  toast.classList.remove("is-visible");
}

function showToast(text, type = "success") {
  clearTimeout(toastTimer);
  toast.classList.remove("is-visible");
  void toast.offsetWidth;
  toastUndo.hidden = true;
  toast.dataset.type = type;
  toast.querySelector(".toast-icon").textContent = type === "error" ? "!" : "✓";
  toastMessage.textContent = text;
  toast.classList.add("is-visible");
  toastTimer = setTimeout(hideToast, 5000);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: getToken() ? `Bearer ${getToken()}` : "",
      "Content-Type": "application/json",
      ...options.headers,
    },
    cache: "no-store",
  });

  if (response.status === 401 && getToken()) {
    sessionStorage.removeItem(SESSION_KEY);
    setLoggedOut("Сессия истекла. Войдите ещё раз.");
    throw new Error("Сессия истекла");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Сервер вернул ошибку ${response.status}`);
  }

  return response.json();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result).split(",")[1]));
    reader.addEventListener("error", () => reject(new Error("Не удалось прочитать фотографию")));
    reader.readAsDataURL(file);
  });
}

function setLoggedOut(message = "Войдите, чтобы загрузить каталог и сохранить изменения на сайте.") {
  products = [];
  catalogSha = "";
  list.innerHTML = '<p class="empty-state">Каталог станет доступен после входа.</p>';
  document.querySelector("#product-count").textContent = "0";
  authStatus.textContent = message;
  loginFields.hidden = false;
  loginButton.hidden = false;
  logoutButton.hidden = true;
  setInterfaceEnabled(false);
}

function setLoggedIn() {
  authStatus.textContent = "Каталог подключён. Сохранённые изменения появятся на сайте после публикации.";
  loginFields.hidden = true;
  loginButton.hidden = true;
  logoutButton.hidden = false;
  setInterfaceEnabled(true);
  dimensionToggles.forEach((toggle) => {
    document.querySelector(`#${toggle.dataset.dimensionToggle}`).disabled = !toggle.checked;
  });
}

async function loadCatalog() {
  authStatus.textContent = "Загружаю каталог…";
  const catalog = await apiRequest("/catalog");
  if (!Array.isArray(catalog.products)) throw new Error("Неверный формат каталога");

  catalogSha = catalog.sha;
  products = catalog.products.map((product, index) => ({
    ...product,
    id: Number(product.id) || index + 1,
  }));
  resetForm();
  setLoggedIn();
  renderProducts();
}

async function saveProducts(message) {
  const result = await apiRequest("/catalog", {
    method: "PUT",
    body: JSON.stringify({
      message,
      sha: catalogSha,
      products,
    }),
  });

  catalogSha = result.sha;
  renderProducts();
}

function sanitizeFileName(name) {
  const parts = name.toLowerCase().split(".");
  const extension = parts.length > 1 ? parts.pop().replace(/[^a-z0-9]/g, "") : "jpg";
  const base = parts.join(".").normalize("NFKD").replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-|-$/g, "") || "product";
  return `${Date.now()}-${base}.${extension || "jpg"}`;
}

async function uploadSelectedImage() {
  if (!selectedImageFile) return imageValue.value;

  const result = await apiRequest("/image", {
    method: "POST",
    body: JSON.stringify({
      name: sanitizeFileName(selectedImageFile.name),
      content: await fileToBase64(selectedImageFile),
    }),
  });

  selectedImageFile = null;
  return result.path;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginButton.disabled = true;
  try {
    const { token } = await apiRequest("/login", {
      method: "POST",
      body: JSON.stringify({
        username: document.querySelector("#admin-username").value,
        password: document.querySelector("#admin-password").value,
      }),
    });
    sessionStorage.setItem(SESSION_KEY, token);
    document.querySelector("#admin-password").value = "";
    await loadCatalog();
  } catch (error) {
    sessionStorage.removeItem(SESSION_KEY);
    setLoggedOut();
    showToast(error.message, "error");
  } finally {
    loginButton.disabled = false;
  }
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  resetForm();
  setLoggedOut();
});

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
        <p>${escapeHtml(categoryNames[product.category] || product.category)} · ${escapeHtml(product.price)}</p>
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
  selectedImageFile = null;
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
  selectedImageFile = null;
  showImagePreview(product.image ?? "");
  document.querySelector("#description").value = product.description;
  document.querySelector("#published").checked = product.published !== false;
  document.querySelector("#form-title").textContent = "Редактирование";
  document.querySelector("#cancel-edit").hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;

  try {
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
      name: document.querySelector("#name").value.trim(),
      status: document.querySelector("#status").value,
      price: document.querySelector("#price").value.trim(),
      size: formatSize(dimensions),
      time: document.querySelector("#time").value.trim(),
      image: await uploadSelectedImage(),
      imageAlt: document.querySelector("#name").value.trim(),
      description: document.querySelector("#description").value.trim(),
    };

    const existingIndex = products.findIndex((item) => item.id === currentId);
    if (existingIndex >= 0) products[existingIndex] = product;
    else products.unshift(product);

    await saveProducts(existingIndex >= 0 ? `Update product ${product.name}` : `Add product ${product.name}`);
    resetForm();
    showToast(existingIndex >= 0 ? "Изменения сохранены. Сайт обновится в течение нескольких минут." : "Товар добавлен. Сайт обновится в течение нескольких минут.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
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
  selectedImageFile = file;
  showImagePreview(URL.createObjectURL(file));
  showToast("Фотография выбрана. Она загрузится после сохранения товара.");
});

removeImageButton.addEventListener("click", () => {
  selectedImageFile = null;
  imageInput.value = "";
  showImagePreview();
  showToast("Фотография удалена из формы. Сохраните товар, чтобы применить изменение.");
});

list.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === "edit") editProduct(id);
  if (button.dataset.action === "toggle") {
    const product = products.find((item) => item.id === id);
    product.published = product.published === false;
    button.disabled = true;
    try {
      await saveProducts(product.published ? `Publish product ${product.name}` : `Hide product ${product.name}`);
      showToast(product.published ? `«${product.name}» опубликован.` : `«${product.name}» скрыт из магазина.`);
    } catch (error) {
      product.published = !product.published;
      renderProducts();
      showToast(error.message, "error");
    }
  }
  if (button.dataset.action === "delete") {
    pendingDeleteId = id;
    const product = products.find((item) => item.id === id);
    document.querySelector("#delete-copy").textContent = `«${product.name}» будет удалён из каталога сайта.`;
    deleteDialog.showModal();
  }
});

document.querySelector("#confirm-delete").addEventListener("click", async (event) => {
  event.preventDefault();
  const previousProducts = products;
  const product = products.find((item) => item.id === pendingDeleteId);
  products = products.filter((item) => item.id !== pendingDeleteId);
  try {
    await saveProducts(`Delete product ${product.name}`);
    deleteDialog.close();
    resetForm();
    showToast("Товар удалён из каталога.");
  } catch (error) {
    products = previousProducts;
    renderProducts();
    showToast(error.message, "error");
  }
});

document.querySelector("#cancel-edit").addEventListener("click", resetForm);

document.querySelector("#export-catalog").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ products }, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "resindart-products.json";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Файл каталога подготовлен к скачиванию.");
});

setInterfaceEnabled(false);
if (getToken()) {
  loadCatalog().catch((error) => {
    setLoggedOut();
    showToast(error.message, "error");
  });
} else {
  setLoggedOut();
}

