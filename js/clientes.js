(function() {
// Este script se ejecuta cuando se carga la página de clientes.

    const formCliente = document.getElementById('form-cliente');
    const tablaClientesBody = document.querySelector('#tabla-clientes tbody');
    const submitButton = formCliente ? formCliente.querySelector('button[type="submit"]') : null;

    const API_URL = 'http://localhost:3000/api/clientes';

    if (!formCliente || !tablaClientesBody) {
        return;
    }

    let editClientId = null; // Para saber qué cliente estamos editando (usaremos el ID del backend)

    // Función para obtener clientes del backend
    const fetchClientes = async () => {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error al obtener clientes:', error);
            return [];
        }
    };

    // Función para renderizar (dibujar) la tabla de clientes.
    const renderizarTabla = async () => {
        tablaClientesBody.innerHTML = ''; // Limpia la tabla antes de redibujar.
        const clientes = await fetchClientes();

        if (clientes.length === 0) {
            tablaClientesBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay clientes registrados.</td></tr>';
            return;
        }

        clientes.forEach((cliente) => {
            const fila = document.createElement('tr');
            // Escapamos el HTML para prevenir XSS.
            const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
            fila.innerHTML = `
                <td>${escape(cliente.nombre)}</td>
                <td>${escape(cliente.telefono)}</td>
                <td>${escape(cliente.email)}</td>
                <td>${escape(cliente.direccion)}</td>
                <td>
                    <button class="btn-editar" data-id="${cliente.id}">Editar</button>
                    <button class="btn-eliminar" data-id="${cliente.id}">Eliminar</button>
                </td>
            `;
            tablaClientesBody.appendChild(fila);
        });
    };

    const resetFormulario = () => {
        formCliente.reset();
        if (submitButton) submitButton.textContent = 'Agregar Cliente';
        editClientId = null;
    };

    // Manejador para el envío del formulario.
    formCliente.addEventListener('submit', async (e) => {
        e.preventDefault(); // Previene la recarga de la página.

        // Crea un nuevo objeto cliente con los datos del formulario.
        const clienteData = {
            nombre: document.getElementById('nombre').value,
            telefono: document.getElementById('telefono').value,
            email: document.getElementById('email').value,
            direccion: document.getElementById('direccion').value,
        };

        try {
            let response;
            if (editClientId === null) {
                // Modo Agregar
                response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clienteData),
                });
            } else {
                // Modo Editar
                response = await fetch(`${API_URL}/${editClientId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clienteData),
                });
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            await renderizarTabla(); // Actualiza la tabla.
            resetFormulario(); // Limpia el formulario.
        } catch (error) {
            console.error('Error al guardar cliente:', error);
            alert('Error al guardar cliente. Verifique la consola.');
        }
    });

    // Manejador para los botones de la tabla (usando delegación de eventos).
    tablaClientesBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            const clientId = parseInt(e.target.dataset.id, 10);
            if (confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
                try {
                    const response = await fetch(`${API_URL}/${clientId}`, {
                        method: 'DELETE',
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    await renderizarTabla();
                    resetFormulario();
                } catch (error) {
                    console.error('Error al eliminar cliente:', error);
                    alert('Error al eliminar cliente. Verifique la consola.');
                }
            }
        }

        if (e.target.classList.contains('btn-editar')) {
            const clientId = parseInt(e.target.dataset.id, 10);
            const clientes = await fetchClientes(); // Obtener la lista actual para encontrar el cliente
            const cliente = clientes.find(c => c.id === clientId);

            if (cliente) {
                document.getElementById('nombre').value = cliente.nombre;
                document.getElementById('telefono').value = cliente.telefono;
                document.getElementById('email').value = cliente.email;
                document.getElementById('direccion').value = cliente.direccion;

                if (submitButton) submitButton.textContent = 'Actualizar Cliente';
                editClientId = clientId;
                window.scrollTo(0, 0); // Sube al inicio de la página para ver el form.
            }
        }
    });

    // Renderiza la tabla por primera vez al cargar la página.
    renderizarTabla();
})();