(function() {
// Script para la gestión de Proveedores

const formProveedor = document.getElementById('form-proveedor');
const tablaProveedoresBody = document.querySelector('#tabla-proveedores tbody');
const submitButton = formProveedor.querySelector('button[type="submit"]');

if (formProveedor && tablaProveedoresBody) {
    let proveedores = JSON.parse(localStorage.getItem('proveedores')) || [];
    let editIndex = null;

    const guardarProveedores = () => {
        localStorage.setItem('proveedores', JSON.stringify(proveedores));
    };

    const renderizarTabla = () => {
        tablaProveedoresBody.innerHTML = '';
        proveedores.forEach((proveedor, index) => {
            const fila = document.createElement('tr');
            const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
            fila.innerHTML = `
                <td>${escape(proveedor.nombre)}</td>
                <td>${escape(proveedor.personaContacto)}</td>
                <td>${escape(proveedor.telefono)}</td>
                <td>${escape(proveedor.email)}</td>
                <td>${escape(proveedor.productosServicios)}</td>
                <td>
                    <button class="btn-editar" data-index="${index}">Editar</button>
                    <button class="btn-eliminar" data-index="${index}">Eliminar</button>
                </td>
            `;
            tablaProveedoresBody.appendChild(fila);
        });
    };

    const resetFormulario = () => {
        formProveedor.reset();
        submitButton.textContent = 'Agregar Proveedor';
        editIndex = null;
    };

    formProveedor.addEventListener('submit', (e) => {
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

        if (editIndex === null) {
            proveedores.push(proveedorData);
        } else {
            proveedores[editIndex] = proveedorData;
        }
        
        guardarProveedores();
        renderizarTabla();
        resetFormulario();
    });

    tablaProveedoresBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            const index = parseInt(e.target.dataset.index, 10);
            proveedores.splice(index, 1);
            guardarProveedores();
            renderizarTabla();
            resetFormulario();
        }

        if (e.target.classList.contains('btn-editar')) {
            const index = parseInt(e.target.dataset.index, 10);
            const proveedor = proveedores[index];

            document.getElementById('nombre-proveedor').value = proveedor.nombre;
            document.getElementById('persona-contacto').value = proveedor.personaContacto;
            document.getElementById('telefono-proveedor').value = proveedor.telefono;
            document.getElementById('email-proveedor').value = proveedor.email;
            document.getElementById('direccion-proveedor').value = proveedor.direccion;
            document.getElementById('productos-servicios').value = proveedor.productosServicios;
            document.getElementById('terminos-pago').value = proveedor.terminosPago;

            submitButton.textContent = 'Actualizar Proveedor';
            editIndex = index;
            window.scrollTo(0, 0);
        }
    });

    // Inicialización
    renderizarTabla();
}
})();