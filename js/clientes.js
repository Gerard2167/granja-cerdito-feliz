(function() {
// Este script se ejecuta cuando se carga la página de clientes.

// Espera a que todo el contenido del DOM esté completamente cargado y parseado.

    // Intenta obtener los elementos del DOM solo después de que el DOM esté listo.
    const formCliente = document.getElementById('form-cliente');
    const tablaClientesBody = document.querySelector('#tabla-clientes tbody');
    const submitButton = formCliente.querySelector('button[type="submit"]');

    // Si el formulario o la tabla no existen en la página actual, no hagas nada.
    if (!formCliente || !tablaClientesBody) {
        return;
    }

    // Carga los clientes de localStorage o inicializa un array vacío.
    let clientes = JSON.parse(localStorage.getItem('clientes')) || [];

    // Función para guardar los clientes en localStorage.
    const guardarClientes = () => {
        localStorage.setItem('clientes', JSON.stringify(clientes));
    };

    // Función para renderizar (dibujar) la tabla de clientes.
    const renderizarTabla = () => {
        tablaClientesBody.innerHTML = ''; // Limpia la tabla antes de redibujar.
        clientes.forEach((cliente, index) => {
            const fila = document.createElement('tr');
            // Escapamos el HTML para prevenir XSS.
            const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
            fila.innerHTML = `
                <td>${escape(cliente.nombre)}</td>
                <td>${escape(cliente.telefono)}</td>
                <td>${escape(cliente.email)}</td>
                <td>${escape(cliente.direccion)}</td>
                <td>
                    <button class="btn-editar" data-index="${index}">Editar</button>
                    <button class="btn-eliminar" data-index="${index}">Eliminar</button>
                </td>
            `;
            tablaClientesBody.appendChild(fila);
        });
    };

    let editIndex = null; // Para saber qué cliente estamos editando.

    const resetFormulario = () => {
        formCliente.reset();
        submitButton.textContent = 'Agregar Cliente';
        editIndex = null;
    };

    // Manejador para el envío del formulario.
    formCliente.addEventListener('submit', (e) => {
        e.preventDefault(); // Previene la recarga de la página.

        // Crea un nuevo objeto cliente con los datos del formulario.
        const nuevoCliente = {
            nombre: document.getElementById('nombre').value,
            telefono: document.getElementById('telefono').value,
            email: document.getElementById('email').value,
            direccion: document.getElementById('direccion').value,
        };

        if (editIndex === null) {
            // Modo Agregar
            clientes.push(nuevoCliente);
        } else {
            // Modo Editar
            clientes[editIndex] = nuevoCliente;
        }

        guardarClientes(); // Guarda en localStorage.
        renderizarTabla(); // Actualiza la tabla.

        resetFormulario(); // Limpia el formulario.
    });

    // Manejador para los botones de la tabla (usando delegación de eventos).
    tablaClientesBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            const index = parseInt(e.target.dataset.index, 10);
            clientes.splice(index, 1); // Elimina el cliente del array.
            guardarClientes();
            renderizarTabla();
            resetFormulario(); // Resetea por si se estaba editando este cliente.
        }
        // Aquí se podría añadir la lógica para el botón de editar.
        if (e.target.classList.contains('btn-editar')) {
            const index = parseInt(e.target.dataset.index, 10);
            const cliente = clientes[index];

            document.getElementById('nombre').value = cliente.nombre;
            document.getElementById('telefono').value = cliente.telefono;
            document.getElementById('email').value = cliente.email;
            document.getElementById('direccion').value = cliente.direccion;

            submitButton.textContent = 'Actualizar Cliente';
            editIndex = index;
            window.scrollTo(0, 0); // Sube al inicio de la página para ver el form.
        }
    });

    // Renderiza la tabla por primera vez al cargar la página.
    renderizarTabla();
})();