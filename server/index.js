const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Conectar a la base de datos SQLite
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        // Crear tablas si no existen
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                telefono TEXT,
                email TEXT,
                direccion TEXT
            )`, (createErr) => {
                if (createErr) console.error('Error al crear la tabla de clientes:', createErr.message);
                else console.log('Tabla de clientes verificada/creada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS ventas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente TEXT NOT NULL,
                producto TEXT NOT NULL,
                cantidad REAL NOT NULL,
                precioUnitario REAL NOT NULL,
                total REAL NOT NULL,
                fecha TEXT NOT NULL,
                estadoPago TEXT NOT NULL
            )`, (createErr) => {
                if (createErr) console.error('Error al crear la tabla de ventas:', createErr.message);
                else console.log('Tabla de ventas verificada/creada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS inventario (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                stock REAL NOT NULL,
                unidad TEXT,
                precioCompra REAL,
                precioVenta REAL NOT NULL,
                proveedor TEXT
            )`, (createErr) => {
                if (createErr) console.error('Error al crear la tabla de inventario:', createErr.message);
                else console.log('Tabla de inventario verificada/creada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS gastos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha TEXT NOT NULL,
                categoria TEXT NOT NULL,
                descripcion TEXT,
                monto REAL NOT NULL,
                metodoPago TEXT,
                numeroFactura TEXT
            )`, (createErr) => {
                if (createErr) console.error('Error al crear la tabla de gastos:', createErr.message);
                else console.log('Tabla de gastos verificada/creada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS proveedores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                personaContacto TEXT,
                telefono TEXT,
                email TEXT,
                direccion TEXT,
                productosServicios TEXT,
                terminosPago TEXT
            )`, (createErr) => {
                if (createErr) console.error('Error al crear la tabla de proveedores:', createErr.message);
                else console.log('Tabla de proveedores verificada/creada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS pagos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha TEXT NOT NULL,
                tipo TEXT NOT NULL,
                concepto TEXT NOT NULL,
                monto REAL NOT NULL,
                metodo TEXT NOT NULL,
                entidadRelacionada TEXT,
                referencia TEXT
            )`, (createErr) => {
                if (createErr) console.error('Error al crear la tabla de pagos:', createErr.message);
                else console.log('Tabla de pagos verificada/creada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS colaboradores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                cargo TEXT,
                telefono TEXT,
                email TEXT,
                direccion TEXT,
                fechaInicio TEXT,
                salario REAL,
                notas TEXT
            )`, (createErr) => {
                if (createErr) console.error('Error al crear la tabla de colaboradores:', createErr.message);
                else console.log('Tabla de colaboradores verificada/creada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS calendarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha TEXT NOT NULL,
                tipo TEXT NOT NULL,
                descripcion TEXT NOT NULL,
                responsable TEXT,
                estado TEXT NOT NULL
            )`, (createErr) => {
                if (createErr) console.error('Error al crear la tabla de calendarios:', createErr.message);
                else console.log('Tabla de calendarios verificada/creada.');
            });

            db.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`, (createErr) => {
                if (createErr) console.error('Error al crear la tabla de settings:', createErr.message);
                else console.log('Tabla de settings verificada/creada.');
            });
        });
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..')));

// Rutas API para Clientes
app.get('/api/clientes', (req, res) => {
    db.all("SELECT * FROM clientes", [], (err, rows) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(rows);
    });
});
app.post('/api/clientes', (req, res) => {
    const { nombre, telefono, email, direccion } = req.body;
    if (!nombre) { res.status(400).json({ "error": "El nombre es requerido" }); return; }
    db.run(`INSERT INTO clientes (nombre, telefono, email, direccion) VALUES (?, ?, ?, ?)`, 
        [nombre, telefono, email, direccion], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            res.status(201).json({ id: this.lastID, nombre, telefono, email, direccion });
        }
    );
});
app.put('/api/clientes/:id', (req, res) => {
    const { nombre, telefono, email, direccion } = req.body;
    const id = parseInt(req.params.id);
    if (!nombre) { res.status(400).json({ "error": "El nombre es requerido" }); return; }
    db.run(`UPDATE clientes SET nombre = ?, telefono = ?, email = ?, direccion = ? WHERE id = ?`, 
        [nombre, telefono, email, direccion, id], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            if (this.changes === 0) { res.status(404).json({ "error": "Cliente no encontrado" }); }
            else { res.json({ id, nombre, telefono, email, direccion }); }
        }
    );
});
app.delete('/api/clientes/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.run(`DELETE FROM clientes WHERE id = ?`, id, function (err) {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (this.changes === 0) { res.status(404).json({ "error": "Cliente no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Ventas
app.get('/api/ventas', (req, res) => {
    db.all("SELECT * FROM ventas", [], (err, rows) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(rows);
    });
});
app.post('/api/ventas', (req, res) => {
    const { cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago } = req.body;
    if (!cliente || !producto || !cantidad || !precioUnitario || !total || !fecha || !estadoPago) {
        res.status(400).json({ "error": "Todos los campos son requeridos" });
        return;
    }
    db.run(`INSERT INTO ventas (cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
        [cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            res.status(201).json({ id: this.lastID, cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago });
        }
    );
});
app.put('/api/ventas/:id', (req, res) => {
    const { cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago } = req.body;
    const id = parseInt(req.params.id);
    if (!cliente || !producto || !cantidad || !precioUnitario || !total || !fecha || !estadoPago) {
        res.status(400).json({ "error": "Todos los campos son requeridos" });
        return;
    }
    db.run(`UPDATE ventas SET cliente = ?, producto = ?, cantidad = ?, precioUnitario = ?, total = ?, fecha = ?, estadoPago = ? WHERE id = ?`, 
        [cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago, id], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            if (this.changes === 0) { res.status(404).json({ "error": "Venta no encontrada" }); }
            else { res.json({ id, cliente, producto, cantidad, precioUnitario, total, fecha, estadoPago }); }
        }
    );
});
app.delete('/api/ventas/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.run(`DELETE FROM ventas WHERE id = ?`, id, function (err) {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (this.changes === 0) { res.status(404).json({ "error": "Venta no encontrada" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Inventario
app.get('/api/inventario', (req, res) => {
    db.all("SELECT * FROM inventario", [], (err, rows) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(rows);
    });
});
app.post('/api/inventario', (req, res) => {
    const { nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor } = req.body;
    if (!nombre || !stock || !precioVenta) {
        res.status(400).json({ "error": "Nombre, stock y precio de venta son requeridos" });
        return;
    }
    db.run(`INSERT INTO inventario (nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
        [nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor], 
                function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            res.status(201).json({ id: this.lastID, nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor });
        }
    );
});
app.put('/api/inventario/:id', (req, res) => {
    const { nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor } = req.body;
    const id = parseInt(req.params.id);
    if (!nombre || !stock || !precioVenta) {
        res.status(400).json({ "error": "Nombre, stock y precio de venta son requeridos" });
        return;
    }
    db.run(`UPDATE inventario SET nombre = ?, descripcion = ?, stock = ?, unidad = ?, precioCompra = ?, precioVenta = ?, proveedor = ? WHERE id = ?`, 
        [nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor, id], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            if (this.changes === 0) { res.status(404).json({ "error": "Producto no encontrado" }); }
            else { res.json({ id, nombre, descripcion, stock, unidad, precioCompra, precioVenta, proveedor }); }
        }
    );
});
app.delete('/api/inventario/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.run(`DELETE FROM inventario WHERE id = ?`, id, function (err) {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (this.changes === 0) { res.status(404).json({ "error": "Producto no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Gastos
app.get('/api/gastos', (req, res) => {
    db.all("SELECT * FROM gastos", [], (err, rows) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(rows);
    });
});
app.post('/api/gastos', (req, res) => {
    const { fecha, categoria, descripcion, monto, metodoPago, numeroFactura } = req.body;
    if (!fecha || !categoria || !monto) {
        res.status(400).json({ "error": "Fecha, categoría y monto son requeridos" });
        return;
    }
    db.run(`INSERT INTO gastos (fecha, categoria, descripcion, monto, metodoPago, numeroFactura) VALUES (?, ?, ?, ?, ?, ?)`, 
        [fecha, categoria, descripcion, monto, metodoPago, numeroFactura], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            res.status(201).json({ id: this.lastID, fecha, categoria, descripcion, monto, metodoPago, numeroFactura });
        }
    );
});
app.put('/api/gastos/:id', (req, res) => {
    const { fecha, categoria, descripcion, monto, metodoPago, numeroFactura } = req.body;
    const id = parseInt(req.params.id);
    if (!fecha || !categoria || !monto) {
        res.status(400).json({ "error": "Fecha, categoría y monto son requeridos" });
        return;
    }
    db.run(`UPDATE gastos SET fecha = ?, categoria = ?, descripcion = ?, monto = ?, metodoPago = ?, numeroFactura = ? WHERE id = ?`, 
        [fecha, categoria, descripcion, monto, metodoPago, numeroFactura, id], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            if (this.changes === 0) { res.status(404).json({ "error": "Gasto no encontrado" }); }
            else { res.json({ id, fecha, categoria, descripcion, monto, metodoPago, numeroFactura }); }
        }
    );
});
app.delete('/api/gastos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.run(`DELETE FROM gastos WHERE id = ?`, id, function (err) {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (this.changes === 0) { res.status(404).json({ "error": "Gasto no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Proveedores
app.get('/api/proveedores', (req, res) => {
    db.all("SELECT * FROM proveedores", [], (err, rows) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(rows);
    });
});
app.post('/api/proveedores', (req, res) => {
    const { nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago } = req.body;
    if (!nombre) {
        res.status(400).json({ "error": "El nombre es requerido" });
        return;
    }
    db.run(`INSERT INTO proveedores (nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
        [nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            res.status(201).json({ id: this.lastID, nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago });
        }
    );
});
app.put('/api/proveedores/:id', (req, res) => {
    const { nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago } = req.body;
    const id = parseInt(req.params.id);
    if (!nombre) {
        res.status(400).json({ "error": "El nombre es requerido" });
        return;
    }
    db.run(`UPDATE proveedores SET nombre = ?, personaContacto = ?, telefono = ?, email = ?, direccion = ?, productosServicios = ?, terminosPago = ? WHERE id = ?`, 
        [nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago, id], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            if (this.changes === 0) { res.status(404).json({ "error": "Proveedor no encontrado" }); }
            else { res.json({ id, nombre, personaContacto, telefono, email, direccion, productosServicios, terminosPago }); }
        }
    );
});
app.delete('/api/proveedores/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.run(`DELETE FROM proveedores WHERE id = ?`, id, function (err) {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (this.changes === 0) { res.status(404).json({ "error": "Proveedor no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Pagos
app.get('/api/pagos', (req, res) => {
    db.all("SELECT * FROM pagos", [], (err, rows) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(rows);
    });
});
app.post('/api/pagos', (req, res) => {
    const { fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia } = req.body;
    if (!fecha || !tipo || !concepto || !monto || !metodo) {
        res.status(400).json({ "error": "Fecha, tipo, concepto, monto y método son requeridos" });
        return;
    }
    db.run(`INSERT INTO pagos (fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
        [fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            res.status(201).json({ id: this.lastID, fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia });
        }
    );
});
app.put('/api/pagos/:id', (req, res) => {
    const { fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia } = req.body;
    const id = parseInt(req.params.id);
    if (!fecha || !tipo || !concepto || !monto || !metodo) {
        res.status(400).json({ "error": "Fecha, tipo, concepto, monto y método son requeridos" });
        return;
    }
    db.run(`UPDATE pagos SET fecha = ?, tipo = ?, concepto = ?, monto = ?, metodo = ?, entidadRelacionada = ?, referencia = ? WHERE id = ?`, 
        [fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia, id], 
 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            if (this.changes === 0) { res.status(404).json({ "error": "Pago no encontrado" }); }
            else { res.json({ id, fecha, tipo, concepto, monto, metodo, entidadRelacionada, referencia }); }
        }
    );
});
app.delete('/api/pagos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.run(`DELETE FROM pagos WHERE id = ?`, id, function (err) {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (this.changes === 0) { res.status(404).json({ "error": "Pago no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Colaboradores
app.get('/api/colaboradores', (req, res) => {
    db.all("SELECT * FROM colaboradores", [], (err, rows) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(rows);
    });
});
app.post('/api/colaboradores', (req, res) => {
    const { nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas } = req.body;
    if (!nombre || !cargo || !fechaInicio) {
        res.status(400).json({ "error": "Nombre, cargo y fecha de inicio son requeridos" });
        return;
    }
    db.run(`INSERT INTO colaboradores (nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
        [nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            res.status(201).json({ id: this.lastID, nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas });
        }
    );
});
app.put('/api/colaboradores/:id', (req, res) => {
    const { nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas } = req.body;
    const id = parseInt(req.params.id);
    if (!nombre || !cargo || !fechaInicio) {
        res.status(400).json({ "error": "Nombre, cargo y fecha de inicio son requeridos" });
        return;
    }
    db.run(`UPDATE colaboradores SET nombre = ?, cargo = ?, telefono = ?, email = ?, direccion = ?, fechaInicio = ?, salario = ?, notas = ? WHERE id = ?`, 
        [nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas, id], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            if (this.changes === 0) { res.status(404).json({ "error": "Colaborador no encontrado" }); }
            else { res.json({ id, nombre, cargo, telefono, email, direccion, fechaInicio, salario, notas }); }
        }
    );
});
app.delete('/api/colaboradores/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.run(`DELETE FROM colaboradores WHERE id = ?`, id, function (err) {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (this.changes === 0) { res.status(404).json({ "error": "Colaborador no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Calendarios
app.get('/api/calendarios', (req, res) => {
    db.all("SELECT * FROM calendarios", [], (err, rows) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json(rows);
    });
});
app.post('/api/calendarios', (req, res) => {
    const { fecha, tipo, descripcion, responsable, estado } = req.body;
    if (!fecha || !tipo || !descripcion || !estado) {
        res.status(400).json({ "error": "Fecha, tipo, descripción y estado son requeridos" });
        return;
    }
    db.run(`INSERT INTO calendarios (fecha, tipo, descripcion, responsable, estado) VALUES (?, ?, ?, ?, ?)`, 
        [fecha, tipo, descripcion, responsable, estado], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            res.status(201).json({ id: this.lastID, fecha, tipo, descripcion, responsable, estado });
        }
    );
});
app.put('/api/calendarios/:id', (req, res) => {
    const { fecha, tipo, descripcion, responsable, estado } = req.body;
    const id = parseInt(req.params.id);
    if (!fecha || !tipo || !descripcion || !estado) {
        res.status(400).json({ "error": "Fecha, tipo, descripción y estado son requeridos" });
        return;
    }
    db.run(`UPDATE calendarios SET fecha = ?, tipo = ?, descripcion = ?, responsable = ?, estado = ? WHERE id = ?`, 
        [fecha, tipo, descripcion, responsable, estado, id], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            if (this.changes === 0) { res.status(404).json({ "error": "Evento de calendario no encontrado" }); }
            else { res.json({ id, fecha, tipo, descripcion, responsable, estado }); }
        }
    );
});
app.delete('/api/calendarios/:id', (req, res) => {
    const id = parseInt(req.params.id);
    db.run(`DELETE FROM calendarios WHERE id = ?`, id, function (err) {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        if (this.changes === 0) { res.status(404).json({ "error": "Evento de calendario no encontrado" }); }
        else { res.status(204).send(); }
    });
});

// Rutas API para Secuenciales (Facturas/Recibos)
app.get('/api/sequence/:key', (req, res) => {
    const key = req.params.key;
    db.get(`SELECT value FROM settings WHERE key = ?`, [key], (err, row) => {
        if (err) { res.status(400).json({ "error": err.message }); return; }
        res.json({ value: row ? parseInt(row.value, 10) : 0 });
    });
});

app.post('/api/sequence/:key/increment', (req, res) => {
    const key = req.params.key;
    db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, COALESCE((SELECT value FROM settings WHERE key = ?), 0) + 1)`, 
        [key, key], 
        function (err) {
            if (err) { res.status(400).json({ "error": err.message }); return; }
            db.get(`SELECT value FROM settings WHERE key = ?`, [key], (err, row) => {
                if (err) { res.status(400).json({ "error": err.message }); return; }
                res.json({ value: parseInt(row.value, 10) });
            });
        }
    );
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('Backend de Granja Cerdito Feliz funcionando con SQLite!');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
    console.log('Endpoints disponibles:');
    console.log(`  GET /api/clientes`);
    console.log(`  POST /api/clientes`);
    console.log(`  PUT /api/clientes/:id`);
    console.log(`  DELETE /api/clientes/:id`);
    console.log(`  GET /api/ventas`);
    console.log(`  POST /api/ventas`);
    console.log(`  PUT /api/ventas/:id`);
    console.log(`  DELETE /api/ventas/:id`);
    console.log(`  GET /api/inventario`);
    console.log(`  POST /api/inventario`);
    console.log(`  PUT /api/inventario/:id`);
    console.log(`  DELETE /api/inventario/:id`);
    console.log(`  GET /api/gastos`);
    console.log(`  POST /api/gastos`);
    console.log(`  PUT /api/gastos/:id`);
    console.log(`  DELETE /api/gastos/:id`);
    console.log(`  GET /api/proveedores`);
    console.log(`  POST /api/proveedores`);
    console.log(`  PUT /api/proveedores/:id`);
    console.log(`  DELETE /api/proveedores/:id`);
    console.log(`  GET /api/pagos`);
    console.log(`  POST /api/pagos`);
    console.log(`  PUT /api/pagos/:id`);
    console.log(`  DELETE /api/pagos/:id`);
    console.log(`  GET /api/colaboradores`);
    console.log(`  POST /api/colaboradores`);
    console.log(`  PUT /api/colaboradores/:id`);
    console.log(`  DELETE /api/colaboradores/:id`);
    console.log(`  GET /api/calendarios`);
    console.log(`  POST /api/calendarios`);
    console.log(`  PUT /api/calendarios/:id`);
    console.log(`  DELETE /api/calendarios/:id`);
    console.log(`  GET /api/sequence/:key`);
    console.log(`  POST /api/sequence/:key/increment`);
});