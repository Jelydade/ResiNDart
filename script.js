// @ts-nocheck

const storedProducts = localStorage.getItem("resindart-products");
const products = storedProducts ? JSON.parse(storedProducts) : (window.RESINDART_PRODUCTS ?? []);

const grid = document.querySelector("#product-grid");
const count = document.querySelector("#catalog-count");
const filters = [...document.querySelectorAll(".filter")];
const dialog = document.querySelector("#product-dialog");
const closeButton = dialog.querySelector(".dialog-close");
const discussOrder = document.querySelector("#discuss-order");
const orderForm = document.querySelector("#order-form");
const orderCategory = document.querySelector("#order-category");
const orderMessage = document.querySelector("#order-message");
const formSuccess = document.querySelector("#form-success");
const newRequest = document.querySelector("#new-request");
let selectedProduct;

function getProductDimensions(product) {
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

function productDimensions(product) {
  const dimensions = getProductDimensions(product);
  const items = [
    { key: "height", label: "Высота", icon: '<path d="M8 2v12M5.5 4.5 8 2l2.5 2.5M5.5 11.5 8 14l2.5-2.5" />' },
    { key: "width", label: "Ширина", icon: '<path d="M2 8h12M4.5 5.5 2 8l2.5 2.5M11.5 5.5 14 8l-2.5 2.5" />' },
    { key: "depth", label: "Глубина", icon: '<path d="m3 13 10-10M3 9v4h4M9 3h4v4" />' },
    { key: "diameter", label: "Диаметр", icon: '<circle cx="8" cy="8" r="5.5" /><path d="M3 11.5 13 4.5" />' },
  ].filter((item) => dimensions[item.key] && String(dimensions[item.key]) !== "0");

  if (!items.length) return "";

  return `
    <span class="product-dimensions">
      ${items.map((item) => `<span class="dimension-item" aria-label="${item.label}: ${dimensions[item.key]} сантиметров"><svg viewBox="0 0 16 16" aria-hidden="true">${item.icon}</svg><span>${dimensions[item.key]}</span></span>`).join("")}
      <span class="dimensions-help" aria-label="Подробные габариты товара">i
        <span class="dimensions-tooltip" role="tooltip">
          ${items.map((item) => `<span>${item.label}: ${dimensions[item.key]} см</span>`).join("")}
        </span>
      </span>
    </span>`;
}

function productCard(product) {
  return `
    <button class="product-card" type="button" data-id="${product.id}" aria-label="Подробнее: ${product.name}">
      <div class="product-visual${product.image ? " has-photo" : ""}">
        <span class="product-status" data-status="${product.status}">${product.statusName}</span>
        ${product.image ? `<img src="${product.image}" alt="${product.imageAlt}" />` : "<span>Фото готовится</span>"}
      </div>
      <div class="product-info">
        <div class="product-meta"><span>${product.categoryName}</span>${productDimensions(product)}</div>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-bottom"><span class="product-price">${product.price}</span><span class="product-more">Подробнее</span></div>
      </div>
    </button>`;
}

function render(category = "all") {
  const published = products.filter((product) => product.published !== false);
  const visible = category === "all" ? published : published.filter((product) => product.category === category);
  grid.innerHTML = visible.map(productCard).join("");
  count.textContent = visible.length;
}

function openProduct(product) {
  selectedProduct = product;
  const dialogVisual = document.querySelector("#dialog-visual");
  dialogVisual.classList.toggle("has-photo", Boolean(product.image));
  dialogVisual.innerHTML = product.image
    ? `<img src="${product.image}" alt="${product.imageAlt}" />`
    : "<span>Фото готовится</span>";
  document.querySelector("#dialog-category").textContent = product.categoryName;
  document.querySelector("#dialog-title").textContent = product.name;
  document.querySelector("#dialog-description").textContent = product.description;
  document.querySelector("#dialog-size").textContent = product.size;
  document.querySelector("#dialog-time").textContent = product.time;
  document.querySelector("#dialog-status").textContent = product.statusName;
  document.querySelector("#dialog-price").textContent = product.price;
  dialog.showModal();
}

filters.forEach((button) => button.addEventListener("click", () => {
  filters.forEach((filter) => {
    const active = filter === button;
    filter.classList.toggle("is-active", active);
    filter.setAttribute("aria-pressed", String(active));
  });
  render(button.dataset.filter);
}));

grid.addEventListener("click", (event) => {
  const card = event.target.closest(".product-card");
  if (!card) return;
  openProduct(products.find((product) => product.id === Number(card.dataset.id)));
});

closeButton.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
discussOrder.addEventListener("click", () => {
  dialog.close();
  if (!selectedProduct) return;
  orderCategory.value = selectedProduct.category;
  orderMessage.value = `Интересует изделие «${selectedProduct.name}». `;
});

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!orderForm.checkValidity()) {
    orderForm.reportValidity();
    return;
  }
  orderForm.hidden = true;
  formSuccess.hidden = false;
});

newRequest.addEventListener("click", () => {
  orderForm.reset();
  formSuccess.hidden = true;
  orderForm.hidden = false;
  orderForm.elements.name.focus();
});

render();
