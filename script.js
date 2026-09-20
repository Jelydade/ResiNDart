const products = window.RESINDART_PRODUCTS ?? [];

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

function productCard(product) {
  return `
    <button class="product-card" type="button" data-id="${product.id}" aria-label="Подробнее: ${product.name}">
      <div class="product-visual${product.image ? " has-photo" : ""}">
        <span class="product-status" data-status="${product.status}">${product.statusName}</span>
        ${product.image ? `<img src="${product.image}" alt="${product.imageAlt}" />` : "<span>Фото готовится</span>"}
      </div>
      <div class="product-info">
        <div class="product-meta"><span>${product.categoryName}</span><span>Демо</span></div>
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
