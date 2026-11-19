DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(40) NOT NULL,
  comment TEXT DEFAULT '',
  total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0)
);

INSERT INTO categories (name, slug) VALUES
  ('Эспрессо и классика', 'espresso-classic'),
  ('Альтернатива и фильтр', 'filter-alternative'),
  ('Холодный кофе', 'cold-coffee'),
  ('Выпечка к кофе', 'bakery');

INSERT INTO products (category_id, name, description, price, image_url) VALUES
  (1, 'Флэт Уайт', 'Двойной шот эспрессо и бархатистая микропена с мягким сливочным послевкусием.', 1650, 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=800&q=80'),
  (1, 'Капучино Классик', 'Сбалансированный эспрессо с нежной молочной пенкой и нотами жареного фундука.', 1500, 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=800&q=80'),
  (2, 'V60 Пуровер Эфиопия', 'Ручной пролив с яркими нотами бергамота, персика и цветочного чая.', 1900, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80'),
  (2, 'Аэропресс Кения', 'Плотный и чистый фильтр-кофе с ягодной кислинкой и сладким какао-финишем.', 1850, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80'),
  (3, 'Айс Латте Ваниль', 'Охлаждённый эспрессо со льдом, молоком и натуральным ванильным сиропом.', 1750, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80'),
  (3, 'Колд Брю 18ч', 'Холодная экстракция в течение 18 часов: мягкий шоколадный вкус без горечи.', 1800, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80'),
  (4, 'Миндальный круассан', 'Слоёная выпечка с миндальным франжипаном и хрустящими лепестками миндаля.', 1400, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=800&q=80'),
  (4, 'Баскский чизкейк', 'Карамелизированная корочка и кремовая текстура — идеальная пара к фильтру.', 2100, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80');
