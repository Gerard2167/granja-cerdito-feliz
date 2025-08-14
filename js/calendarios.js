(function() {
// Script para la gestión de Calendarios

const formEvento = document.getElementById('form-evento');
const tablaEventosBody = document.querySelector('#tabla-eventos tbody');
const submitButton = formEvento ? formEvento.querySelector('button[type="submit"]') : null;

const API_URL_CALENDARIOS = 'http://localhost:3000/api/calendarios';

if (!formEvento || !tablaEventosBody) {
    return;
}

let editEventId = null;

// Establecer la fecha actual por defecto
const fechaEventoInput = document.getElementById('fecha-evento');
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
fechaEventoInput.value = `${yyyy}-${mm}-${dd}`;

// Función para obtener eventos del backend
const fetchEventos = async () => {
    try {
        const response = await fetch(API_URL_CALENDARIOS);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al obtener eventos:', error);
        return [];
    }
};

const renderizarTabla = async () => {
    tablaEventosBody.innerHTML = '';
    const eventos = await fetchEventos();

    if (eventos.length === 0) {
        tablaEventosBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay eventos programados.</td></tr>';
        return;
    }

    eventos.forEach((evento) => {
        const fila = document.createElement('tr');
        const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
        fila.innerHTML = `
            <td>${escape(evento.fecha)}</td>
            <td>${escape(evento.tipo)}</td>
            <td>${escape(evento.descripcion)}</td>
            <td>${escape(evento.responsable || '')}</td>
            <td>${escape(evento.estado)}</td>
            <td>
                <button class="btn-editar" data-id="${evento.id}">Editar</button>
                <button class="btn-eliminar" data-id="${evento.id}">Eliminar</button>
            </td>
        `;
        tablaEventosBody.appendChild(fila);
    });
};

const resetFormulario = () => {
    formEvento.reset();
    if (submitButton) submitButton.textContent = 'Agregar Evento';
    editEventId = null;
    fechaEventoInput.value = `${yyyy}-${mm}-${dd}`;
};

formEvento.addEventListener('submit', async (e) => {
    e.preventDefault();

    const eventoData = {
        fecha: fechaEventoInput.value,
        tipo: document.getElementById('tipo-evento').value,
        descripcion: document.getElementById('descripcion-evento').value,
        responsable: document.getElementById('responsable-evento').value,
        estado: document.getElementById('estado-evento').value,
    };

    try {
        let response;
        if (editEventId === null) {
            response = await fetch(API_URL_CALENDARIOS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventoData),
            });
        } else {
            response = await fetch(`${API_URL_CALENDARIOS}/${editEventId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventoData),
            });
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        await renderizarTabla();
        resetFormulario();
    } catch (error) {
        console.error('Error al guardar evento:', error);
        alert('Error al guardar evento. Verifique la consola y asegúrese de que el backend esté funcionando.');
    }
});

tablaEventosBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-eliminar')) {
        const eventId = parseInt(e.target.dataset.id, 10);
        if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
            try {
                const response = await fetch(`${API_URL_CALENDARIOS}/${eventId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                await renderizarTabla();
                resetFormulario();
            } catch (error) {
                console.error('Error al eliminar evento:', error);
                alert('Error al eliminar evento. Verifique la consola.');
            }
        }
    }

    if (e.target.classList.contains('btn-editar')) {
        const eventId = parseInt(e.target.dataset.id, 10);
        try {
            const eventos = await fetchEventos();
            const evento = eventos.find(e => e.id === eventId);

            if (evento) {
                fechaEventoInput.value = evento.fecha;
                document.getElementById('tipo-evento').value = evento.tipo;
                document.getElementById('descripcion-evento').value = evento.descripcion;
                document.getElementById('responsable-evento').value = evento.responsable;
                document.getElementById('estado-evento').value = evento.estado;

                if (submitButton) submitButton.textContent = 'Actualizar Evento';
                editEventId = eventId;
                window.scrollTo(0, 0);
            }
        } catch (error) {
            console.error('Error al cargar evento para edición:', error);
            alert('Error al cargar evento para edición. Verifique la consola.');
        }
    }
});

// Inicialización
renderizarTabla();
})();