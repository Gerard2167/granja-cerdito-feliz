(function() {
// Script para la gestión de Calendarios

const formEvento = document.getElementById('form-evento');
const tablaEventosBody = document.querySelector('#tabla-eventos tbody');
const submitButton = formEvento.querySelector('button[type="submit"]');

if (formEvento && tablaEventosBody) {
    let eventos = JSON.parse(localStorage.getItem('calendarioEventos')) || [];
    let editIndex = null;

    // Establecer la fecha actual por defecto
    const fechaEventoInput = document.getElementById('fecha-evento');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months start at 0!
    const dd = String(today.getDate()).padStart(2, '0');
    fechaEventoInput.value = `${yyyy}-${mm}-${dd}`;

    const guardarEventos = () => {
        localStorage.setItem('calendarioEventos', JSON.stringify(eventos));
    };

    const renderizarTabla = () => {
        tablaEventosBody.innerHTML = '';
        eventos.forEach((evento, index) => {
            const fila = document.createElement('tr');
            const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
            fila.innerHTML = `
                <td>${escape(evento.fecha)}</td>
                <td>${escape(evento.tipo)}</td>
                <td>${escape(evento.descripcion)}</td>
                <td>${escape(evento.responsable || '')}</td>
                <td>${escape(evento.estado)}</td>
                <td>
                    <button class="btn-editar" data-index="${index}">Editar</button>
                    <button class="btn-eliminar" data-index="${index}">Eliminar</button>
                </td>
            `;
            tablaEventosBody.appendChild(fila);
        });
    };

    const resetFormulario = () => {
        formEvento.reset();
        submitButton.textContent = 'Agregar Evento';
        editIndex = null;
        fechaEventoInput.value = `${yyyy}-${mm}-${dd}`;
    };

    formEvento.addEventListener('submit', (e) => {
        e.preventDefault();

        const eventoData = {
            fecha: fechaEventoInput.value,
            tipo: document.getElementById('tipo-evento').value,
            descripcion: document.getElementById('descripcion-evento').value,
            responsable: document.getElementById('responsable-evento').value,
            estado: document.getElementById('estado-evento').value,
        };

        if (editIndex === null) {
            eventos.push(eventoData);
        } else {
            eventos[editIndex] = eventoData;
        }
        
        guardarEventos();
        renderizarTabla();
        resetFormulario();
    });

    tablaEventosBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            const index = parseInt(e.target.dataset.index, 10);
            eventos.splice(index, 1);
            guardarEventos();
            renderizarTabla();
            resetFormulario();
        }

        if (e.target.classList.contains('btn-editar')) {
            const index = parseInt(e.target.dataset.index, 10);
            const evento = eventos[index];

            fechaEventoInput.value = evento.fecha;
            document.getElementById('tipo-evento').value = evento.tipo;
            document.getElementById('descripcion-evento').value = evento.descripcion;
            document.getElementById('responsable-evento').value = evento.responsable;
            document.getElementById('estado-evento').value = evento.estado;

            submitButton.textContent = 'Actualizar Evento';
            editIndex = index;
            window.scrollTo(0, 0);
        }
    });

    // Inicialización
    renderizarTabla();
}
})();