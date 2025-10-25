const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

// Cargar variables de entorno desde el archivo .env apropiado
require('dotenv').config({ path: path.resolve(__dirname, `../.env.${process.env.NODE_ENV || 'development'}`) });

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your_super_secret_key'; // ¡Cambia esto por una clave secreta real y segura!

// --- INICIO DE LA CONFIGURACIÓN DE MULTER ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'server/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });
// --- FIN DE LA CONFIGURACIÓN DE MULTER ---


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
    try {
        // Paso 1: Conectarse a MySQL sin especificar la base de datos para crearla.
        console.log('Verificando la existencia de la base de datos...');
        const tempConnection = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });

        await tempConnection.promise().query(`CREATE DATABASE IF NOT EXISTS 
${process.env.DB_DATABASE}
`);
        await tempConnection.promise().end();
        console.log(`Base de datos '${process.env.DB_DATABASE}' asegurada.`);

        // Ahora que la BD existe, el pool puede conectarse a ella sin problemas.
        console.log('Conectando a la base de datos...');
        const connection = await pool.promise().getConnection();
        console.log('Conexión a la base de datos MySQL establecida.');


        const tables = {
            roles: `CREATE TABLE IF NOT EXISTS roles (               id INTEGER PRIMARY KEY AUTO_INCREMENT,
               nombre VARCHAR(255) NOT NULL UNIQUE            )`, 
            users: `CREATE TABLE IF NOT EXISTS users (               id INTEGER PRIMARY KEY AUTO_INCREMENT,
               username VARCHAR(255) NOT NULL UNIQUE,
               nombre VARCHAR(255),
               password VARCHAR(255) NOT NULL,
               role_id INTEGER,
               FOREIGN KEY (role_id) REFERENCES roles(id)            )`,
            clientes: `CREATE TABLE IF NOT EXISTS clientes (               id INTEGER PRIMARY KEY AUTO_INCREMENT,
               nombre TEXT NOT NULL,
               telefono TEXT,
               email TEXT,
               direccion TEXT            )`,
            ventas: `CREATE TABLE IF NOT EXISTS ventas (               id INTEGER PRIMARY KEY AUTO_INCREMENT,
               cliente TEXT NOT NULL,
               producto TEXT NOT NULL,
               cantidad REAL NOT NULL,
               precioUnitario REAL NOT NULL,
               total REAL NOT NULL,
               fecha TEXT NOT NULL,
               estadoPago TEXT NOT NULL            )`,
            inventario: `CREATE TABLE IF NOT EXISTS inventario (               id INTEGER PRIMARY KEY AUTO_INCREMENT,
               nombre TEXT NOT NULL,
               descripcion TEXT,
               stock REAL NOT NULL,
               unidad TEXT,
               precioCompra REAL,
               precioVenta REAL NOT NULL,
               proveedor TEXT            )`,
            gastos: `CREATE TABLE IF NOT EXISTS gastos (               id INTEGER PRIMARY KEY AUTO_INCREMENT,
               fecha TEXT NOT NULL,
               categoria TEXT NOT NULL,
               descripcion TEXT,
               monto REAL NOT NULL,
               metodoPago TEXT,
               numeroFactura TEXT            )`,
            proveedores: `CREATE TABLE IF NOT EXISTS proveedores (               id INTEGER PRIMARY KEY AUTO_INCREMENT,
               nombre TEXT NOT NULL,
               personaContacto TEXT,
               telefono TEXT,
               email TEXT,
               direccion TEXT,
               productosServicios TEXT,
               terminosPago TEXT            )`,
            pagos: `CREATE TABLE IF NOT EXISTS pagos (               id INTEGER PRIMARY KEY AUTO_INCREMENT,
               fecha TEXT NOT NULL,
               tipo TEXT NOT NULL,
               concepto TEXT NOT NULL,
               monto REAL NOT NULL,
               metodo TEXT NOT NULL,
               entidadRelacionada TEXT,
               referencia TEXT            )`,
            colaboradores: `CREATE TABLE IF NOT EXISTS colaboradores (
               id INTEGER PRIMARY KEY AUTO_INCREMENT,
               nombre TEXT NOT NULL,
               cargo TEXT,
               telefono TEXT,
               email TEXT,
               direccion TEXT,
               fechaInicio TEXT,
               salario REAL,
               notas TEXT,
               user_id INTEGER,
               FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )`,
                        calendarios: `CREATE TABLE IF NOT EXISTS calendarios (               id INTEGER PRIMARY KEY AUTO_INCREMENT,
                           fecha TEXT NOT NULL,
                           tipo TEXT NOT NULL,
                           descripcion TEXT NOT NULL,
                           colaborador_id INTEGER,
                           estado TEXT NOT NULL,
                           observaciones TEXT,
                           fecha_completado DATETIME,
                           fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                           FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)
                        )`,
            calendario_media: `CREATE TABLE IF NOT EXISTS calendario_media (
               id INTEGER PRIMARY KEY AUTO_INCREMENT,
               calendario_id INTEGER NOT NULL,
               file_path TEXT NOT NULL,
               file_type TEXT,
               uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
               FOREIGN KEY (calendario_id) REFERENCES calendarios(id) ON DELETE CASCADE
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
            if (alterError.code === 'ER_DUP_FIELDNAME') {
                console.log('Columna \'nombre\' ya existe en la tabla users.');
            } else {
                console.error('Error al añadir columna \'nombre\' a la tabla users:', alterError);
            }
        }

        // Add 'creado_por_id' column to clientes table if it doesn't exist
        try {
            await connection.query("ALTER TABLE clientes ADD COLUMN creado_por_id INTEGER, ADD FOREIGN KEY (creado_por_id) REFERENCES users(id)");
            console.log('Columna \'creado_por_id\' añadida a la tabla clientes.');
        } catch (alterError) {
            if (alterError.code === 'ER_DUP_FIELDNAME' || alterError.code === 'ER_FK_DUPNAME') {
                console.log('Columna o FK \'creado_por_id\' ya existe en la tabla clientes.');
            } else {
                console.error('Error al añadir columna \'creado_por_id\' a la tabla clientes:', alterError);
            }
        }

        // Add 'creado_por_id' column to ventas table if it doesn't exist
        try {
            await connection.query("ALTER TABLE ventas ADD COLUMN creado_por_id INTEGER, ADD FOREIGN KEY (creado_por_id) REFERENCES users(id)");
            console.log('Columna \'creado_por_id\' añadida a la tabla ventas.');
        } catch (alterError) {
            if (alterError.code === 'ER_DUP_FIELDNAME' || alterError.code === 'ER_FK_DUPNAME') {
                console.log('Columna o FK \'creado_por_id\' ya existe en la tabla ventas.');
            } else {
                console.error('Error al añadir columna \'creado_por_id\' a la tabla ventas:', alterError);
            }
        }

        // Add 'estado' column to gastos table if it doesn't exist
        try {
            await connection.query("ALTER TABLE gastos ADD COLUMN estado VARCHAR(255) NOT NULL DEFAULT 'Pendiente'");
            console.log('Columna \'estado\' añadida a la tabla gastos.');
        } catch (alterError) {
            if (alterError.code === 'ER_DUP_FIELDNAME') {
                console.log('Columna \'estado\' ya existe en la tabla gastos.');
            } else {
                console.error('Error al añadir columna \'estado\' a la tabla gastos:', alterError);
            }
        }

        // Add 'proveedor' column to gastos table if it doesn't exist
        try {
            await connection.query("ALTER TABLE gastos ADD COLUMN proveedor TEXT");
            console.log('Columna \'proveedor\' añadida a la tabla gastos.');
        } catch (alterError) {
            if (alterError.code === 'ER_DUP_FIELDNAME') {
                console.log('Columna \'proveedor\' ya existe en la tabla gastos.');
            } else {
                console.error('Error al añadir columna \'proveedor\' a la tabla gastos:', alterError);
            }
        }

        // Add 'user_id' column to colaboradores table if it doesn't exist
        try {
            await connection.query("ALTER TABLE colaboradores ADD COLUMN user_id INTEGER, ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL");
            console.log('Columna \'user_id\' añadida a la tabla colaboradores.');
        } catch (alterError) {
            if (alterError.code === 'ER_DUP_FIELDNAME' || alterError.code === 'ER_FK_DUPNAME') {
                console.log('Columna o FK \'user_id\' ya existe en la tabla colaboradores.');
            } else {
                console.error('Error al añadir columna \'user_id\' a la tabla colaboradores:', alterError);
            }
        }

        // Add 'colaborador_id' column to calendarios table if it doesn't exist
        try {
            await connection.query("ALTER TABLE calendarios ADD COLUMN colaborador_id INTEGER, ADD FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id)");
            console.log('Columna \'colaborador_id\' ya existe en la tabla calendarios.');
        } catch (alterError) {
            if (alterError.code === 'ER_DUP_FIELDNAME' || alterError.code === 'ER_FK_DUPNAME') {
                console.log('Columna o FK \'colaborador_id\' ya existe en la tabla calendarios.');
            } else {
                console.error('Error al añadir columna \'colaborador_id\' a la tabla calendarios:', alterError);
            }
        }

        // Add 'observaciones' column to calendarios table if it doesn't exist
        try {
            await connection.query("ALTER TABLE calendarios ADD COLUMN observaciones TEXT");
            console.log('Columna \'observaciones\' añadida a la tabla calendarios.');
        } catch (alterError) {
            if (alterError.code === 'ER_DUP_FIELDNAME') {
                console.log('Columna \'observaciones\' ya existe en la tabla calendarios.');
            } else {
                console.error('Error al añadir columna \'observaciones\' a la tabla calendarios:', alterError);
            }
        }

        // Add 'fecha_completado' column to calendarios table if it doesn't exist
        try {
            await connection.query("ALTER TABLE calendarios ADD COLUMN fecha_completado DATETIME");
            console.log('Columna \'fecha_completado\' añadida a la tabla calendarios.');
        } catch (alterError) {
            if (alterError.code === 'ER_DUP_FIELDNAME') {
                console.log('Columna \'fecha_completado\' ya existe en la tabla calendarios.');
            } else {
                console.error('Error al añadir columna \'fecha_completado\' a la tabla calendarios:', alterError);
            }
        }

        // Add 'fecha_creacion' column to calendarios table if it doesn't exist
        try {
            await connection.query("ALTER TABLE calendarios ADD COLUMN fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP");
            console.log('Columna \'fecha_creacion\' añadida a la tabla calendarios.');
        } catch (alterError) {
            if (alterError.code === 'ER_DUP_FIELDNAME') {
                console.log('Columna \'fecha_creacion\' ya existe en la tabla calendarios.');
            } else {
                console.error('Error al añadir columna \'fecha_creacion\' a la tabla calendarios:', alterError);
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
// Aumentar el límite de tamaño del payload y manejar los parsers condicionalmente
app.use((req, res, next) => {
    if (req.is('json')) {
        bodyParser.json({ limit: '50mb' })(req, res, next);
    } else if (req.is('urlencoded')) {
        bodyParser.urlencoded({ limit: '50mb', extended: true })(req, res, next);
    } else {
        // Si no es JSON o urlencoded (ej. multipart/form-data), simplemente continuamos
        next();
    }
});

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.json(results);
    });
});
app.post('/clientes', authenticateJWT(['Administrador General', 'Vendedor']), (req, res) => {
    console.log('--- INTENTO DE GUARDAR CLIENTE RECIBIDO ---');
    console.log('Body de la petición:', req.body);
    const { nombre, telefono, email, direccion } = req.body;
    const creado_por_id = req.user.id; // ID del usuario autenticado
    if (!nombre) {
        console.log('Error: El nombre es requerido.');
        res.status(400).json({ error: "El nombre es requerido" });
        return;
    }
    pool.query(`INSERT INTO clientes (nombre, telefono, email, direccion, creado_por_id) VALUES (?, ?, ?, ?, ?)`, 
        [nombre, telefono, email, direccion, creado_por_id],
        (err, results) => {
            if (err) { 
                console.error('Error de base de datos al guardar cliente:', err);
                res.status(400).json({ error: err.message });
                return;
            }
            console.log('Cliente guardado con éxito. Resultado:', results);
            res.status(201).json({ id: results.insertId, nombre, telefono, email, direccion });
        }
    );
});
app.put('/clientes/:id', authenticateJWT(['Administrador General', 'Vendedor']), async (req, res) => {
    const { nombre, telefono, email, direccion } = req.body;
    const id = parseInt(req.params.id);
    const user = req.user;

    if (!nombre) { 
        return res.status(400).json({ error: "El nombre es requerido" });
    }

    try {
        if (user.role !== 'Administrador General') {
            const [rows] = await pool.promise().query('SELECT creado_por_id FROM clientes WHERE id = ?', [id]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Cliente no encontrado" });
            }
            if (rows[0].creado_por_id !== user.id) {
                return res.status(403).json({ error: "No tiene permiso para modificar este cliente" });
            }
        }

        const [results] = await pool.promise().query(
            `UPDATE clientes SET nombre = ?, telefono = ?, email = ?, direccion = ? WHERE id = ?`,
            [nombre, telefono, email, direccion, id]
        );

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: "Cliente no encontrado" });
        } else { 
            res.json({ id, nombre, telefono, email, direccion });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/clientes/:id', authenticateJWT(['Administrador General', 'Vendedor']), async (req, res) => {
    const id = parseInt(req.params.id);
    const user = req.user;

    try {
        if (user.role !== 'Administrador General') {
            const [rows] = await pool.promise().query('SELECT creado_por_id FROM clientes WHERE id = ?', [id]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Cliente no encontrado" });
            }
            if (rows[0].creado_por_id !== user.id) {
                return res.status(403).json({ error: "No tiene permiso para eliminar este cliente" });
            }
        }

        const [results] = await pool.promise().query(`DELETE FROM clientes WHERE id = ?`, [id]);

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: "Cliente no encontrado" });
        } else {
            res.status(204).send();
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rutas API para Ventas
app.get('/ventas', authenticateJWT(['Administrador General', 'Contador / Finanzas', 'Vendedor']), (req, res) => {
    pool.query("SELECT * FROM ventas", (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.json(results);
    });
});

app.get('/ventas-pendientes', authenticateJWT(['Administrador General', 'Contador / Finanzas']), async (req, res) => {
    try {
        const [ventas] = await pool.promise().query("SELECT id, cliente, total, producto FROM ventas WHERE estadoPago = 'Pendiente'");
        res.json(ventas);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/ventas', authenticateJWT(['Administrador General', 'Vendedor']), (req, res) => {
    const { cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago } = req.body;
    const creado_por_id = req.user.id; // ID del usuario autenticado
    const query = `INSERT INTO ventas (cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago, creado_por_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago, creado_por_id];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.status(201).json({ id: results.insertId, ...req.body });
    });
});
app.put('/ventas/:id', authenticateJWT(['Administrador General', 'Vendedor']), async (req, res) => {
    const { cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago } = req.body;
    const id = parseInt(req.params.id);
    const user = req.user;

    try {
        if (user.role !== 'Administrador General') {
            const [rows] = await pool.promise().query('SELECT creado_por_id FROM ventas WHERE id = ?', [id]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Venta no encontrada" });
            }
            if (rows[0].creado_por_id !== user.id) {
                return res.status(403).json({ error: "No tiene permiso para modificar esta venta" });
            }
        }

        const query = `UPDATE ventas SET cliente = ?, producto = ?, cantidad = ?, precioUnitario = ?, total = ?, fecha = ?, estadoPago = ? WHERE id = ?`;
        const params = [cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago, id];
        const [results] = await pool.promise().query(query, params);

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: "Venta no encontrada" });
        } else {
            res.json({ id, ...req.body });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/ventas/:id', authenticateJWT(['Administrador General', 'Vendedor']), async (req, res) => {
    const id = parseInt(req.params.id);
    const user = req.user;

    try {
        if (user.role !== 'Administrador General') {
            const [rows] = await pool.promise().query('SELECT creado_por_id FROM ventas WHERE id = ?', [id]);
            if (rows.length === 0) {
                return res.status(404).json({ error: "Venta no encontrada" });
            }
            if (rows[0].creado_por_id !== user.id) {
                return res.status(403).json({ error: "No tiene permiso para eliminar esta venta" });
            }
        }

        const [results] = await pool.promise().query(`DELETE FROM ventas WHERE id = ?`, [id]);

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: "Venta no encontrada" });
        } else {
            res.status(204).send();
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rutas API para Inventario
app.get('/inventario', authenticateJWT(['Administrador General', 'Vendedor', 'Encargado de Inventario', 'Supervisor de Producción']), (req, res) => {
    pool.query("SELECT * FROM inventario", (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.json(results);
    });
});
app.post('/inventario', authenticateJWT(['Administrador General', 'Encargado de Inventario']), (req, res) => {
    const { nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor } = req.body;
    const query = `INSERT INTO inventario (nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.status(201).json({ id: results.insertId, ...req.body });
    });
});
app.put('/inventario/:id', authenticateJWT(['Administrador General', 'Encargado de Inventario']), (req, res) => {
    const { nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor } = req.body;
    const id = parseInt(req.params.id);
    const query = `UPDATE inventario SET nombre = ?, descripcion = ?, stock = ?, unidad = ?, precioCompra = ?, precioVenta = ?, proveedor = ? WHERE id = ?`;
    const params = [nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor, id];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ error: "Producto no encontrado" }); }
        else { res.json({ id, ...req.body }); }
    });
});
app.delete('/inventario/:id', authenticateJWT(['Administrador General', 'Encargado de Inventario']), (req, res) => {
    const id = parseInt(req.params.id);
    pool.query(`DELETE FROM inventario WHERE id = ?`, [id], (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ error: "Producto no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Gastos
app.get('/gastos', authenticateJWT(['Administrador General', 'Contador / Finanzas', 'Vendedor']), (req, res) => {
    pool.query("SELECT * FROM gastos", (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.json(results);
    });
});

app.get('/gastos-pendientes', authenticateJWT(['Administrador General', 'Contador / Finanzas']), async (req, res) => {
    try {
        const [gastos] = await pool.promise().query("SELECT id, descripcion, monto, proveedor FROM gastos WHERE estado = 'Pendiente'");
        res.json(gastos);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/gastos', authenticateJWT(['Administrador General', 'Contador / Finanzas']), (req, res) => {
    const { fecha, categoria, descripcion, monto, metodoPago, numeroFactura, estado, proveedor } = req.body;
    const query = `INSERT INTO gastos (fecha, categoria, descripcion, monto, metodoPago, numeroFactura, estado, proveedor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [fecha, categoria, descripcion, monto, metodoPago, numeroFactura, estado || 'Pendiente', proveedor];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.status(201).json({ id: results.insertId, ...req.body, estado: estado || 'Pendiente' });
    });
});
app.put('/gastos/:id', authenticateJWT(['Administrador General', 'Contador / Finanzas']), (req, res) => {
    const { fecha, categoria, descripcion, monto, metodoPago, numeroFactura, estado, proveedor } = req.body;
    const id = parseInt(req.params.id);
    const query = `UPDATE gastos SET fecha = ?, categoria = ?, descripcion = ?, monto = ?, metodoPago = ?, numeroFactura = ?, estado = ?, proveedor = ? WHERE id = ?`;
    const params = [fecha, categoria, descripcion, monto, metodoPago, numeroFactura, estado, proveedor, id];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ error: "Gasto no encontrado" }); }
        else { res.json({ id, ...req.body }); }
    });
});
app.delete('/gastos/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const id = parseInt(req.params.id);
    pool.query(`DELETE FROM gastos WHERE id = ?`, [id], (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ error: "Gasto no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Proveedores
app.get('/proveedores', authenticateJWT(['Administrador General', 'Encargado de Inventario', 'Supervisor de Producción']), (req, res) => {
    pool.query("SELECT * FROM proveedores", (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.json(results);
    });
});
app.post('/proveedores', authenticateJWT(['Administrador General', 'Encargado de Inventario', 'Supervisor de Producción']), (req, res) => {
    const { nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago } = req.body;
    const query = `INSERT INTO proveedores (nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.status(201).json({ id: results.insertId, ...req.body });
    });
});
app.put('/proveedores/:id', authenticateJWT(['Administrador General', 'Supervisor de Producción']), (req, res) => {
    const { nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago } = req.body;
    const id = parseInt(req.params.id);
    const query = `UPDATE proveedores SET nombre = ?, personaContacto = ?, telefono = ?, email = ?, direccion = ?, productosServicios = ?, terminosPago = ? WHERE id = ?`;
    const params = [nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago, id];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ error: "Proveedor no encontrado" }); }
        else { res.json({ id, ...req.body }); }
    });
});
app.delete('/proveedores/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const id = parseInt(req.params.id);
    pool.query(`DELETE FROM proveedores WHERE id = ?`, [id], (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ error: "Proveedor no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Pagos
app.get('/pagos', authenticateJWT(['Administrador General', 'Contador / Finanzas']), (req, res) => {
    pool.query("SELECT * FROM pagos", (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.json(results);
    });
});

app.post('/pagos', authenticateJWT(['Administrador General', 'Contador / Finanzas']), async (req, res) => {
    const { fecha, tipo, concepto, monto, metodo, entidadRelacionada, venta_id, gasto_id } = req.body;
    const connection = await pool.promise().getConnection();

    try {
        await connection.beginTransaction();

        // 1. Generar referencia secuencial
        const refKey = tipo === 'Ingreso' ? 'ref_ingreso' : 'ref_egreso';
        const refPrefix = tipo === 'Ingreso' ? 'ING-' : 'EGR-';

        await connection.query("INSERT INTO settings (`key`, value) VALUES (?, 1) ON DUPLICATE KEY UPDATE value = value + 1", [refKey]);
        const [refRows] = await connection.query('SELECT value FROM settings WHERE `key` = ?', [refKey]);
        const newRefValue = refRows[0].value;
        const referencia = refPrefix + String(newRefValue).padStart(4, '0');

        // 2. Insertar el pago
        const pagoQuery = `INSERT INTO pagos (fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const pagoParams = [fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia];
        const [pagoResult] = await connection.query(pagoQuery, pagoParams);

        // 3. Actualizar estado de la venta o gasto asociado
        if (tipo === 'Ingreso' && venta_id) {
            await connection.query("UPDATE ventas SET estadoPago = 'Pagado' WHERE id = ?", [venta_id]);
        } else if (tipo === 'Egreso' && gasto_id) {
            await connection.query("UPDATE gastos SET estado = 'Pagado' WHERE id = ?", [gasto_id]);
        }

        await connection.commit();
        res.status(201).json({ id: pagoResult.insertId, ...req.body, referencia });

    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

app.put('/pagos/:id', authenticateJWT(['Administrador General', 'Contador / Finanzas']), (req, res) => {
    const { fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia } = req.body;
    const id = parseInt(req.params.id);
    const query = `UPDATE pagos SET fecha = ?, tipo = ?, concepto = ?, monto = ?, metodo = ?, entidadRelacionada = ?, referencia = ? WHERE id = ?`;
    const params = [fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia, id];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ error: "Pago no encontrado" }); }
        else { res.json({ id, ...req.body }); }
    });
});
app.delete('/pagos/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const id = parseInt(req.params.id);
    pool.query(`DELETE FROM pagos WHERE id = ?`, [id], (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ error: "Pago no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Colaboradores
app.get('/colaboradores', authenticateJWT(['Administrador General', 'Supervisor de Producción']), (req, res) => {
    pool.query("SELECT * FROM colaboradores", (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.json(results);
    });
});
app.post('/colaboradores', authenticateJWT(['Administrador General']), (req, res) => {
    console.log('Solicitud POST a /colaboradores recibida', req.body);
    const { nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas, user_id } = req.body;

    // El user_id es opcional, puede ser null
    if (!nombre) {
        return res.status(400).json({ error: 'El campo nombre es obligatorio.' });
    }

    const query = `
        INSERT INTO colaboradores (nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas, user_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas, user_id || null];

    pool.query(query, params, (err, results) => {
        if (err) {
            console.error('Error al guardar colaborador:', err);
            // Asegurarse de que el error que se envía al cliente es genérico para no exponer detalles
            res.status(500).json({ error: 'Error interno al guardar el colaborador.' });
            return;
        }
        res.status(201).json({ id: results.insertId, ...req.body });
    });
});
app.put('/colaboradores/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const { nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas, user_id } = req.body;
    const id = parseInt(req.params.id);
    const query = `UPDATE colaboradores SET nombre = ?, cargo = ?, telefono = ?, email = ?, direccion = ?, fechaInicio = ?, salario = ?, notas = ?, user_id = ? WHERE id = ?`;
    const params = [nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas, user_id, id];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ error: "Colaborador no encontrado" }); }
        else { res.json({ id, ...req.body }); }
    });
});
app.delete('/colaboradores/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const id = parseInt(req.params.id);
    pool.query(`DELETE FROM colaboradores WHERE id = ?`, [id], (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ error: "Colaborador no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Calendarios
app.get('/calendarios', authenticateJWT(['Administrador General', 'Colaborador / Empleado', 'Supervisor de Producción']), async (req, res) => {
    const user = req.user;

    try {
        if (user.role === 'Administrador General' || user.role === 'Supervisor de Producción') {
            // Los administradores y supervisores pueden ver todos los calendarios
            const [results] = await pool.promise().query(`
                SELECT c.*, col.nombre as nombre_colaborador,
                GROUP_CONCAT(CONCAT('/uploads/', REPLACE(cm.file_path, 'server\\\\uploads\\\\', ''))) AS media_urls
                FROM calendarios c 
                LEFT JOIN colaboradores col ON c.colaborador_id = col.id
                LEFT JOIN calendario_media cm ON c.id = cm.calendario_id
                GROUP BY c.id, col.nombre
            `);
            res.json(results);
        } else {
            // Los colaboradores solo ven sus tareas asignadas
            const [colaborador] = await pool.promise().query('SELECT id FROM colaboradores WHERE user_id = ?', [user.id]);
            if (colaborador.length === 0) {
                return res.json([]); // No es un colaborador o no está enlazado, no devuelve tareas
            }
            const colaboradorId = colaborador[0].id;
            const [results] = await pool.promise().query(`
                SELECT c.*, col.nombre as nombre_colaborador,
                GROUP_CONCAT(CONCAT('/uploads/', REPLACE(cm.file_path, 'server\\\\uploads\\\\', ''))) AS media_urls
                FROM calendarios c 
                LEFT JOIN colaboradores col ON c.colaborador_id = col.id
                LEFT JOIN calendario_media cm ON c.id = cm.calendario_id
                WHERE c.colaborador_id = ?
                GROUP BY c.id, col.nombre
            `, [colaboradorId]);
            res.json(results);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/calendarios', authenticateJWT(['Administrador General', 'Supervisor de Producción']), (req, res) => {
    const { fecha, tipo, descripcion, colaborador_id, estado, observaciones } = req.body;
    const query = `INSERT INTO calendarios (fecha, tipo, descripcion, colaborador_id, estado, observaciones) VALUES (?, ?, ?, ?, ?, ?)`;
    const params = [fecha, tipo, descripcion, colaborador_id, estado, observaciones];
    pool.query(query, params, (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.status(201).json({ id: results.insertId, ...req.body });
    });
});
app.put('/calendarios/:id', authenticateJWT(['Administrador General', 'Supervisor de Producción', 'Colaborador / Empleado']), async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    try {
        if (user.role === 'Colaborador / Empleado') {
            const { estado, observaciones } = req.body;
            let query = 'UPDATE calendarios SET estado = ?, observaciones = ?';
            const params = [estado, observaciones];

            if (estado === 'Completado') {
                query += ', fecha_completado = NOW()';
            }

            query += ' WHERE id = ?';
            params.push(id);

            const [results] = await pool.promise().query(query, params);

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: "Evento de calendario no encontrado" });
            } else {
                res.json({ id, ...req.body });
            }

        } else {
            const { fecha, tipo, descripcion, colaborador_id, estado, observaciones } = req.body;
            const query = `UPDATE calendarios SET fecha = ?, tipo = ?, descripcion = ?, colaborador_id = ?, estado = ?, observaciones = ? WHERE id = ?`;
            const params = [fecha, tipo, descripcion, colaborador_id, estado, observaciones, id];
            const [results] = await pool.promise().query(query, params);

            if (results.affectedRows === 0) {
                return res.status(404).json({ error: "Evento de calendario no encontrado" });
            } else {
                res.json({ id, ...req.body });
            }
        }
    } catch (err) {
        console.error('Error al actualizar evento de calendario:', err);
        res.status(500).json({ error: err.message });
    }
});
app.delete('/calendarios/:id', authenticateJWT(['Administrador General']), (req, res) => {
    const id = parseInt(req.params.id);
    pool.query(`DELETE FROM calendarios WHERE id = ?`, [id], (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        if (results.affectedRows === 0) { res.status(404).json({ error: "Evento de calendario no encontrado" }); }
        else { res.status(204).send(); }
    });
});

app.post('/calendarios/:id/media', authenticateJWT(['Administrador General', 'Colaborador / Empleado', 'Supervisor de Producción']), upload.single('media'), async (req, res) => {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }

    try {
        // Check for image limit (max 3 images per task)
        const [existingMedia] = await pool.promise().query('SELECT COUNT(*) as count FROM calendario_media WHERE calendario_id = ?', [id]);
        if (existingMedia[0].count >= 3) {
            // Optionally delete the uploaded file if it exceeds the limit
            // fs.unlinkSync(file.path); // Requires 'fs' module
            return res.status(400).json({ error: 'Solo se permiten un máximo de 3 imágenes por tarea.' });
        }

        const query = 'INSERT INTO calendario_media (calendario_id, file_path, file_type) VALUES (?, ?, ?)';
        await pool.promise().query(query, [id, file.path, file.mimetype]);
        res.status(201).json({ message: 'Archivo subido con éxito.', filePath: `/uploads/${path.basename(file.path)}` });
    } catch (err) {
        console.error('Error al subir archivo de calendario:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/calendarios/:id/media', authenticateJWT(['Administrador General', 'Colaborador / Empleado', 'Supervisor de Producción']), async (req, res) => {
    const { id } = req.params;
    try {
        const [media] = await pool.promise().query('SELECT * FROM calendario_media WHERE calendario_id = ?', [id]);
        res.json(media);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Rutas API para Secuenciales (Facturas/Recibos)
app.get('/sequence/:key', authenticateJWT(['Administrador General', 'Vendedor']), (req, res) => {
    const key = req.params.key;
    pool.query('SELECT value FROM settings WHERE `key` = ?', [key], (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        res.json({ value: results.length > 0 ? parseInt(results[0].value, 10) : 0 });
    });
});

app.post('/sequence/:key/increment', authenticateJWT(['Administrador General', 'Vendedor']), (req, res) => {
    const key = req.params.key;
    const query = "INSERT INTO settings (`key`, value) VALUES (?, 1) ON DUPLICATE KEY UPDATE value = value + 1";
    pool.query(query, [key], (err, results) => {
        if (err) { res.status(400).json({ error: err.message }); return; }
        pool.query('SELECT value FROM settings WHERE `key` = ?', [key], (err, results) => {
            if (err) { res.status(400).json({ error: err.message }); return; }
            res.json({ value: parseInt(results[0].value, 10) });
        });
    });
});



// Función principal para iniciar el servidor en modo de desarrollo
const startDevServer = async () => {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`Servidor de desarrollo corriendo en http://localhost:${PORT}`);
    });
};

// Solo iniciar el servidor si estamos en modo de desarrollo
if (process.env.NODE_ENV === 'development') {
    console.log('Modo de desarrollo detectado. Iniciando servidor localmente...');
    startDevServer();
}

// En un entorno como LiteSpeed/Passenger, solo necesitamos exportar la app.
// El servidor web se encarga de escuchar las peticiones.
module.exports = app;
