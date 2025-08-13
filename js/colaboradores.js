(function() {
console.log('js/colaboradores.js: Script iniciado.');

const formColaborador = document.getElementById('form-colaborador');
const tablaColaboradoresBody = document.querySelector('#tabla-colaboradores tbody');
const submitButton = formColaborador ? formColaborador.querySelector('button[type="submit"]') : null; // Asegurarse de que formColaborador exista

if (formColaborador && tablaColaboradoresBody) {
    console.log('js/colaboradores.js: Elementos del DOM encontrados.');

    let colaboradores = JSON.parse(localStorage.getItem('colaboradores')) || [];
    let editIndex = null;

    // Establecer la fecha actual por defecto para Fecha de Inicio
    const fechaInicioInput = document.getElementById('fecha-inicio');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    fechaInicioInput.value = `${yyyy}-${mm}-${dd}`;

    const guardarColaboradores = () => {
        localStorage.setItem('colaboradores', JSON.stringify(colaboradores));
    };

    const renderizarTabla = () => {
        tablaColaboradoresBody.innerHTML = '';
        colaboradores.forEach((colaborador, index) => {
            const fila = document.createElement('tr');
            const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
            fila.innerHTML = `
                <td>${escape(colaborador.nombre)}</td>
                <td>${escape(colaborador.cargo)}</td>
                <td>${escape(colaborador.telefono)}</td>
                <td>${escape(colaborador.email)}</td>
                <td>${escape(colaborador.fechaInicio)}</td>
                <td>
                    <button class="btn-editar" data-index="${index}">Editar</button>
                    <button class="btn-eliminar" data-index="${index}">Eliminar</button>
                </td>
            `;
            tablaColaboradoresBody.appendChild(fila);
        });
    };

    const resetFormulario = () => {
        formColaborador.reset();
        if (submitButton) submitButton.textContent = 'Agregar Colaborador';
        editIndex = null;
        fechaInicioInput.value = `${yyyy}-${mm}-${dd}`;
    };

    formColaborador.addEventListener('submit', (e) => {
        console.log('js/colaboradores.js: Evento submit detectado.');
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

        if (editIndex === null) {
            colaboradores.push(colaboradorData);
        } else {
            colaboradores[editIndex] = colaboradorData;
        }
        
        guardarColaboradores();
        renderizarTabla();
        resetFormulario();
    });

    tablaColaboradoresBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            const index = parseInt(e.target.dataset.index, 10);
            colaboradores.splice(index, 1);
            guardarColaboradores();
            renderizarTabla();
            resetFormulario();
        }

        if (e.target.classList.contains('btn-editar')) {
            const index = parseInt(e.target.dataset.index, 10);
            const colaborador = colaboradores[index];

            document.getElementById('nombre-colaborador').value = colaborador.nombre;
            document.getElementById('cargo-colaborador').value = colaborador.cargo;
            document.getElementById('telefono-colaborador').value = colaborador.telefono;
            document.getElementById('email-colaborador').value = colaborador.email;
            document.getElementById('direccion-colaborador').value = colaborador.direccion;
            fechaInicioInput.value = colaborador.fechaInicio;
            document.getElementById('salario-colaborador').value = colaborador.salario;
            document.getElementById('notas-colaborador').value = colaborador.notas;

            if (submitButton) submitButton.textContent = 'Actualizar Colaborador';
            editIndex = index;
            window.scrollTo(0, 0);
        }
    });

    // Inicialización
    renderizarTabla();
}
})();