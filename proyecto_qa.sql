create database if not exists Proyecto_QA;
use Proyecto_QA;

-- Tabla de usuarios
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    telefono VARCHAR(8) NOT null,
    password VARCHAR(255) NOT NULL,
    direccion VARCHAR(255) NOT null,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
Select * from usuarios;

-- Tabla de productos
CREATE TABLE productos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    imagen_url VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
Select * from productos;
-- Tabla del carrito de compras
CREATE TABLE carrito (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT DEFAULT 1,
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (usuario_id, producto_id)
);

Select * from carrito;
-- Insertar datos de ejemplo

-- Usuarios de ejemplo
INSERT INTO usuarios (nombre, email, password) VALUES
('Juan Pérez', 'juan@email.com', '$2y$10$example_hash_password_1'),
('María García', 'maria@email.com', '$2y$10$example_hash_password_2');

-- Productos de ejemplo
INSERT INTO productos (nombre, descripcion, precio, stock, imagen_url) VALUES
('Smartphone Galaxy', 'Teléfono inteligente de última generación con cámara de 108MP', 899.99, 50, 'https://example.com/smartphone.jpg'),
('Auriculares Bluetooth', 'Auriculares inalámbricos con cancelación de ruido', 199.99, 100, 'https://example.com/auriculares.jpg');

-- Ejemplo de productos en carrito (opcional)
INSERT INTO carrito (usuario_id, producto_id, cantidad) VALUES
(1, 1, 1),
(1, 2, 2);

-- Consultas útiles para el desarrollo

-- Ver carrito de un usuario específico
-- SELECT 
--     c.id as carrito_id,
--     u.nombre as usuario,
--     p.nombre as producto,
--     p.precio,
--     c.cantidad,
--     (p.precio * c.cantidad) as subtotal
-- FROM carrito c
-- JOIN usuarios u ON c.usuario_id = u.id
-- JOIN productos p ON c.producto_id = p.id
-- WHERE u.id = 1;

-- Ver total del carrito por usuario
-- SELECT 
--     u.nombre,
--     SUM(p.precio * c.cantidad) as total_carrito
-- FROM carrito c
-- JOIN usuarios u ON c.usuario_id = u.id
-- JOIN productos p ON c.producto_id = p.id
-- WHERE u.id = 1
-- GROUP BY u.id, u.nombre;


Select * from carrito;
Select * from productos;
Select * from usuarios; 

UPDATE productos SET imagen_url = '1ZeYPwRErd2W-uDmuB8E-O6PcE7yl_2Hx' WHERE id = 1;
UPDATE productos SET imagen_url = '1oerfd2F7o8buWh3Kjqv0CbEbzItIGGss' WHERE id = 2;
UPDATE productos SET imagen_url = '16vBaGImXHr3gjnf9o5UkJC5B3INjYZvW' WHERE id = 3;
UPDATE productos SET imagen_url = '1r-TcH9NnAsRYgm9tXjz9YJXKTAYmpdrR' WHERE id = 4;
UPDATE productos SET imagen_url = '18OZDTZ3pv3QNjD6fgMq5i4vTIi8aG10M' WHERE id = 5;