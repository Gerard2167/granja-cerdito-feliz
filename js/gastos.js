(function() {
// Script para la gestión de Gastos

const formGasto = document.getElementById('form-gasto');
const tablaGastosBody = document.querySelector('#tabla-gastos tbody');
const submitButton = formGasto ? formGasto.querySelector('button[type="submit"]') : null;

const API_URL_GASTOS = 'http://192.168.0.13:3000/api/gastos';

if (!formGasto || !tablaGastosBody) {
    return;
}

let editGastoId = null;

// Establecer la fecha actual por defecto
const fechaGastoInput = document.getElementById('fecha-gasto');
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
fechaGastoInput.value = `${yyyy}-${mm}-${dd}`;

// Función para obtener gastos del backend
const fetchGastos = async () => {
    try {
        const response = await fetch(API_URL_GASTOS);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al obtener gastos:', error);
        return [];
    }
};

const renderizarTabla = async () => {
    tablaGastosBody.innerHTML = '';
    const gastos = await fetchGastos();

    if (gastos.length === 0) {
        tablaGastosBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay gastos registrados.</td></tr>';
        return;
    }

    gastos.forEach((gasto) => {
        const fila = document.createElement('tr');
        const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
        fila.innerHTML = `
            <td>${escape(gasto.fecha)}</td>
            <td>${escape(gasto.categoria)}</td>
            <td>${escape(gasto.descripcion || '')}</td>
            <td>$${escape(gasto.monto)}</td>
            <td>${escape(gasto.metodoPago || '')}</td>
            <td>${escape(gasto.numeroFactura || '')}</td>
            <td>
                <button class="btn-editar" data-id="${gasto.id}">Editar</button>
                <button class="btn-eliminar" data-id="${gasto.id}">Eliminar</button>
            </td>
        `;
        tablaGastosBody.appendChild(fila);
    });
};

const resetFormulario = () => {
    formGasto.reset();
    if (submitButton) submitButton.textContent = 'Registrar Gasto';
    editGastoId = null;
    fechaGastoInput.value = `${yyyy}-${mm}-${dd}`;
};

formGasto.addEventListener('submit', async (e) => {
    e.preventDefault();

    const gastoData = {
        fecha: fechaGastoInput.value,
        categoria: document.getElementById('categoria-gasto').value,
        descripcion: document.getElementById('descripcion-gasto').value,
        monto: parseFloat(document.getElementById('monto-gasto').value),
        metodoPago: document.getElementById('metodo-pago').value,
        numeroFactura: document.getElementById('numero-factura').value,
    };

    try {
        let response;
        if (editGastoId === null) {
            response = await fetch(API_URL_GASTOS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gastoData),
            });
        } else {
            response = await fetch(`${API_URL_GASTOS}/${editGastoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gastoData),
            });
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        await renderizarTabla();
        resetFormulario();
    } catch (error) {
        console.error('Error al guardar gasto:', error);
        alert('Error al guardar gasto. Verifique la consola y asegúrese de que el backend esté funcionando.');
    }
});

tablaGastosBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-eliminar')) {
        const gastoId = parseInt(e.target.dataset.id, 10);
        if (confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
            try {
                const response = await fetch(`${API_URL_GASTOS}/${gastoId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                await renderizarTabla();
                resetFormulario();
            } catch (error) {
                console.error('Error al eliminar gasto:', error);
                alert('Error al eliminar gasto. Verifique la consola.');
            }
        }
    }

    if (e.target.classList.contains('btn-editar')) {
        const gastoId = parseInt(e.target.dataset.id, 10);
        try {
            const gastos = await fetchGastos();
            const gasto = gastos.find(g => g.id === gastoId);

            if (gasto) {
                fechaGastoInput.value = gasto.fecha;
                document.getElementById('categoria-gasto').value = gasto.categoria;
                document.getElementById('descripcion-gasto').value = gasto.descripcion;
                document.getElementById('monto-gasto').value = gasto.monto;
                document.getElementById('metodo-pago').value = gasto.metodoPago;
                document.getElementById('numero-factura').value = gasto.numeroFactura;

                if (submitButton) submitButton.textContent = 'Actualizar Gasto';
                editGastoId = gastoId;
                window.scrollTo(0, 0);
            }
        } catch (error) {
            console.error('Error al cargar gasto para edición:', error);
            alert('Error al cargar gasto para edición. Verifique la consola.');
        }
    }
});

// Inicialización
renderizarTabla();
})();