const products = [
  { id: 1, category: "clock", categoryName: "Часы", name: "Тихая глубина", status: "available", statusName: "В наличии", price: "8 900 ₽", size: "Ø 40 см", time: "Готово к отправке", image: "assets/product-clock-emerald.png", imageAlt: "Часы из изумрудной эпоксидной смолы и тёмного дерева", description: "Настенные часы в глубоком зелёном оттенке с тёплыми металлическими акцентами." },
  { id: 2, category: "clock", categoryName: "Часы", name: "Полярный берег", status: "order", statusName: "Под заказ", price: "от 9 500 ₽", size: "Ø 45 см", time: "14–21 день", description: "Светлая композиция с плавным рисунком, напоминающим линию морского берега." },
  { id: 3, category: "clock", categoryName: "Часы", name: "Янтарный круг", status: "order", statusName: "Под заказ", price: "от 8 500 ₽", size: "Ø 35 см", time: "14–21 день", description: "Камерные часы с янтарными переходами и выразительной природной фактурой." },
  { id: 4, category: "decor", categoryName: "Посуда и декор", name: "Лесное озеро", status: "available", statusName: "В наличии", price: "4 600 ₽", size: "38 × 24 см", time: "Готово к отправке", description: "Сервировочный поднос с мягким зелёным рисунком и удобными ручками." },
  { id: 5, category: "decor", categoryName: "Посуда и декор", name: "Северный свет", status: "order", statusName: "Под заказ", price: "от 3 200 ₽", size: "Комплект из 4 шт.", time: "10–14 дней", description: "Комплект подставок с прозрачными слоями и холодными серебристыми деталями." },
  { id: 6, category: "decor", categoryName: "Посуда и декор", name: "Золотой лист", status: "available", statusName: "В наличии", price: "5 800 ₽", size: "Ø 30 см", time: "Готово к отправке", description: "Декоративное блюдо с тонким золотистым акцентом для сервировки или интерьера." },
  { id: 7, category: "table", categoryName: "Столы", name: "Малахит", status: "order", statusName: "Под заказ", price: "от 42 000 ₽", size: "Ø 60 × 50 см", time: "30–45 дней", description: "Акцентный столик с выразительным рисунком столешницы и лаконичным основанием." },
  { id: 8, category: "table", categoryName: "Столы", name: "Ночная вода", status: "order", statusName: "Под заказ", price: "от 58 000 ₽", size: "90 × 55 × 45 см", time: "30–45 дней", description: "Журнальный стол с глубоким синим цветом и спокойным глянцевым отражением." },
  { id: 9, category: "table", categoryName: "Столы", name: "Тёплый берег", status: "order", statusName: "Под заказ", price: "от 48 000 ₽", size: "70 × 45 × 52 см", time: "30–45 дней", description: "Приставной столик с сочетанием древесной фактуры и прозрачной заливки." },
  { id: 10, category: "art", categoryName: "Картины", name: "Течение", status: "available", statusName: "В наличии", price: "12 000 ₽", size: "60 × 80 см", time: "Готово к отправке", description: "Абстрактная интерьерная работа с несколькими слоями цвета и ощущением движения." },
  { id: 11, category: "art", categoryName: "Картины", name: "Воздух", status: "order", statusName: "Под заказ", price: "от 14 000 ₽", size: "70 × 90 см", time: "21–30 дней", description: "Светлая композиция для спокойного интерьера, создаваемая в выбранной палитре." },
  { id: 12, category: "art", categoryName: "Картины", name: "Глубина леса", status: "available", statusName: "В наличии", price: "16 500 ₽", size: "80 × 100 см", time: "Готово к отправке", description: "Многослойная работа в зелёных и графитовых оттенках с золотистыми деталями." },
];

const grid = document.querySelector("#product-grid");
const count = document.querySelector("#catalog-count");
const filters = [...document.querySelectorAll(".filter")];
const dialog = document.querySelector("#product-dialog");
const closeButton = dialog.querySelector(".dialog-close");
const discussOrder = document.querySelector("#discuss-order");

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
  const visible = category === "all" ? products : products.filter((product) => product.category === category);
  grid.innerHTML = visible.map(productCard).join("");
  count.textContent = visible.length;
}

function openProduct(product) {
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
discussOrder.addEventListener("click", () => dialog.close());

render();
