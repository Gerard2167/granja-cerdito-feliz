(function() {
// Script para la gestión de Ventas

const formVenta = document.getElementById('form-venta');
const tablaVentasBody = document.querySelector('#tabla-ventas tbody');
const clienteSelect = document.getElementById('cliente-venta');
const productoSelect = document.getElementById('producto');
const cantidadInput = document.getElementById('cantidad');
const precioUnitarioInput = document.getElementById('precio-unitario');
const totalVentaInput = document.getElementById('total-venta');
const submitButton = formVenta ? formVenta.querySelector('button[type="submit"]') : null;

const API_URL_VENTAS = '/ventas';
const API_URL_CLIENTES = '/clientes';
const API_URL_INVENTARIO = '/inventario'; // Asumiendo que Inventario también tendrá API
const API_URL_SEQUENCE = '/sequence';

if (!formVenta || !tablaVentasBody) {
    return;
}

let editSaleId = null;

// Función para cargar clientes en el select desde el backend
const cargarClientesEnSelect = async () => {
    try {
        const response = await window.fetchWithAuth(API_URL_CLIENTES);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const clientes = await response.json();
        clienteSelect.innerHTML = '<option value="">Seleccione un cliente...</option>';
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.nombre; // Usamos el nombre como valor
            option.textContent = cliente.nombre;
            clienteSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar clientes:', error);
    }
};

// Función para cargar productos en el select desde el backend
const cargarProductosEnSelect = async () => {
    try {
        const response = await window.fetchWithAuth(API_URL_INVENTARIO);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const productos = await response.json();
        productoSelect.innerHTML = '<option value="">Seleccione un producto...</option>';
        productos.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.nombre;
            option.textContent = `${producto.nombre} (Stock: ${producto.stock} ${producto.unidad})`;
            option.dataset.precioVenta = producto.precioVenta;
            productoSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error al cargar productos:', error);
    }
};

// Event listener para autocompletar precio unitario al seleccionar producto
productoSelect.addEventListener('change', () => {
    const selectedOption = productoSelect.options[productoSelect.selectedIndex];
    const precioVenta = selectedOption.dataset.precioVenta;
    if (precioVenta) {
        precioUnitarioInput.value = parseFloat(precioVenta).toFixed(2);
    } else {
        precioUnitarioInput.value = '';
    }
    calcularTotal();
});

// Función para calcular el total de la venta
const calcularTotal = () => {
    const cantidad = parseFloat(cantidadInput.value) || 0;
    const precioUnitario = parseFloat(precioUnitarioInput.value) || 0;
    const total = cantidad * precioUnitario;
    totalVentaInput.value = total.toFixed(2);
};

// Event listeners para calcular el total en tiempo real
cantidadInput.addEventListener('input', calcularTotal);
precioUnitarioInput.addEventListener('input', calcularTotal);

// Establecer la fecha actual por defecto
const fechaVentaInput = document.getElementById('fecha-venta');
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
fechaVentaInput.value = `${yyyy}-${mm}-${dd}`;

// Función para obtener y actualizar el número de factura secuencial desde el backend
const getNewInvoiceNumber = async () => {
    try {
        const response = await window.fetchWithAuth(`${API_URL_SEQUENCE}/invoiceNumber/increment`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.value;
    } catch (error) {
        console.error('Error al obtener nuevo número de factura:', error);
        alert('Error al obtener número de factura. Verifique la consola.');
        return null;
    }
};

const renderizarTabla = async () => {
    tablaVentasBody.innerHTML = '';
    try {
        const response = await window.fetchWithAuth(API_URL_VENTAS);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const ventas = await response.json();

        if (ventas.length === 0) {
            tablaVentasBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay ventas registradas.</td></tr>';
            return;
        }

        ventas.forEach((venta) => {
            const fila = document.createElement('tr');
            const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
            fila.innerHTML = `
                <td>${escape(venta.fecha)}</td>
                <td>${escape(venta.cliente)}</td>
                <td>${escape(venta.producto)}</td>
                <td>${escape(venta.total)}</td>
                <td>${escape(venta.estadoPago)}</td>
                <td>
                    <button class="btn-editar" data-id="${venta.id}">Editar</button>
                    <button class="btn-eliminar" data-id="${venta.id}">Eliminar</button>
                    <button class="btn-generar-factura" data-id="${venta.id}">Factura</button>
                </td>
            `;
            tablaVentasBody.appendChild(fila);
        });
    } catch (error) {
        console.error('Error al cargar ventas:', error);
        tablaVentasBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error al cargar ventas. Asegúrese de que el backend esté funcionando.</td></tr>';
    }
};

const resetFormulario = () => {
    formVenta.reset();
    if (submitButton) submitButton.textContent = 'Registrar Venta';
    editSaleId = null;
    calcularTotal();
    fechaVentaInput.value = `${yyyy}-${mm}-${dd}`;
    cargarClientesEnSelect();
    cargarProductosEnSelect();
};

formVenta.addEventListener('submit', async (e) => {
    e.preventDefault();

    const ventaData = {
        cliente: clienteSelect.value,
        producto: productoSelect.value,
        cantidad: parseFloat(cantidadInput.value),
        precioUnitario: parseFloat(precioUnitarioInput.value),
        total: parseFloat(totalVentaInput.value),
        fecha: fechaVentaInput.value,
        estadoPago: document.getElementById('estado-pago').value,
    };

    try {
        let response;
        if (editSaleId === null) {
            response = await window.fetchWithAuth(API_URL_VENTAS, {
                method: 'POST',
                body: JSON.stringify(ventaData),
            });
        } else {
            response = await window.fetchWithAuth(`${API_URL_VENTAS}/${editSaleId}`, {
                method: 'PUT',
                body: JSON.stringify(ventaData),
            });
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        await renderizarTabla();
        resetFormulario();
    } catch (error) {
        console.error('Error al guardar venta:', error);
        alert(`Error al guardar venta: ${error.message}`);
    }
});

tablaVentasBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-eliminar')) {
        const saleId = parseInt(e.target.dataset.id, 10);
        if (confirm('¿Estás seguro de que quieres eliminar esta venta?')) {
            try {
                const response = await window.fetchWithAuth(`${API_URL_VENTAS}/${saleId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                await renderizarTabla();
                resetFormulario();
            } catch (error) {
                console.error('Error al eliminar venta:', error);
                alert(`Error al eliminar venta: ${error.message}`);
            }
        }
    }

    if (e.target.classList.contains('btn-editar')) {
        const saleId = parseInt(e.target.dataset.id, 10);
        try {
            const response = await window.fetchWithAuth(API_URL_VENTAS);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const ventas = await response.json();
            const venta = ventas.find(v => v.id === saleId);

            if (venta) {
                clienteSelect.value = venta.cliente;
                productoSelect.value = venta.producto;
                cantidadInput.value = venta.cantidad;
                precioUnitarioInput.value = venta.precioUnitario;
                fechaVentaInput.value = venta.fecha;
                document.getElementById('estado-pago').value = venta.estadoPago;
                calcularTotal();

                if (submitButton) submitButton.textContent = 'Actualizar Venta';
                editSaleId = saleId;
                window.scrollTo(0, 0);
            }
        } catch (error) {
            console.error('Error al cargar venta para edición:', error);
            alert('Error al cargar venta para edición. Verifique la consola.');
        }
    }

    if (e.target.classList.contains('btn-generar-factura')) {
        const saleId = parseInt(e.target.dataset.id, 10);
        try {
            const response = await window.fetchWithAuth(API_URL_VENTAS);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const ventas = await response.json();
            const venta = ventas.find(v => v.id === saleId);

            if (venta) {
                const invoiceNumber = await getNewInvoiceNumber();
                if (invoiceNumber === null) return; // Error al obtener número de factura

                const invoiceHTML = `
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Factura #${invoiceNumber}</title>
                        <style>
                            body { font-family: 'Roboto', sans-serif; margin: 20px; color: #333; }
                            .invoice-container { width: 80mm; margin: 0 auto; border: 1px solid #ccc; padding: 10mm; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                            .header { text-align: center; margin-bottom: 20px; }
                            .header h1 { margin: 0; font-size: 24px; color: #2c3e50; }
                            .header p { margin: 5px 0; font-size: 12px; }
                            .details { margin-bottom: 20px; font-size: 12px; }
                            .details div { margin-bottom: 5px; }
                            .item-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                            .item-table th, .item-table td { border: 1px solid #eee; padding: 8px; text-align: left; font-size: 12px; }
                            .item-table th { background-color: #f2f2f2; }
                            .total { text-align: right; font-size: 14px; font-weight: bold; }
                            .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #777; }
                        </style>
                    </head>
                    <body>
                        <div class="invoice-container">
                            <div class="header">
                                <h1>Factura de Venta</h1>
                                <p>Granja Cerdito Feliz</p>
                                <p>Fecha: ${new Date().toLocaleDateString()}</p>
                            </div>
                            <div class="details">
                                <div><strong>Factura No:</strong> ${invoiceNumber}</div>
                                <div><strong>Cliente:</strong> ${escape(venta.cliente)}</div>
                                <div><strong>Fecha de Venta:</strong> ${escape(venta.fecha)}</div>
                                <div><strong>Estado de Pago:</strong> ${escape(venta.estadoPago)}</div>
                            </div>
                            <table class="item-table">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Cantidad</th>
                                        <th>P. Unitario</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>${escape(venta.producto)}</td>
                                        <td>${escape(venta.cantidad)}</td>
                                        <td>${escape(venta.precioUnitario)}</td>
                                        <td>${escape(venta.total)}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div class="total">
                                Total a Pagar: ${escape(venta.total)}
                            </div>
                            <div class="footer">
                                <p>Gracias por su compra.</p>
                                <p>Contacto: [Tu Contacto Aquí]</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;

                const newWindow = window.open('', '_blank');
                newWindow.document.write(invoiceHTML);
                newWindow.document.close();
                newWindow.print();
            }
        } catch (error) {
            console.error('Error al generar factura:', error);
            alert('Error al generar factura. Verifique la consola.');
        }
    }
});

// Inicialización
renderizarTabla();
cargarClientesEnSelect();
cargarProductosEnSelect();
})();;