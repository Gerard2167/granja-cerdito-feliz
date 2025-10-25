(function() {
// Script para la gestión de Calendarios

const formEvento = document.getElementById('form-evento');
const tablaEventosBody = document.querySelector('#tabla-eventos tbody');
const submitButton = formEvento ? formEvento.querySelector('button[type="submit"]') : null;
const colaboradorSelect = document.getElementById('colaborador-id');
const mediaUploadInput = document.getElementById('media-upload');
const btnSubirMedia = document.getElementById('btn-subir-media');

const API_URL_CALENDARIOS = '/calendarios';
const API_URL_COLABORADORES = '/colaboradores';

if (!formEvento || !tablaEventosBody) {
    return;
}

let editEventId = null;
const userRole = localStorage.getItem('userRole');


// Establecer la fecha actual por defecto
const fechaEventoInput = document.getElementById('fecha-evento');
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
fechaEventoInput.value = `${yyyy}-${mm}-${dd}`;

// Función para obtener colaboradores del backend
const fetchColaboradores = async () => {
    try {
        const response = await window.fetchWithAuth(API_URL_COLABORADORES);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al obtener colaboradores:', error);
        return [];
    }
};

// Función para poblar el dropdown de colaboradores
const populateColaboradoresDropdown = async () => {
    const colaboradores = await fetchColaboradores();
    colaboradorSelect.innerHTML = '<option value="">Seleccione un colaborador...</option>';
    colaboradores.forEach(colaborador => {
        const option = document.createElement('option');
        option.value = colaborador.id;
        option.textContent = colaborador.nombre;
        colaboradorSelect.appendChild(option);
    });
};

// Función para obtener eventos del backend
const fetchEventos = async () => {
    try {
        const response = await window.fetchWithAuth(API_URL_CALENDARIOS);
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
        tablaEventosBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay eventos programados.</td></tr>';
        return;
    }

    eventos.forEach((evento) => {
        const fila = document.createElement('tr');
        const escape = (str) => String(str).replace(/[&<>"']/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '" ': '&quot;', "'": '&#39;' }[tag] || tag));
        
        const isColaborador = userRole === 'Colaborador / Empleado';
        const editButtonText = isColaborador ? 'Gestionar Tarea' : 'Editar';
        const deleteButton = isColaborador ? '' : `<button class="btn-eliminar" data-id="${evento.id}">Eliminar</button>`;

        // Format dates
        const fechaCreacion = evento.fecha_creacion ? new Date(evento.fecha_creacion).toLocaleString() : '';
        const fechaCompletado = evento.fecha_completado ? new Date(evento.fecha_completado).toLocaleString() : '';

        fila.innerHTML = `
            <td>${escape(fechaCreacion)}</td>
            <td>${escape(evento.tipo)}</td>
            <td>${escape(evento.descripcion)}</td>
            <td>${escape(evento.nombre_colaborador || '')}</td>
            <td>${escape(evento.estado)}</td>
            <td>${escape(evento.observaciones || '')}</td>
            <td>${escape(fechaCompletado)}</td>
            <td>
                ${evento.media_urls ?
                    evento.media_urls.split(',').map(url => {
                        if (!url) return '';
                        const isImage = /\.(jpeg|jpg|png|gif|webp)$/i.test(url);
                        return `<a href="${escape(url)}" target="_blank">${isImage ? `<img src="${escape(url)}" alt="Adjunto" style="width: 50px; height: 50px; object-fit: cover; margin-right: 5px;">` : 'Ver Adjunto'}</a>`;
                    }).join('')
                    : 'N/A'}
            </td>
            <td>
                <button class="btn-editar" data-id="${evento.id}">${editButtonText}</button>
                ${deleteButton}
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

const setupUIForRole = () => {
    if (userRole === 'Colaborador / Empleado') {
        formEvento.style.display = 'none';
    }
};

formEvento.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isColaborador = userRole === 'Colaborador / Empleado';

    const eventoData = {
        fecha: fechaEventoInput.value,
        tipo: document.getElementById('tipo-evento').value,
        descripcion: document.getElementById('descripcion-evento').value,
        colaborador_id: colaboradorSelect.value,
        estado: document.getElementById('estado-evento').value,
        observaciones: document.getElementById('observaciones-evento').value,
    };

    if (isColaborador) {
        delete eventoData.fecha;
        delete eventoData.tipo;
        delete eventoData.descripcion;
        delete eventoData.colaborador_id;
    }


    try {
        let response;
        if (editEventId === null) {
            response = await window.fetchWithAuth(API_URL_CALENDARIOS, {
                method: 'POST',
                body: JSON.stringify(eventoData),
            });
        } else {
            response = await window.fetchWithAuth(`${API_URL_CALENDARIOS}/${editEventId}`, {
                method: 'PUT',
                body: JSON.stringify(eventoData),
            });
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        await renderizarTabla();
        resetFormulario();
        if (isColaborador) {
            formEvento.style.display = 'none';
        }
    } catch (error) {
        console.error('Error al guardar evento:', error);
        alert('Error al guardar evento. Verifique la consola y asegúrese de que el backend esté funcionando.');
    }
});

btnSubirMedia.addEventListener('click', async () => {
    if (!editEventId) {
        alert('Por favor, primero guarde el evento antes de subir un archivo.');
        return;
    }

    const mediaFile = mediaUploadInput.files[0];
    if (!mediaFile) {
        alert('Por favor, seleccione un archivo para subir.');
        return;
    }

    const formData = new FormData();
    formData.append('media', mediaFile);

    try {
        const response = await window.fetchWithAuth(`${API_URL_CALENDARIOS}/${editEventId}/media`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        alert('Archivo subido con éxito!');
        mediaUploadInput.value = ''; // Limpiar el input de archivo
        await renderizarTabla(); // Re-render the table to show new media
    } catch (error) {
        console.error('Error al subir archivo:', error);
        alert('Error al subir archivo. Verifique la consola.');
    }
});

tablaEventosBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-eliminar')) {
        const eventId = parseInt(e.target.dataset.id, 10);
        if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
            try {
                const response = await window.fetchWithAuth(`${API_URL_CALENDARIOS}/${eventId}`, {
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
                formEvento.style.display = 'block';
                
                fechaEventoInput.value = evento.fecha;
                document.getElementById('tipo-evento').value = evento.tipo;
                document.getElementById('descripcion-evento').value = evento.descripcion;
                colaboradorSelect.value = evento.colaborador_id;
                document.getElementById('estado-evento').value = evento.estado;
                document.getElementById('observaciones-evento').value = evento.observaciones || '';


                if (submitButton) submitButton.textContent = 'Actualizar Evento';
                editEventId = eventId;
                window.scrollTo(0, 0);

                if (userRole === 'Colaborador / Empleado') {
                    fechaEventoInput.disabled = true;
                    document.getElementById('tipo-evento').disabled = true;
                    document.getElementById('descripcion-evento').disabled = true;
                    colaboradorSelect.disabled = true;
                } else {
                    fechaEventoInput.disabled = false;
                    document.getElementById('tipo-evento').disabled = false;
                    document.getElementById('descripcion-evento').disabled = false;
                    colaboradorSelect.disabled = false;
                }
            }
        } catch (error) {
            console.error('Error al cargar evento para edición:', error);
            alert('Error al cargar evento para edición. Verifique la consola.');
        }
    }
    
    if (e.target.classList.contains('btn-ver-media')) {
        const eventId = parseInt(e.target.dataset.id, 10);
        // Lógica para ver la media, por ejemplo, abrir un modal con las imágenes/videos
        alert(`Funcionalidad para ver media del evento ${eventId} aún no implementada.`);
    }
});

// Inicialización
const init = async () => {
    if (userRole === 'Administrador General' || userRole === 'Supervisor de Producción') {
        await populateColaboradoresDropdown();
    }
    await renderizarTabla();
    setupUIForRole();
};

init();

})();