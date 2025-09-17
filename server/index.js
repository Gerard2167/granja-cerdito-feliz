const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Cargar variables de entorno desde el archivo .env apropiado
require('dotenv').config({ path: path.resolve(__dirname, `../.env.${process.env.NODE_ENV || 'development'}`) });

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your_super_secret_key'; // ¡Cambia esto por una clave secreta real y segura!

// --- INICIO DE LA CONFIGURACIÓN DE LA BASE DE DATOS ---
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
};

const pool = mysql.createPool(dbConfig);

// Función para inicializar la base de datos y crear las tablas
async function initializeDatabase() {
    console.log('Conectando a la base de datos...');
    try {
        const connection = await pool.promise().getConnection();
        console.log('Conexión a la base de datos MySQL establecida.');

        const tables = {
            roles: `CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(255) NOT NULL UNIQUE
            )`,
            users: `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(255) NOT NULL UNIQUE,
                nombre VARCHAR(255),
                password VARCHAR(255) NOT NULL,
                role_id INTEGER,
                FOREIGN KEY (role_id) REFERENCES roles(id)
            )`,
            clientes: `CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                nombre TEXT NOT NULL,
                telefono TEXT,
                email TEXT,
                direccion TEXT
            )`,
            ventas: `CREATE TABLE IF NOT EXISTS ventas (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                cliente TEXT NOT NULL,
                producto TEXT NOT NULL,
                cantidad REAL NOT NULL,
                precioUnitario REAL NOT NULL,
                total REAL NOT NULL,
                fecha TEXT NOT NULL,
                estadoPago TEXT NOT NULL
            )`,
            inventario: `CREATE TABLE IF NOT EXISTS inventario (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                stock REAL NOT NULL,
                unidad TEXT,
                precioCompra REAL,
                precioVenta REAL NOT NULL,
                proveedor TEXT
            )`,
            gastos: `CREATE TABLE IF NOT EXISTS gastos (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                fecha TEXT NOT NULL,
                categoria TEXT NOT NULL,
                descripcion TEXT,
                monto REAL NOT NULL,
                metodoPago TEXT,
                numeroFactura TEXT
            )`,
            proveedores: `CREATE TABLE IF NOT EXISTS proveedores (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                nombre TEXT NOT NULL,
                personaContacto TEXT,
                telefono TEXT,
                email TEXT,
                direccion TEXT,
                productosServicios TEXT,
                terminosPago TEXT
            )`,
            pagos: `CREATE TABLE IF NOT EXISTS pagos (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                fecha TEXT NOT NULL,
                tipo TEXT NOT NULL,
                concepto TEXT NOT NULL,
                monto REAL NOT NULL,
                metodo TEXT NOT NULL,
                entidadRelacionada TEXT,
                referencia TEXT
            )`,
            colaboradores: `CREATE TABLE IF NOT EXISTS colaboradores (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                nombre TEXT NOT NULL,
                cargo TEXT,
                telefono TEXT,
                email TEXT,
                direccion TEXT,
                fechaInicio TEXT,
                salario REAL,
                notas TEXT
            )`,
            calendarios: `CREATE TABLE IF NOT EXISTS calendarios (
                id INTEGER PRIMARY KEY AUTO_INCREMENT,
                fecha TEXT NOT NULL,
                tipo TEXT NOT NULL,
                descripcion TEXT NOT NULL,
                responsable TEXT,
                estado TEXT NOT NULL
            )`,
            settings: "CREATE TABLE IF NOT EXISTS settings (`key` VARCHAR(255) PRIMARY KEY, value TEXT)"
        };

        for (const [tableName, createQuery] of Object.entries(tables)) {
            await connection.query(createQuery);
            console.log(`Tabla '${tableName}' verificada/creada.`);
        }

        // Add 'nombre' column to users table if it doesn't exist
        try {
            await connection.query("ALTER TABLE users ADD COLUMN nombre VARCHAR(255)");
            console.log('Columna \'nombre\' añadida a la tabla users.');
        } catch (alterError) {
            if (alterError.code === 'ER_DUP_FIELD_NAME') {
                console.log('Columna \'nombre\' ya existe en la tabla users.');
            } else {
                console.error('Error al añadir columna \'nombre\' a la tabla users:', alterError);
            }
        }

        // Insertar roles si no existen
        const [rows] = await connection.query('SELECT * FROM roles');
        if (rows.length === 0) {
            const rolesToInsert = [
                'Administrador General', 'Contador / Finanzas', 'Vendedor',
                'Encargado de Inventario', 'Colaborador / Empleado', 'Supervisor de Producción'
            ];
            for (const roleName of rolesToInsert) {
                await connection.query('INSERT INTO roles (nombre) VALUES (?)', [roleName]);
                console.log(`Rol '${roleName}' insertado.`);
            }
        }

        // Crear usuario administrador por defecto si no existe
        const [adminUsers] = await connection.query("SELECT * FROM users WHERE username = 'admin'");
        if (adminUsers.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const [adminRole] = await connection.query("SELECT id FROM roles WHERE nombre = 'Administrador General'");
            if (adminRole.length > 0) {
                await connection.query('INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)', ['admin', hashedPassword, adminRole[0].id]);
                console.log('Usuario administrador por defecto creado.');
            }
        }


        connection.release();
        console.log('Inicialización de la base de datos completada.');

    } catch (err) {
        console.error('Error al inicializar la base de datos:', err);
        process.exit(1);
    }
}

// --- FIN DE LA CONFIGURACIÓN DE LA BASE DE DATOS ---

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- INICIO DE RUTAS DE AUTENTICACIÓN Y USUARIOS ---

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    console.log(`Intento de login para el usuario: ${username}`);

    // --- INICIO: Bloque para resetear la contraseña de admin ---
    if (username === 'admin') {
        try {
            console.log('Intentando resetear la contraseña para el usuario admin...');
            const newHashedPassword = await bcrypt.hash('admin123', 10);
            await pool.promise().query('UPDATE users SET password = ? WHERE username = ?', [newHashedPassword, 'admin']);
            console.log('Contraseña del usuario admin reseteada en la base de datos.');
        } catch (resetError) {
            console.error('Error al intentar resetear la contraseña de admin:', resetError);
            // No bloqueamos el login si el reseteo falla, solo lo registramos.
        }
    }
    // --- FIN: Bloque para resetear la contraseña de admin ---

    try {
        const [users] = await pool.promise().query('SELECT users.*, roles.nombre as role FROM users JOIN roles ON users.role_id = roles.id WHERE username = ?', [username]);
        if (users.length === 0) {
            console.log(`Usuario no encontrado: ${username}`);
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        const user = users[0];
        console.log(`Usuario encontrado: ${username}. Verificando contraseña...`);
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            console.log(`Contraseña incorrecta para el usuario: ${username}`);
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }
        console.log(`Login exitoso para el usuario: ${username}`);
        const token = jwt.sign({ id: user.id, username: user.username, nombre: user.nombre, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, role: user.role, nombre: user.nombre });
    } catch (err) {
        console.error('Error en el proceso de login:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// Middleware para verificar el token y los permisos
const authenticateJWT = (requiredRoles) => {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            jwt.verify(token, JWT_SECRET, (err, user) => {
                if (err) {
                    return res.sendStatus(403); // Token inválido
                }
                req.user = user;
                if (requiredRoles && !requiredRoles.includes(user.role)) {
                    return res.status(403).json({ error: 'Acceso no autorizado para este rol' });
                }
                next();
            });
        } else {
            res.sendStatus(401); // No hay token
        }
    };
};

// Rutas para la gestión de usuarios y roles
app.get('/roles', authenticateJWT(['Administrador General']), async (req, res) => {
    try {
        const [roles] = await pool.promise().query('SELECT * FROM roles');
        res.json(roles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/users', authenticateJWT(['Administrador General']), async (req, res) => {
    try {
        const [users] = await pool.promise().query('SELECT users.id, users.username, users.nombre, roles.nombre as role, users.role_id FROM users JOIN roles ON users.role_id = roles.id');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/users', authenticateJWT(['Administrador General']), async (req, res) => {
    const { username, nombre, password, role_id } = req.body;
    if (!username || !nombre || !password || !role_id) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.promise().query('INSERT INTO users (username, nombre, password, role_id) VALUES (?, ?, ?, ?)', [username, nombre, hashedPassword, role_id]);
        res.status(201).json({ id: result.insertId, username, nombre, role_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/users/:id', authenticateJWT(['Administrador General']), async (req, res) => {
    const { id } = req.params;
    const { username, nombre, password, role_id } = req.body;

    if (!username || !nombre || !role_id) {
        return res.status(400).json({ error: 'El nombre de usuario, el nombre y el rol son requeridos' });
    }

    let query = 'UPDATE users SET username = ?, nombre = ?, role_id = ?';
    const params = [username, nombre, role_id];

    if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        query += ', password = ?';
        params.push(hashedPassword);
    }

    query += ' WHERE id = ?';
    params.push(id);

    try {
        await pool.promise().query(query, params);
        res.json({ id, username, nombre, role_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/users/:id', authenticateJWT(['Administrador General']), async (req, res) => {
    const { id } = req.params;
    try {
        await pool.promise().query('DELETE FROM users WHERE id = ?', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/users/change-password', authenticateJWT(), async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id; // User ID from the authenticated JWT

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Ambas contraseñas son requeridas' });
    }

    try {
        const [users] = await pool.promise().query('SELECT password FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = users[0];
        const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ error: 'Contraseña antigua incorrecta' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await pool.promise().query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);

        res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (err) {
        console.error('Error al cambiar la contraseña:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// --- FIN DE RUTAS DE AUTENTICACIÓN Y USUARIOS ---


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Rutas API para Clientes
app.get('/clientes', authenticateJWT(['Administrador General', 'Vendedor']), (req, res) => {
    pool.query("SELECT * FROM clientes", (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(results);
    });
});
app.post('/clientes', authenticateJWT(['Administrador General', 'Vendedor']), (req, res) => {
    console.log('--- INTENTO DE GUARDAR CLIENTE RECIBIDO ---');
    console.log('Body de la petición:', req.body);
    const { nombre, telefono, email, direccion } = req.body;
    if (!nombre) {
        console.log('Error: El nombre es requerido.');
        res.status(400).json({ "error": "El nombre es requerido" });
        return;
    }
    pool.query(`INSERT INTO clientes (nombre, telefono, email, direccion) VALUES (?, ?, ?, ?)`,
        [nombre, telefono, email, direccion],
        (err, results) => {
            if (err) {
                console.error('Error de base de datos al guardar cliente:', err);
                res.status(400).json({ "error": err.message });
                return;
            }
            console.log('Cliente guardado con éxito. Resultado:', results);
            res.status(201).json({ id: results.insertId, nombre, telefono, email, direccion });
        }
    );
});
app.put('/clientes/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const { nombre, telefono, email, direccion } = req.body;
    const id = parseInt(req.params.id);
    if (!nombre) { res.status(400).json({ "error": "El nombre es requerido" }); return; }
    pool.query(`UPDATE clientes SET nombre = ?, telefono = ?, email = ?, direccion = ? WHERE id = ?`,
        [nombre, telefono, email, direccion, id],
        (err, results) => {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            if (results.affectedRows === 0) { res.status(404).json({ "error": "Cliente no encontrado" }); }
            else { res.json({ id, nombre, telefono, email, direccion }); }
        }
    );
});
app.delete('/clientes/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const id = parseInt(req.params.id);
    pool.query(`DELETE FROM clientes WHERE id = ?`, [id], (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Cliente no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Ventas
app.get('/ventas', authenticateJWT(['Administrador General', 'Contador / Finanzas', 'Vendedor']), (req, res) => {
    pool.query("SELECT * FROM ventas", (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(results);
    });
});
app.post('/ventas', authenticateJWT(['Administrador General', 'Vendedor']), (req, res) => {
    const { cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago } = req.body;
    const query = `INSERT INTO ventas (cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.status(201).json({ id: results.insertId, ...req.body });
    });
});
app.put('/ventas/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const { cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago } = req.body;
    const id = parseInt(req.params.id);
    const query = `UPDATE ventas SET cliente = ?, producto = ?, cantidad = ?, precioUnitario = ?, total = ?, fecha = ?, estadoPago = ? WHERE id = ?`;
    const params = [cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago, id];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Venta no encontrada" }); }
        else { res.json({ id, ...req.body }); }
    });
});
app.delete('/ventas/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const id = parseInt(req.params.id);
    pool.query(`DELETE FROM ventas WHERE id = ?`, [id], (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Venta no encontrada" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Inventario
app.get('/inventario', authenticateJWT(['Administrador General', 'Vendedor', 'Encargado de Inventario', 'Supervisor de Producción']), (req, res) => {
    pool.query("SELECT * FROM inventario", (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(results);
    });
});
app.post('/inventario', authenticateJWT(['Administrador General', 'Encargado de Inventario']), (req, res) => {
    const { nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor } = req.body;
    const query = `INSERT INTO inventario (nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.status(201).json({ id: results.insertId, ...req.body });
    });
});
app.put('/inventario/:id', authenticateJWT(['Administrador General', 'Encargado de Inventario']), (req, res) => {
    const { nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor } = req.body;
    const id = parseInt(req.params.id);
    const query = `UPDATE inventario SET nombre = ?, descripcion = ?, stock = ?, unidad = ?, precioCompra = ?, precioVenta = ?, proveedor = ? WHERE id = ?`;
    const params = [nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor, id];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Producto no encontrado" }); }
        else { res.json({ id, ...req.body }); }
    });
});
app.delete('/inventario/:id', authenticateJWT(['Administrador General', 'Encargado de Inventario']), (req, res) => {
    const id = parseInt(req.params.id);
    pool.query(`DELETE FROM inventario WHERE id = ?`, [id], (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Producto no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Gastos
app.get('/gastos', authenticateJWT(['Administrador General', 'Contador / Finanzas', 'Vendedor']), (req, res) => {
    pool.query("SELECT * FROM gastos", (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(results);
    });
});
app.post('/gastos', authenticateJWT(['Administrador General', 'Contador / Finanzas']), (req, res) => {
    const { fecha, categoria, descripcion, monto, metodoPago, numeroFactura } = req.body;
    const query = `INSERT INTO gastos (fecha, categoria, descripcion, monto, metodoPago, numeroFactura) VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [fecha, categoria, descripcion, monto, metodoPago, numeroFactura];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.status(201).json({ id: results.insertId, ...req.body });
    });
});
app.put('/gastos/:id', authenticateJWT(['Administrador General', 'Contador / Finanzas']), (req, res) => {
    const { fecha, categoria, descripcion, monto, metodoPago, numeroFactura } = req.body;
    const id = parseInt(req.params.id);
    const query = `UPDATE gastos SET fecha = ?, categoria = ?, descripcion = ?, monto = ?, metodoPago = ?, numeroFactura = ? WHERE id = ?`;
    const params = [fecha, categoria, descripcion, monto, metodoPago, numeroFactura, id];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Gasto no encontrado" }); }
        else { res.json({ id, ...req.body }); }
    });
});
app.delete('/gastos/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const id = parseInt(req.params.id);
    pool.query(`DELETE FROM gastos WHERE id = ?`, [id], (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Gasto no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Proveedores
app.get('/proveedores', authenticateJWT(['Administrador General', 'Encargado de Inventario', 'Supervisor de Producción']), (req, res) => {
    pool.query("SELECT * FROM proveedores", (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(results);
    });
});
app.post('/proveedores', authenticateJWT(['Administrador General', 'Encargado de Inventario', 'Supervisor de Producción']), (req, res) => {
    const { nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago } = req.body;
    const query = `INSERT INTO proveedores (nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.status(201).json({ id: results.insertId, ...req.body });
    });
});
app.put('/proveedores/:id', authenticateJWT(['Administrador General', 'Supervisor de Producción']), (req, res) => {
    const { nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago } = req.body;
    const id = parseInt(req.params.id);
    const query = `UPDATE proveedores SET nombre = ?, personaContacto = ?, telefono = ?, email = ?, direccion = ?, productosServicios = ?, terminosPago = ? WHERE id = ?`;
    const params = [nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago, id];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Proveedor no encontrado" }); }
        else { res.json({ id, ...req.body }); }
    });
});
app.delete('/proveedores/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const id = parseInt(req.params.id);
    pool.query(`DELETE FROM proveedores WHERE id = ?`, [id], (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Proveedor no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Pagos
app.get('/pagos', authenticateJWT(['Administrador General', 'Contador / Finanzas']), (req, res) => {
    pool.query("SELECT * FROM pagos", (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(results);
    });
});
app.post('/pagos', authenticateJWT(['Administrador General', 'Contador / Finanzas']), (req, res) => {
    const { fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia } = req.body;
    const query = `INSERT INTO pagos (fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.status(201).json({ id: results.insertId, ...req.body });
    });
});
app.put('/pagos/:id', authenticateJWT(['Administrador General', 'Contador / Finanzas']), (req, res) => {
    const { fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia } = req.body;
    const id = parseInt(req.params.id);
    const query = `UPDATE pagos SET fecha = ?, tipo = ?, concepto = ?, monto = ?, metodo = ?, entidadRelacionada = ?, referencia = ? WHERE id = ?`;
    const params = [fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia, id];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Pago no encontrado" }); }
        else { res.json({ id, ...req.body }); }
    });
});
app.delete('/pagos/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const id = parseInt(req.params.id);
    pool.query(`DELETE FROM pagos WHERE id = ?`, [id], (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Pago no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Colaboradores
app.get('/colaboradores', authenticateJWT(['Administrador General', 'Supervisor de Producción']), (req, res) => {
    pool.query("SELECT * FROM colaboradores", (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(results);
    });
});
app.post('/colaboradores', authenticateJWT(['Administrador General']), (req, res) => {
    const { nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas } = req.body;
    const query = `INSERT INTO colaboradores (nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.status(201).json({ id: results.insertId, ...req.body });
    });
});
app.put('/colaboradores/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const { nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas } = req.body;
    const id = parseInt(req.params.id);
    const query = `UPDATE colaboradores SET nombre = ?, cargo = ?, telefono = ?, email = ?, direccion = ?, fechaInicio = ?, salario = ?, notas = ? WHERE id = ?`;
    const params = [nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas, id];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Colaborador no encontrado" }); }
        else { res.json({ id, ...req.body }); }
    });
});
app.delete('/colaboradores/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const id = parseInt(req.params.id);
    pool.query(`DELETE FROM colaboradores WHERE id = ?`, [id], (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Colaborador no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Calendarios
app.get('/calendarios', authenticateJWT(['Administrador General', 'Colaborador / Empleado', 'Supervisor de Producción']), (req, res) => {
    pool.query("SELECT * FROM calendarios", (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(results);
    });
});
app.post('/calendarios', authenticateJWT(['Administrador General', 'Supervisor de Producción']), (req, res) => {
    const { fecha, tipo, descripcion, responsable, estado } = req.body;
    const query = `INSERT INTO calendarios (fecha, tipo, descripcion, responsable, estado) VALUES (?, ?, ?, ?, ?)`;
    const params = [fecha, tipo, descripcion, responsable, estado];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.status(201).json({ id: results.insertId, ...req.body });
    });
});
app.put('/calendarios/:id', authenticateJWT(['Administrador General', 'Supervisor de Producción']), (req, res) => {
    const { fecha, tipo, descripcion, responsable, estado } = req.body;
    const id = parseInt(req.params.id);
    const query = `UPDATE calendarios SET fecha = ?, tipo = ?, descripcion = ?, responsable = ?, estado = ? WHERE id = ?`;
    const params = [fecha, tipo, descripcion, responsable, estado, id];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Evento de calendario no encontrado" }); }
        else { res.json({ id, ...req.body }); }
    });
});
app.delete('/calendarios/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const id = parseInt(req.params.id);
    pool.query(`DELETE FROM calendarios WHERE id = ?`, [id], (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ "error": "Evento de calendario no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Secuenciales (Facturas/Recibos)
app.get('/sequence/:key', authenticateJWT(['Administrador General', 'Vendedor']), (req, res) => {
    const key = req.params.key;
    pool.query('SELECT value FROM settings WHERE `key` = ?', [key], (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json({ value: results.length > 0 ? parseInt(results[0].value, 10) : 0 });
    });
});

app.post('/sequence/:key/increment', authenticateJWT(['Administrador General', 'Vendedor']), (req, res) => {
    const key = req.params.key;
    const query = "INSERT INTO settings (`key`, value) VALUES (?, 1) ON DUPLICATE KEY UPDATE value = value + 1";
    pool.query(query, [key], (err, results) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        pool.query('SELECT value FROM settings WHERE `key` = ?', [key], (err, results) => {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            res.json({ value: parseInt(results[0].value, 10) });
        });
    });
});


// Iniciar la base de datos.
// initializeDatabase().catch(err => {
//     console.error('Fallo catastrófico en la inicialización de la base de datos.', err);
// });

// app.listen(PORT, () => {
//     console.log(`Servidor corriendo en http://localhost:${PORT}`);
// });

// En un entorno como LiteSpeed/Passenger, solo necesitamos exportar la app.
// El servidor web se encarga de escuchar las peticiones.
module.exports = app;