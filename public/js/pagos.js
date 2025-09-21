(function() {
// Script para la gestión de Pagos

const formPago = document.getElementById('form-pago');
const tablaPagosBody = document.querySelector('#tabla-pagos tbody');
const submitButton = formPago ? formPago.querySelector('button[type="submit"]') : null;
const tipoPagoSelect = document.getElementById('tipo-pago');
const asociarDocumentoContainer = document.getElementById('asociar-documento-container');
const documentoAsociadoSelect = document.getElementById('documento-asociado');

const API_URL_PAGOS = '/pagos';
const API_URL_VENTAS_PENDIENTES = '/ventas-pendientes';
const API_URL_GASTOS_PENDIENTES = '/gastos-pendientes';

if (!formPago || !tablaPagosBody) {
    return;
}

let editPagoId = null;
let documentosPendientes = []; // Almacenar los documentos cargados

// Establecer la fecha actual por defecto
const fechaPagoInput = document.getElementById('fecha-pago');
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
fechaPagoInput.value = `${yyyy}-${mm}-${dd}`;

const fetchPagos = async () => {
    try {
        const response = await window.fetchWithAuth(API_URL_PAGOS);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error al obtener pagos:', error);
        return [];
    }
};

const renderizarTabla = async () => {
    tablaPagosBody.innerHTML = '';
    const pagos = await fetchPagos();

    if (pagos.length === 0) {
        tablaPagosBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay pagos registrados.</td></tr>';
        return;
    }

    pagos.forEach((pago) => {
        const fila = document.createElement('tr');
        const escape = (str) => String(str || '').replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
        fila.innerHTML = `
            <td>${escape(pago.fecha)}</td>
            <td>${escape(pago.tipo)}</td>
            <td>${escape(pago.concepto)}</td>
            <td>$${escape(pago.monto)}</td>
            <td>${escape(pago.metodo)}</td>
            <td>${escape(pago.entidadRelacionada)}</td>
            <td>${escape(pago.referencia)}</td>
            <td>
                <button class="btn-eliminar" data-id="${pago.id}">Eliminar</button>
            </td>
        `;
        tablaPagosBody.appendChild(fila);
    });
};

const resetFormulario = () => {
    formPago.reset();
    if (submitButton) submitButton.textContent = 'Registrar Pago';
    editPagoId = null;
    fechaPagoInput.value = `${yyyy}-${mm}-${dd}`;
    asociarDocumentoContainer.style.display = 'none';
    documentoAsociadoSelect.innerHTML = '<option value="">Seleccione un documento...</option>';
    document.getElementById('concepto-pago').readOnly = false;
    document.getElementById('monto-pago').readOnly = false;
    document.getElementById('entidad-relacionada').readOnly = false;
};

const cargarDocumentosPendientes = async (tipo) => {
    let url = '';
    if (tipo === 'Ingreso') url = API_URL_VENTAS_PENDIENTES;
    else if (tipo === 'Egreso') url = API_URL_GASTOS_PENDIENTES;
    else return;

    try {
        const response = await window.fetchWithAuth(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        documentosPendientes = await response.json();
        
        documentoAsociadoSelect.innerHTML = '<option value="">Seleccione un documento...</option>';
        documentosPendientes.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            const textoOpcion = tipo === 'Ingreso'
                ? `Venta #${doc.id} - ${doc.producto} ($${doc.total})`
                : `Gasto #${doc.id} - ${doc.proveedor || 'N/A'} - ${doc.descripcion} ($${doc.monto})`;
            option.textContent = textoOpcion;
            documentoAsociadoSelect.appendChild(option);
        });

        asociarDocumentoContainer.style.display = 'block';

    } catch (error) {
        console.error(`Error al obtener documentos pendientes (${tipo}):`, error);
    }
};

tipoPagoSelect.addEventListener('change', (e) => {
    const tipo = e.target.value;
    resetFormulario(); // Limpia el form al cambiar de tipo
    document.getElementById('tipo-pago').value = tipo; // Restaura el valor del tipo

    if (tipo === 'Ingreso' || tipo === 'Egreso') {
        cargarDocumentosPendientes(tipo);
    } else {
        asociarDocumentoContainer.style.display = 'none';
    }
});

documentoAsociadoSelect.addEventListener('change', (e) => {
    const docId = parseInt(e.target.value, 10);
    const tipo = tipoPagoSelect.value;
    const docSeleccionado = documentosPendientes.find(d => d.id === docId);

    if (docSeleccionado) {
        const concepto = tipo === 'Ingreso' 
            ? `Pago de venta #${docId} (${docSeleccionado.producto})` 
            : `Pago a ${docSeleccionado.proveedor || 'proveedor'}: ${docSeleccionado.descripcion}`;
        const monto = tipo === 'Ingreso' ? docSeleccionado.total : docSeleccionado.monto;
        const entidad = tipo === 'Ingreso' ? docSeleccionado.cliente : docSeleccionado.proveedor;

        document.getElementById('concepto-pago').value = concepto;
        document.getElementById('monto-pago').value = monto;
        document.getElementById('entidad-relacionada').value = entidad || '';

        // Hacerlos de solo lectura para evitar inconsistencias
        document.getElementById('concepto-pago').readOnly = true;
        document.getElementById('monto-pago').readOnly = true;
        document.getElementById('entidad-relacionada').readOnly = true;
    } else {
        // Si se deselecciona, limpiar y habilitar campos
        document.getElementById('concepto-pago').value = '';
        document.getElementById('monto-pago').value = '';
        document.getElementById('entidad-relacionada').value = '';
        document.getElementById('concepto-pago').readOnly = false;
        document.getElementById('monto-pago').readOnly = false;
        document.getElementById('entidad-relacionada').readOnly = false;
    }
});

formPago.addEventListener('submit', async (e) => {
    e.preventDefault();

    const docId = parseInt(documentoAsociadoSelect.value, 10);
    const tipo = tipoPagoSelect.value;

    const pagoData = {
        fecha: fechaPagoInput.value,
        tipo: tipo,
        concepto: document.getElementById('concepto-pago').value,
        monto: parseFloat(document.getElementById('monto-pago').value),
        metodo: document.getElementById('metodo-pago').value,
        entidadRelacionada: document.getElementById('entidad-relacionada').value,
    };

    if (docId) {
        if (tipo === 'Ingreso') pagoData.venta_id = docId;
        else if (tipo === 'Egreso') pagoData.gasto_id = docId;
    }

    try {
        // No se permite editar pagos asociados a documentos para mantener la integridad.
        if (editPagoId !== null) {
            alert('No se pueden editar los pagos. Por favor, elimine y cree uno nuevo si es necesario.');
            return;
        }

        const response = await window.fetchWithAuth(API_URL_PAGOS, {
            method: 'POST',
            body: JSON.stringify(pagoData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        await renderizarTabla();
        resetFormulario();
        // Recargar la lista de pendientes por si acaso
        if (tipo === 'Ingreso' || tipo === 'Egreso') {
            cargarDocumentosPendientes(tipo);
        }

    } catch (error) {
        console.error('Error al guardar pago:', error);
        alert(`Error al guardar pago: ${error.message}`);
    }
});

tablaPagosBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-eliminar')) {
        const pagoId = parseInt(e.target.dataset.id, 10);
        if (confirm('¿Estás seguro de que quieres eliminar este pago? No se puede deshacer y NO revierte el estado de la venta/gasto asociado.')) {
            try {
                const response = await window.fetchWithAuth(`${API_URL_PAGOS}/${pagoId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }
                await renderizarTabla();
                resetFormulario();
            } catch (error) {
                console.error('Error al eliminar pago:', error);
                alert(`Error al eliminar pago: ${error.message}`);
            }
        }
    }

    // Se ha deshabilitado la edición para mantener la integridad de los datos con las referencias generadas.
    if (e.target.classList.contains('btn-editar')) {
        alert('La edición de pagos está deshabilitada. Por favor, elimine y cree uno nuevo si es necesario.');
    }
});

// Inicialización
renderizarTabla();
})();