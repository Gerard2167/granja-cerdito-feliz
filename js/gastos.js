(function() {
// Script para la gestión de Gastos

const formGasto = document.getElementById('form-gasto');
const tablaGastosBody = document.querySelector('#tabla-gastos tbody');
const submitButton = formGasto.querySelector('button[type="submit"]');

if (formGasto && tablaGastosBody) {
    let gastos = JSON.parse(localStorage.getItem('gastos')) || [];
    let editIndex = null;

    // Establecer la fecha actual por defecto
    const fechaGastoInput = document.getElementById('fecha-gasto');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months start at 0!
    const dd = String(today.getDate()).padStart(2, '0');
    fechaGastoInput.value = `${yyyy}-${mm}-${dd}`;

    const guardarGastos = () => {
        localStorage.setItem('gastos', JSON.stringify(gastos));
    };

    const renderizarTabla = () => {
        tablaGastosBody.innerHTML = '';
        gastos.forEach((gasto, index) => {
            const fila = document.createElement('tr');
            const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
            fila.innerHTML = `
                <td>${escape(gasto.fecha)}</td>
                <td>${escape(gasto.categoria)}</td>
                <td>${escape(gasto.descripcion)}</td>
                <td>$${escape(gasto.monto)}</td>
                <td>${escape(gasto.metodoPago)}</td>
                <td>${escape(gasto.numeroFactura || '')}</td>
                <td>
                    <button class="btn-editar" data-index="${index}">Editar</button>
                    <button class="btn-eliminar" data-index="${index}">Eliminar</button>
                </td>
            `;
            tablaGastosBody.appendChild(fila);
        });
    };

    const resetFormulario = () => {
        formGasto.reset();
        submitButton.textContent = 'Registrar Gasto';
        editIndex = null;
        fechaGastoInput.value = `${yyyy}-${mm}-${dd}`;
    };

    formGasto.addEventListener('submit', (e) => {
        e.preventDefault();

        const gastoData = {
            fecha: fechaGastoInput.value,
            categoria: document.getElementById('categoria-gasto').value,
            descripcion: document.getElementById('descripcion-gasto').value,
            monto: parseFloat(document.getElementById('monto-gasto').value),
            metodoPago: document.getElementById('metodo-pago').value,
            numeroFactura: document.getElementById('numero-factura').value,
        };

        if (editIndex === null) {
            gastos.push(gastoData);
        } else {
            gastos[editIndex] = gastoData;
        }
        
        guardarGastos();
        renderizarTabla();
        resetFormulario();
    });

    tablaGastosBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            const index = parseInt(e.target.dataset.index, 10);
            gastos.splice(index, 1);
            guardarGastos();
            renderizarTabla();
            resetFormulario();
        }

        if (e.target.classList.contains('btn-editar')) {
            const index = parseInt(e.target.dataset.index, 10);
            const gasto = gastos[index];

            fechaGastoInput.value = gasto.fecha;
            document.getElementById('categoria-gasto').value = gasto.categoria;
            document.getElementById('descripcion-gasto').value = gasto.descripcion;
            document.getElementById('monto-gasto').value = gasto.monto;
            document.getElementById('metodo-pago').value = gasto.metodoPago;
            document.getElementById('numero-factura').value = gasto.numeroFactura;

            submitButton.textContent = 'Actualizar Gasto';
            editIndex = index;
            window.scrollTo(0, 0);
        }
    });

    // Inicialización
    renderizarTabla();
}
})();