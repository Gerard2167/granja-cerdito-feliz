(function() {
// Script para la gestión de Proveedores

const formProveedor = document.getElementById('form-proveedor');
const tablaProveedoresBody = document.querySelector('#tabla-proveedores tbody');
const submitButton = formProveedor ? formProveedor.querySelector('button[type="submit"]') : null;

const API_URL_PROVEEDORES = 'http://localhost:3000/api/proveedores';

if (!formProveedor || !tablaProveedoresBody) {
    return;
}

let editProveedorId = null;

// Función para obtener proveedores del backend
const fetchProveedores = async () => {
    try {
        const response = await fetch(API_URL_PROVEEDORES);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al obtener proveedores:', error);
        return [];
    }
};

const renderizarTabla = async () => {
    tablaProveedoresBody.innerHTML = '';
    const proveedores = await fetchProveedores();

    if (proveedores.length === 0) {
        tablaProveedoresBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay proveedores registrados.</td></tr>';
        return;
    }

    proveedores.forEach((proveedor) => {
        const fila = document.createElement('tr');
        const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
        fila.innerHTML = `
            <td>${escape(proveedor.nombre)}</td>
            <td>${escape(proveedor.personaContacto || '')}</td>
            <td>${escape(proveedor.telefono || '')}</td>
            <td>${escape(proveedor.email || '')}</td>
            <td>${escape(proveedor.productosServicios || '')}</td>
            <td>
                <button class="btn-editar" data-id="${proveedor.id}">Editar</button>
                <button class="btn-eliminar" data-id="${proveedor.id}">Eliminar</button>
            </td>
        `;
        tablaProveedoresBody.appendChild(fila);
    });
};

const resetFormulario = () => {
    formProveedor.reset();
    if (submitButton) submitButton.textContent = 'Agregar Proveedor';
    editProveedorId = null;
};

formProveedor.addEventListener('submit', async (e) => {
    e.preventDefault();

    const proveedorData = {
        nombre: document.getElementById('nombre-proveedor').value,
        personaContacto: document.getElementById('persona-contacto').value,
        telefono: document.getElementById('telefono-proveedor').value,
        email: document.getElementById('email-proveedor').value,
        direccion: document.getElementById('direccion-proveedor').value,
        productosServicios: document.getElementById('productos-servicios').value,
        terminosPago: document.getElementById('terminos-pago').value,
    };

    try {
        let response;
        if (editProveedorId === null) {
            response = await fetch(API_URL_PROVEEDORES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proveedorData),
            });
        } else {
            response = await fetch(`${API_URL_PROVEEDORES}/${editProveedorId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(proveedorData),
            });
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        await renderizarTabla();
        resetFormulario();
    } catch (error) {
        console.error('Error al guardar proveedor:', error);
        alert('Error al guardar proveedor. Verifique la consola y asegúrese de que el backend esté funcionando.');
    }
});

tablaProveedoresBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-eliminar')) {
        const proveedorId = parseInt(e.target.dataset.id, 10);
        if (confirm('¿Estás seguro de que quieres eliminar este proveedor?')) {
            try {
                const response = await fetch(`${API_URL_PROVEEDORES}/${proveedorId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                await renderizarTabla();
                resetFormulario();
            } catch (error) {
                console.error('Error al eliminar proveedor:', error);
                alert('Error al eliminar proveedor. Verifique la consola.');
            }
        }
    }

    if (e.target.classList.contains('btn-editar')) {
        const proveedorId = parseInt(e.target.dataset.id, 10);
        try {
            const proveedores = await fetchProveedores();
            const proveedor = proveedores.find(p => p.id === proveedorId);

            if (proveedor) {
                document.getElementById('nombre-proveedor').value = proveedor.nombre;
                document.getElementById('persona-contacto').value = proveedor.personaContacto;
                document.getElementById('telefono-proveedor').value = proveedor.telefono;
                document.getElementById('email-proveedor').value = proveedor.email;
                document.getElementById('direccion-proveedor').value = proveedor.direccion;
                document.getElementById('productos-servicios').value = proveedor.productosServicios;
                document.getElementById('terminos-pago').value = proveedor.terminosPago;

                if (submitButton) submitButton.textContent = 'Actualizar Proveedor';
                editProveedorId = proveedorId;
                window.scrollTo(0, 0);
            }
        } catch (error) {
            console.error('Error al cargar proveedor para edición:', error);
            alert('Error al cargar proveedor para edición. Verifique la consola.');
        }
    }
});

// Inicialización
renderizarTabla();
})();