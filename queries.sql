-- 1. SELECT + WHERE: показать товары выбранной категории (например, кофе)
SELECT p.id, p.name, p.price, c.name AS category
FROM products p
INNER JOIN categories c ON c.id = p.category_id
WHERE c.name = 'Кофе';

-- 2. ORDER BY: отсортировать товары по цене от дешёвых к дорогим
SELECT id, name, price
FROM products
ORDER BY price ASC;

-- 3. INNER JOIN: вывести товары вместе с названиями категорий
SELECT p.name AS product, c.name AS category, p.price
FROM products p
INNER JOIN categories c ON c.id = p.category_id
ORDER BY c.name, p.name;

-- 4. COUNT + GROUP BY: количество товаров в каждой категории
SELECT c.name AS category, COUNT(p.id) AS product_count
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.id, c.name
ORDER BY product_count DESC;

-- 5. ILIKE: найти товары, в названии которых есть часть слова
SELECT id, name, price
FROM products
WHERE name ILIKE '%латте%';

-- Дополнительно: сумма каждого заказа
SELECT o.id, o.customer_name,
       SUM(oi.quantity * oi.unit_price) AS total
FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.customer_name
ORDER BY o.id;
