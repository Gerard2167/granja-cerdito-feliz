(function() {
// Script para la gestión de Inventario

const formProducto = document.getElementById('form-producto');
const tablaProductosBody = document.querySelector('#tabla-productos tbody');
const submitButton = formProducto.querySelector('button[type="submit"]');

if (formProducto && tablaProductosBody) {
    let productos = JSON.parse(localStorage.getItem('inventario')) || [];
    let editIndex = null;

    const guardarProductos = () => {
        localStorage.setItem('inventario', JSON.stringify(productos));
    };

    const renderizarTabla = () => {
        tablaProductosBody.innerHTML = '';
        productos.forEach((producto, index) => {
            const fila = document.createElement('tr');
            const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
            fila.innerHTML = `
                <td>${escape(producto.nombre)}</td>
                <td>${escape(producto.stock)}</td>
                <td>${escape(producto.unidad)}</td>
                <td>$${escape(producto.precioVenta)}</td>
                <td>${escape(producto.proveedor)}</td>
                <td>
                    <button class="btn-editar" data-index="${index}">Editar</button>
                    <button class="btn-eliminar" data-index="${index}">Eliminar</button>
                </td>
            `;
            tablaProductosBody.appendChild(fila);
        });
    };

    const resetFormulario = () => {
        formProducto.reset();
        submitButton.textContent = 'Agregar Producto';
        editIndex = null;
    };

    formProducto.addEventListener('submit', (e) => {
        e.preventDefault();

        const productoData = {
            nombre: document.getElementById('nombre-producto').value,
            descripcion: document.getElementById('descripcion-producto').value,
            stock: parseFloat(document.getElementById('stock-actual').value),
            unidad: document.getElementById('unidad-medida').value,
            precioCompra: parseFloat(document.getElementById('precio-compra').value) || 0,
            precioVenta: parseFloat(document.getElementById('precio-venta').value),
            proveedor: document.getElementById('proveedor-producto').value,
        };

        if (editIndex === null) {
            productos.push(productoData);
        } else {
            productos[editIndex] = productoData;
        }
        
        guardarProductos();
        renderizarTabla();
        resetFormulario();
    });

    tablaProductosBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            const index = parseInt(e.target.dataset.index, 10);
            productos.splice(index, 1);
            guardarProductos();
            renderizarTabla();
            resetFormulario();
        }

        if (e.target.classList.contains('btn-editar')) {
            const index = parseInt(e.target.dataset.index, 10);
            const producto = productos[index];

            document.getElementById('nombre-producto').value = producto.nombre;
            document.getElementById('descripcion-producto').value = producto.descripcion;
            document.getElementById('stock-actual').value = producto.stock;
            document.getElementById('unidad-medida').value = producto.unidad;
            document.getElementById('precio-compra').value = producto.precioCompra;
            document.getElementById('precio-venta').value = producto.precioVenta;
            document.getElementById('proveedor-producto').value = producto.proveedor;

            submitButton.textContent = 'Actualizar Producto';
            editIndex = index;
            window.scrollTo(0, 0);
        }
    });

    // Inicialización
    renderizarTabla();
}
})();