(function() {
// Script para la gestión de Ventas

const formVenta = document.getElementById('form-venta');
const tablaVentasBody = document.querySelector('#tabla-ventas tbody');
const clienteSelect = document.getElementById('cliente-venta');
const productoSelect = document.getElementById('producto'); // Nuevo: select de productos
const cantidadInput = document.getElementById('cantidad');
const precioUnitarioInput = document.getElementById('precio-unitario');
const totalVentaInput = document.getElementById('total-venta');
const submitButton = formVenta.querySelector('button[type="submit"]');

if (formVenta && tablaVentasBody) {
    let ventas = JSON.parse(localStorage.getItem('ventas')) || [];
    let editIndex = null;

    // Función para cargar clientes en el select
    const cargarClientesEnSelect = () => {
        const clientes = JSON.parse(localStorage.getItem('clientes')) || [];
        clienteSelect.innerHTML = '<option value="">Seleccione un cliente...</option>';
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.nombre; // Usamos el nombre como valor
            option.textContent = cliente.nombre;
            clienteSelect.appendChild(option);
        });
    };

    // Función para cargar productos en el select
    const cargarProductosEnSelect = () => {
        const productos = JSON.parse(localStorage.getItem('inventario')) || [];
        console.log('Productos cargados para el selector de ventas:', productos);
        productoSelect.innerHTML = '<option value="">Seleccione un producto...</option>';
        productos.forEach(producto => {
            const option = document.createElement('option');
            option.value = producto.nombre; // Usamos el nombre como valor
            option.textContent = `${producto.nombre} (Stock: ${producto.stock} ${producto.unidad})`;
            option.dataset.precioVenta = producto.precioVenta; // Guardamos el precio de venta
            productoSelect.appendChild(option);
        });
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
        totalVentaInput.value = total.toFixed(2); // Formatear a 2 decimales
    };

    // Event listeners para calcular el total en tiempo real
    cantidadInput.addEventListener('input', calcularTotal);
    precioUnitarioInput.addEventListener('input', calcularTotal);

    // Establecer la fecha actual por defecto
    const fechaVentaInput = document.getElementById('fecha-venta');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months start at 0!
    const dd = String(today.getDate()).padStart(2, '0');
    fechaVentaInput.value = `${yyyy}-${mm}-${dd}`;

    const guardarVentas = () => {
        localStorage.setItem('ventas', JSON.stringify(ventas));
    };

    // Función para obtener y actualizar el número de factura secuencial
    const getNewInvoiceNumber = () => {
        let lastInvoiceNumber = parseInt(localStorage.getItem('lastInvoiceNumber') || '0', 10);
        lastInvoiceNumber++;
        localStorage.setItem('lastInvoiceNumber', lastInvoiceNumber.toString());
        return lastInvoiceNumber;
    };

    const renderizarTabla = () => {
        tablaVentasBody.innerHTML = '';
        ventas.forEach((venta, index) => {
            const fila = document.createElement('tr');
            const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
            fila.innerHTML = `
                <td>${escape(venta.fecha)}</td>
                <td>${escape(venta.cliente)}</td>
                <td>${escape(venta.producto)}</td>
                <td>$${escape(venta.total)}</td>
                <td>${escape(venta.estadoPago)}</td>
                <td>
                    <button class="btn-editar" data-index="${index}">Editar</button>
                    <button class="btn-eliminar" data-index="${index}">Eliminar</button>
                    <button class="btn-generar-factura" data-index="${index}">Factura</button>
                </td>
            `;
            tablaVentasBody.appendChild(fila);
        });
    };

    const resetFormulario = () => {
        formVenta.reset();
        submitButton.textContent = 'Registrar Venta';
        editIndex = null;
        calcularTotal(); // Reset total display
        fechaVentaInput.value = `${yyyy}-${mm}-${dd}`;
        cargarProductosEnSelect(); // Recargar productos para asegurar que el select esté bien.
    };

    formVenta.addEventListener('submit', (e) => {
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

        if (editIndex === null) {
            ventas.push(ventaData);
        } else {
            ventas[editIndex] = ventaData;
        }
        
        guardarVentas();
        renderizarTabla();
        resetFormulario();
    });

    tablaVentasBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            const index = parseInt(e.target.dataset.index, 10);
            ventas.splice(index, 1);
            guardarVentas();
            renderizarTabla();
            resetFormulario();
        }

        if (e.target.classList.contains('btn-editar')) {
            const index = parseInt(e.target.dataset.index, 10);
            const venta = ventas[index];

            clienteSelect.value = venta.cliente;
            productoSelect.value = venta.producto; // Asignar el producto seleccionado
            cantidadInput.value = venta.cantidad;
            precioUnitarioInput.value = venta.precioUnitario;
            fechaVentaInput.value = venta.fecha;
            document.getElementById('estado-pago').value = venta.estadoPago;
            calcularTotal(); // Ensure total is calculated for edited item

            submitButton.textContent = 'Actualizar Venta';
            editIndex = index;
            window.scrollTo(0, 0);
        }

        if (e.target.classList.contains('btn-generar-factura')) {
            const index = parseInt(e.target.dataset.index, 10);
            const venta = ventas[index];
            const invoiceNumber = getNewInvoiceNumber();

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
                            <p>Plataforma GCF</p>
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
                                    <td>$${escape(venta.precioUnitario)}</td>
                                    <td>$${escape(venta.total)}</td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="total">
                            Total a Pagar: $${escape(venta.total)}
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
            newWindow.print(); // Abre el diálogo de impresión automáticamente
        }
    });

    // Inicialización
    cargarClientesEnSelect();
    cargarProductosEnSelect(); // Nueva: Cargar productos al iniciar
    renderizarTabla();
    calcularTotal(); // Calculate initial total for empty fields
}
})();