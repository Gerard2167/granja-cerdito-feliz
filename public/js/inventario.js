(function() {
// Script para la gestión de Inventario

const formProducto = document.getElementById('form-producto');
const tablaProductosBody = document.querySelector('#tabla-productos tbody');
const submitButton = formProducto ? formProducto.querySelector('button[type="submit"]') : null;

const API_URL_INVENTARIO = '/inventario';

if (!formProducto || !tablaProductosBody) {
    return;
}

let editProductId = null;

// Función para obtener productos del backend
const fetchProductos = async () => {
    try {
        const response = await window.fetchWithAuth(API_URL_INVENTARIO);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al obtener productos:', error);
        return [];
    }
};

const renderizarTabla = async () => {
    tablaProductosBody.innerHTML = '';
    const productos = await fetchProductos();

    if (productos.length === 0) {
        tablaProductosBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay productos en inventario.</td></tr>';
        return;
    }

    productos.forEach((producto) => {
        const fila = document.createElement('tr');
        const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
        fila.innerHTML = `
            <td>${escape(producto.nombre)}</td>
            <td>${escape(producto.stock)}</td>
            <td>${escape(producto.unidad || '')}</td>
            <td>$${escape(producto.precioVenta)}</td>
            <td>${escape(producto.proveedor || '')}</td>
            <td>
                <button class="btn-editar" data-id="${producto.id}">Editar</button>
                <button class="btn-eliminar" data-id="${producto.id}">Eliminar</button>
            </td>
        `;
        tablaProductosBody.appendChild(fila);
    });
};

const resetFormulario = () => {
    formProducto.reset();
    if (submitButton) submitButton.textContent = 'Agregar Producto';
    editProductId = null;
};

formProducto.addEventListener('submit', async (e) => {
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

    try {
        let response;
        if (editProductId === null) {
            response = await window.fetchWithAuth(API_URL_INVENTARIO, {
                method: 'POST',
                body: JSON.stringify(productoData),
            });
        } else {
            response = await window.fetchWithAuth(`${API_URL_INVENTARIO}/${editProductId}`, {
                method: 'PUT',
                body: JSON.stringify(productoData),
            });
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        await renderizarTabla();
        resetFormulario();
    } catch (error) {
        console.error('Error al guardar producto:', error);
        alert('Error al guardar producto. Verifique la consola y asegúrese de que el backend esté funcionando.');
    }
});

tablaProductosBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-eliminar')) {
        const productId = parseInt(e.target.dataset.id, 10);
        if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
            try {
                const response = await window.fetchWithAuth(`${API_URL_INVENTARIO}/${productId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                await renderizarTabla();
                resetFormulario();
            } catch (error) {
                console.error('Error al eliminar producto:', error);
                alert('Error al eliminar producto. Verifique la consola.');
            }
        }
    }

    if (e.target.classList.contains('btn-editar')) {
        const productId = parseInt(e.target.dataset.id, 10);
        try {
            const productos = await fetchProductos();
            const producto = productos.find(p => p.id === productId);

            if (producto) {
                document.getElementById('nombre-producto').value = producto.nombre;
                document.getElementById('descripcion-producto').value = producto.descripcion;
                document.getElementById('stock-actual').value = producto.stock;
                document.getElementById('unidad-medida').value = producto.unidad;
                document.getElementById('precio-compra').value = producto.precioCompra;
                document.getElementById('precio-venta').value = producto.precioVenta;
                document.getElementById('proveedor-producto').value = producto.proveedor;

                if (submitButton) submitButton.textContent = 'Actualizar Producto';
                editProductId = productId;
                window.scrollTo(0, 0);
            }
        } catch (error) {
            console.error('Error al cargar producto para edición:', error);
            alert('Error al cargar producto para edición. Verifique la consola.');
        }
    }
});

// Inicialización
renderizarTabla();
})();