require('dotenv').config();
const path = require('path');
const express = require('express');
const { pool } = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);

const DEFAULT_COFFEE_IMAGE =
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (err) {
    console.error('Ошибка проверки БД:', err);
    res.status(500).json({ error: 'Ошибка подключения к базе данных' });
  }
});

app.get('/api/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, slug FROM categories ORDER BY id ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Ошибка при получении категорий:', err);
    res.status(500).json({ error: 'Не удалось загрузить категории' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();
    const sort = String(req.query.sort || '').trim();

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }

    if (category) {
      params.push(Number(category));
      conditions.push(`p.category_id = $${params.length}`);
    }

    let orderBy = 'p.id DESC';
    if (sort === 'price_asc') orderBy = 'p.price ASC, p.id DESC';
    if (sort === 'price_desc') orderBy = 'p.price DESC, p.id DESC';
    if (sort === 'name_asc') orderBy = 'p.name ASC';

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT
         p.id,
         p.category_id,
         c.name AS category_name,
         p.name,
         p.description,
         p.price,
         p.image_url
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${whereClause}
       ORDER BY ${orderBy}`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('Ошибка при получении товаров:', err);
    res.status(500).json({ error: 'Не удалось загрузить товары' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const categoryId = Number(req.body.category_id);
    const price = Number(req.body.price);
    const description = String(req.body.description || '').trim();
    const imageUrl = String(req.body.image_url || '').trim() || DEFAULT_COFFEE_IMAGE;

    if (!name) {
      return res.status(400).json({ error: 'Введите название товара' });
    }
    if (!categoryId || Number.isNaN(categoryId)) {
      return res.status(400).json({ error: 'Выберите категорию' });
    }
    if (Number.isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Укажите корректную цену (0 или больше)' });
    }

    const catCheck = await pool.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
    if (!catCheck.rows.length) {
      return res.status(400).json({ error: 'Выбранная категория не найдена' });
    }

    const { rows } = await pool.query(
      `INSERT INTO products (category_id, name, description, price, image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, category_id, name, description, price, image_url`,
      [categoryId, name, description, price, imageUrl]
    );

    res.status(201).json({ product: rows[0] });
  } catch (err) {
    console.error('Ошибка при добавлении товара:', err);
    res.status(500).json({ error: 'Не удалось добавить товар' });
  }
});

app.get('/api/orders', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         o.id,
         o.customer_name,
         o.customer_phone,
         o.comment,
         o.total_amount,
         o.created_at,
         COALESCE(
           json_agg(
             json_build_object(
               'product_name', p.name,
               'quantity', oi.quantity,
               'unit_price', oi.unit_price
             )
           ) FILTER (WHERE oi.id IS NOT NULL),
           '[]'
         ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       LEFT JOIN products p ON p.id = oi.product_id
       GROUP BY o.id
       ORDER BY o.id DESC
       LIMIT 30`
    );
    res.json(rows);
  } catch (err) {
    console.error('Ошибка при загрузке заказов:', err);
    res.status(500).json({ error: 'Не удалось загрузить заказы' });
  }
});

app.post('/api/orders', async (req, res) => {
  const client = await pool.connect();
  try {
    const customerName = String(req.body.customer_name || '').trim();
    const customerPhone = String(req.body.customer_phone || '').trim();
    const comment = String(req.body.comment || '').trim();
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    if (!customerName || !customerPhone) {
      return res.status(400).json({ error: 'Укажите имя и телефон для заказа' });
    }
    if (items.length === 0) {
      return res.status(400).json({ error: 'Корзина пуста' });
    }

    await client.query('BEGIN');

    let totalAmount = 0;
    const normalizedItems = [];

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);
      if (!productId || !quantity || quantity <= 0) {
        throw new Error('INVALID_ITEM');
      }

      const { rows } = await client.query(
        'SELECT id, price FROM products WHERE id = $1',
        [productId]
      );
      if (!rows.length) {
        throw new Error('PRODUCT_NOT_FOUND');
      }

      const unitPrice = Number(rows[0].price);
      totalAmount += unitPrice * quantity;
      normalizedItems.push({ productId, quantity, unitPrice });
    }

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (customer_name, customer_phone, comment, total_amount)
       VALUES ($1, $2, $3, $4)
       RETURNING id, total_amount, created_at`,
      [customerName, customerPhone, comment, totalAmount]
    );

    const order = orderRows[0];

    for (const entry of normalizedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, entry.productId, entry.quantity, entry.unitPrice]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ order });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.message === 'INVALID_ITEM' || err.message === 'PRODUCT_NOT_FOUND') {
      return res.status(400).json({ error: 'Некорректные позиции в заказе' });
    }
    console.error('Ошибка при создании заказа:', err);
    res.status(500).json({ error: 'Не удалось оформить заказ' });
  } finally {
    client.release();
  }
});

app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Brew Coffee запущен: http://localhost:${PORT}`);
});
