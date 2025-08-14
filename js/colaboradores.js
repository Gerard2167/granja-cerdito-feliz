(function() {
// Script para la gestión de Colaboradores

const formColaborador = document.getElementById('form-colaborador');
const tablaColaboradoresBody = document.querySelector('#tabla-colaboradores tbody');
const submitButton = formColaborador ? formColaborador.querySelector('button[type="submit"]') : null;

const API_URL_COLABORADORES = 'http://192.168.0.13:3000/api/colaboradores';

if (!formColaborador || !tablaColaboradoresBody) {
    return;
}

let editColaboradorId = null;

// Establecer la fecha actual por defecto para Fecha de Inicio
const fechaInicioInput = document.getElementById('fecha-inicio');
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
fechaInicioInput.value = `${yyyy}-${mm}-${dd}`;

// Función para obtener colaboradores del backend
const fetchColaboradores = async () => {
    try {
        const response = await fetch(API_URL_COLABORADORES);
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

const renderizarTabla = async () => {
    tablaColaboradoresBody.innerHTML = '';
    const colaboradores = await fetchColaboradores();

    if (colaboradores.length === 0) {
        tablaColaboradoresBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay colaboradores registrados.</td></tr>';
        return;
    }

    colaboradores.forEach((colaborador) => {
        const fila = document.createElement('tr');
        const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
        fila.innerHTML = `
            <td>${escape(colaborador.nombre)}</td>
            <td>${escape(colaborador.cargo || '')}</td>
            <td>${escape(colaborador.telefono || '')}</td>
            <td>${escape(colaborador.email || '')}</td>
            <td>${escape(colaborador.fechaInicio || '')}</td>
            <td>
                <button class="btn-editar" data-id="${colaborador.id}">Editar</button>
                <button class="btn-eliminar" data-id="${colaborador.id}">Eliminar</button>
            </td>
        `;
        tablaColaboradoresBody.appendChild(fila);
    });
};

const resetFormulario = () => {
    formColaborador.reset();
    if (submitButton) submitButton.textContent = 'Agregar Colaborador';
    editColaboradorId = null;
    fechaInicioInput.value = `${yyyy}-${mm}-${dd}`;
};

formColaborador.addEventListener('submit', async (e) => {
    e.preventDefault();

    const colaboradorData = {
        nombre: document.getElementById('nombre-colaborador').value,
        cargo: document.getElementById('cargo-colaborador').value,
        telefono: document.getElementById('telefono-colaborador').value,
        email: document.getElementById('email-colaborador').value,
        direccion: document.getElementById('direccion-colaborador').value,
        fechaInicio: fechaInicioInput.value,
        salario: parseFloat(document.getElementById('salario-colaborador').value) || 0,
        notas: document.getElementById('notas-colaborador').value,
    };

    try {
        let response;
        if (editColaboradorId === null) {
            response = await fetch(API_URL_COLABORADORES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(colaboradorData),
            });
        } else {
            response = await fetch(`${API_URL_COLABORADORES}/${editColaboradorId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(colaboradorData),
            });
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        await renderizarTabla();
        resetFormulario();
    } catch (error) {
        console.error('Error al guardar colaborador:', error);
        alert('Error al guardar colaborador. Verifique la consola y asegúrese de que el backend esté funcionando.');
    }
});

tablaColaboradoresBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-eliminar')) {
        const colaboradorId = parseInt(e.target.dataset.id, 10);
        if (confirm('¿Estás seguro de que quieres eliminar este colaborador?')) {
            try {
                const response = await fetch(`${API_URL_COLABORADORES}/${colaboradorId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                await renderizarTabla();
                resetFormulario();
            } catch (error) {
                console.error('Error al eliminar colaborador:', error);
                alert('Error al eliminar colaborador. Verifique la consola.');
            }
        }
    }

    if (e.target.classList.contains('btn-editar')) {
        const colaboradorId = parseInt(e.target.dataset.id, 10);
        try {
            const colaboradores = await fetchColaboradores();
            const colaborador = colaboradores.find(c => c.id === colaboradorId);

            if (colaborador) {
                document.getElementById('nombre-colaborador').value = colaborador.nombre;
                document.getElementById('cargo-colaborador').value = colaborador.cargo;
                document.getElementById('telefono-colaborador').value = colaborador.telefono;
                document.getElementById('email-colaborador').value = colaborador.email;
                document.getElementById('direccion-colaborador').value = colaborador.direccion;
                fechaInicioInput.value = colaborador.fechaInicio;
                document.getElementById('salario-colaborador').value = colaborador.salario;
                document.getElementById('notas-colaborador').value = colaborador.notas;

                if (submitButton) submitButton.textContent = 'Actualizar Colaborador';
                editColaboradorId = colaboradorId;
                window.scrollTo(0, 0);
            }
        } catch (error) {
            console.error('Error al cargar colaborador para edición:', error);
            alert('Error al cargar colaborador para edición. Verifique la consola.');
        }
    }
});

// Inicialización
renderizarTabla();
})();