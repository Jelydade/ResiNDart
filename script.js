// @ts-nocheck

let products = [];
const categoryNames = { clock: "Часы", decor: "Посуда и декор", table: "Столы", art: "Картины" };
const statusNames = { available: "В наличии", order: "Под заказ" };

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

const grid = document.querySelector("#product-grid");
const count = document.querySelector("#catalog-count");
const filters = [...document.querySelectorAll(".filter")];
const dialog = document.querySelector("#product-dialog");
const closeButton = dialog?.querySelector(".dialog-close");
const discussOrder = document.querySelector("#discuss-order");
const faqItems = [...document.querySelectorAll(".faq-item")];
const worksTrack = document.querySelector("#works-track");
const workSlides = [...document.querySelectorAll(".work-slide")];
const worksCount = document.querySelector("#works-count");
const workPrevious = document.querySelector("#work-prev");
const workNext = document.querySelector("#work-next");
let activeWork = 0;

function animateFaqItem(item) {
  const summary = item.querySelector("summary");
  const isOpening = !item.open;
  item.getAnimations().forEach((animation) => animation.cancel());

  if (isOpening) {
    item.open = true;
    const collapsedHeight = summary.offsetHeight;
    const expandedHeight = item.scrollHeight;
    item.style.height = `${collapsedHeight}px`;
    const animation = item.animate(
      { height: [`${collapsedHeight}px`, `${expandedHeight}px`] },
      { duration: 300, easing: "cubic-bezier(.22,.8,.32,1)" },
    );
    animation.onfinish = () => { item.style.height = ""; };
    return;
  }

  const expandedHeight = item.offsetHeight;
  const collapsedHeight = summary.offsetHeight;
  item.style.height = `${expandedHeight}px`;
  const animation = item.animate(
    { height: [`${expandedHeight}px`, `${collapsedHeight}px`] },
    { duration: 250, easing: "cubic-bezier(.4,0,.2,1)" },
  );
  animation.onfinish = () => {
    item.open = false;
    item.style.height = "";
  };
}

faqItems.forEach((item) => {
  item.querySelector("summary").addEventListener("click", (event) => {
    event.preventDefault();
    animateFaqItem(item);
  });
});

function showWork(index) {
  if (!worksTrack || !workSlides.length) return;
  activeWork = (index + workSlides.length) % workSlides.length;
  worksTrack.style.transform = `translateX(-${activeWork * 100}%)`;
  worksCount.textContent = `${String(activeWork + 1).padStart(2, "0")} / ${String(workSlides.length).padStart(2, "0")}`;
  workSlides.forEach((slide, slideIndex) => slide.setAttribute("aria-hidden", String(slideIndex !== activeWork)));
}

workPrevious?.addEventListener("click", () => showWork(activeWork - 1));
workNext?.addEventListener("click", () => showWork(activeWork + 1));

let touchStartX = 0;
worksTrack?.addEventListener("touchstart", (event) => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
worksTrack?.addEventListener("touchend", (event) => {
  const distance = event.changedTouches[0].screenX - touchStartX;
  if (Math.abs(distance) < 45) return;
  showWork(activeWork + (distance < 0 ? 1 : -1));
}, { passive: true });

showWork(0);

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
      ${items.map((item) => `<span class="dimension-item" aria-label="${item.label}: ${escapeHtml(dimensions[item.key])} сантиметров"><svg viewBox="0 0 16 16" aria-hidden="true">${item.icon}</svg><span>${escapeHtml(dimensions[item.key])}</span></span>`).join("")}
      <span class="dimensions-help" aria-label="Подробные габариты товара">i
        <span class="dimensions-tooltip" role="tooltip">
          ${items.map((item) => `<span>${item.label}: ${escapeHtml(dimensions[item.key])} см</span>`).join("")}
        </span>
      </span>
    </span>`;
}

function productCard(product) {
  const image = escapeHtml(product.image);
  return `
    <button class="product-card" type="button" data-id="${product.id}" aria-label="Подробнее: ${escapeHtml(product.name)}">
      <div class="product-visual${product.image ? " has-photo" : ""}">
        <span class="product-status" data-status="${escapeHtml(product.status)}">${escapeHtml(statusNames[product.status])}</span>
        ${product.image ? `<img src="${image}" alt="${escapeHtml(product.imageAlt || product.name)}" />` : "<span>Фото готовится</span>"}
      </div>
      <div class="product-info">
        <div class="product-meta"><span>${escapeHtml(categoryNames[product.category])}</span>${productDimensions(product)}</div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <div class="product-bottom"><span class="product-price">${escapeHtml(product.price)}</span><span class="product-more">Подробнее</span></div>
      </div>
    </button>`;
}

function render(category = "all") {
  if (!grid || !count) return;
  const published = products.filter((product) => product.published !== false);
  const visible = category === "all" ? published : published.filter((product) => product.category === category);
  grid.innerHTML = visible.map(productCard).join("");
  count.textContent = visible.length;
}

function openProduct(product) {
  const dialogVisual = document.querySelector("#dialog-visual");
  dialogVisual.classList.toggle("has-photo", Boolean(product.image));
  dialogVisual.innerHTML = product.image
    ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.imageAlt || product.name)}" />`
    : "<span>Фото готовится</span>";
  document.querySelector("#dialog-category").textContent = categoryNames[product.category];
  document.querySelector("#dialog-title").textContent = product.name;
  document.querySelector("#dialog-description").textContent = product.description;
  document.querySelector("#dialog-size").textContent = product.size;
  document.querySelector("#dialog-time").textContent = product.time;
  document.querySelector("#dialog-status").textContent = statusNames[product.status];
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

grid?.addEventListener("click", (event) => {
  const card = event.target.closest(".product-card");
  if (!card) return;
  openProduct(products.find((product) => product.id === Number(card.dataset.id)));
});

closeButton?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
discussOrder?.addEventListener("click", () => dialog.close());

if (grid) {
  fetch(`data/catalog.json?v=${Date.now()}`, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`Каталог недоступен: ${response.status}`);
      return response.json();
    })
    .then((catalog) => {
      if (!Array.isArray(catalog.products)) throw new Error("Неверный формат каталога");
      products = catalog.products.map((product, index) => ({ ...product, id: index + 1 }));
      render(filters.find((filter) => filter.classList.contains("is-active"))?.dataset.filter);
    })
    .catch(() => {
      grid.textContent = "Не удалось загрузить каталог. Обновите страницу позже.";
      count.textContent = "0";
    });
}
