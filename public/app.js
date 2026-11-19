const $ = (s) => document.querySelector(s);
const money = (n) => new Intl.NumberFormat('ru-RU').format(Number(n)) + ' ₸';
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));

let timer;
let productsCache = [];
let cart = [];

async function loadCategories() {
  const res = await fetch('/api/categories');
  if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);
  const categories = await res.json();

  const optionsHtml = categories
    .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
    .join('');

  $('#category').innerHTML = '<option value="">Все категории</option>' + optionsHtml;
  $('#prod-category').innerHTML = optionsHtml;
}

async function loadProducts() {
  const params = new URLSearchParams({
    search: $('#search').value,
    category: $('#category').value,
    sort: $('#sort').value,
  });

  const res = await fetch('/api/products?' + params);
  if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);
  const products = await res.json();
  productsCache = products;

  $('#products').innerHTML = products.length
    ? products
        .map(
          (p) => `
      <article class="product-card">
        <div class="product-photo" style="background-image:url('${esc(p.image_url)}')">
          <span>${esc(p.category_name)}</span>
        </div>
        <div class="product-info">
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.description)}</p>
          <div class="product-meta">
            <strong>${money(p.price)}</strong>
            <button class="add-btn" type="button" data-add="${p.id}">В корзину</button>
          </div>
        </div>
      </article>`
        )
        .join('')
    : '<p>По вашему запросу ничего не найдено.</p>';
}

async function loadOrders() {
  $('#orders-list').innerHTML = '<p>Загрузка заказов...</p>';
  const res = await fetch('/api/orders');
  const data = await res.json();

  if (!res.ok) {
    $('#orders-list').innerHTML = `<p>${esc(data.error || 'Не удалось загрузить заказы')}</p>`;
    return;
  }

  $('#orders-list').innerHTML = data.length
    ? data
        .map(
          (o) => `
      <div class="order-card">
        <div class="order-card-head">
          <strong>Заказ #${o.id} — ${esc(o.customer_name)} (${esc(o.customer_phone)})</strong>
          <strong>${money(o.total_amount)}</strong>
        </div>
        ${o.comment ? `<small>Комментарий: ${esc(o.comment)}</small>` : ''}
        <ul class="order-card-items">
          ${(o.items || [])
            .map((i) => `<li>${esc(i.product_name)} × ${i.quantity} (${money(i.unit_price)})</li>`)
            .join('')}
        </ul>
      </div>`
        )
        .join('')
    : '<p>Оформленных заказов пока нет.</p>';
}

function addToCart(productId) {
  const prod = productsCache.find((item) => item.id === Number(productId));
  if (!prod) return;

  const existing = cart.find((item) => item.product_id === prod.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      product_id: prod.id,
      name: prod.name,
      price: Number(prod.price),
      quantity: 1,
    });
  }
  renderCart();
}

function renderCart() {
  const count = cart.reduce((acc, item) => acc + item.quantity, 0);
  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  $('#cart-count').textContent = String(count);
  $('#cart-total').textContent = money(total);

  $('#cart-items').innerHTML = cart.length
    ? cart
        .map(
          (item) => `
      <div class="cart-row">
        <div>
          <strong>${esc(item.name)}</strong><br/>
          <small>${item.quantity} × ${money(item.price)}</small>
        </div>
        <strong>${money(item.price * item.quantity)}</strong>
      </div>`
        )
        .join('')
    : '<p>Корзина пока пуста.</p>';
}

$('#products').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-add]');
  if (btn) addToCart(btn.dataset.add);
});

$('#open-add-modal-btn').addEventListener('click', () => {
  $('#add-product-status').textContent = '';
  $('#add-product-modal').classList.remove('hidden');
});

$('#close-add-modal-btn').addEventListener('click', () => {
  $('#add-product-modal').classList.add('hidden');
});

$('#open-orders-modal-btn').addEventListener('click', () => {
  $('#orders-modal').classList.remove('hidden');
  loadOrders();
});

$('#close-orders-modal-btn').addEventListener('click', () => {
  $('#orders-modal').classList.add('hidden');
});

$('#add-product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name: $('#prod-name').value.trim(),
    category_id: Number($('#prod-category').value),
    price: Number($('#prod-price').value),
    description: $('#prod-description').value.trim(),
    image_url: $('#prod-image').value.trim(),
  };

  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (!res.ok) {
    $('#add-product-status').textContent = data.error || 'Ошибка добавления товара';
    return;
  }

  $('#add-product-form').reset();
  $('#add-product-modal').classList.add('hidden');
  await loadProducts();
});

$('#open-cart-btn').addEventListener('click', () => {
  $('#order-status').textContent = '';
  $('#cart-drawer').classList.remove('hidden');
});

$('#close-cart-btn').addEventListener('click', () => {
  $('#cart-drawer').classList.add('hidden');
});

$('#order-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!cart.length) {
    $('#order-status').textContent = 'Добавьте хотя бы один товар в корзину.';
    return;
  }

  const payload = {
    customer_name: $('#customer-name').value.trim(),
    customer_phone: $('#customer-phone').value.trim(),
    comment: $('#order-comment').value.trim(),
    items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
  };

  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (!res.ok) {
    $('#order-status').textContent = data.error || 'Ошибка оформления заказа';
    return;
  }

  cart = [];
  renderCart();
  $('#order-form').reset();
  $('#order-status').textContent = `Заказ #${data.order.id} оформлен на сумму ${money(data.order.total_amount)}!`;
});

$('#search').addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(loadProducts, 250);
});
$('#category').addEventListener('change', loadProducts);
$('#sort').addEventListener('change', loadProducts);

renderCart();
loadCategories()
  .then(loadProducts)
  .catch(() => {
    $('#products').innerHTML =
      '<p>Не удалось подключиться к базе данных. Проверьте запуск сервера и PostgreSQL.</p>';
  });
