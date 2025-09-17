(function() {
// Script para la gestión de Pagos

const formPago = document.getElementById('form-pago');
const tablaPagosBody = document.querySelector('#tabla-pagos tbody');
const submitButton = formPago ? formPago.querySelector('button[type="submit"]') : null;

const API_URL_PAGOS = '/pagos';
const API_URL_SEQUENCE = '/sequence';

if (!formPago || !tablaPagosBody) {
    return;
}

let editPagoId = null;

// Establecer la fecha actual por defecto
const fechaPagoInput = document.getElementById('fecha-pago');
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
fechaPagoInput.value = `${yyyy}-${mm}-${dd}`;

// Función para obtener pagos del backend
const fetchPagos = async () => {
    try {
        const response = await window.fetchWithAuth(API_URL_PAGOS);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error al obtener pagos:', error);
        return [];
    }
};

// Función para obtener y actualizar el número de recibo secuencial desde el backend
const getNewReceiptNumber = async () => {
    try {
        const response = await window.fetchWithAuth(`${API_URL_SEQUENCE}/receiptNumber/increment`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.value;
    } catch (error) {
        console.error('Error al obtener nuevo número de recibo:', error);
        alert('Error al obtener número de recibo. Verifique la consola.');
        return null;
    }
};

const renderizarTabla = async () => {
    tablaPagosBody.innerHTML = '';
    const pagos = await fetchPagos();

    if (pagos.length === 0) {
        tablaPagosBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay pagos registrados.</td></tr>';
        return;
    }

    pagos.forEach((pago) => {
        const fila = document.createElement('tr');
        const escape = (str) => String(str).replace(/[&<>"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[tag] || tag));
        fila.innerHTML = `
            <td>${escape(pago.fecha)}</td>
            <td>${escape(pago.tipo)}</td>
            <td>${escape(pago.concepto)}</td>
            <td>$${escape(pago.monto)}</td>
            <td>${escape(pago.metodo)}</td>
            <td>${escape(pago.entidadRelacionada || '')}</td>
            <td>
                <button class="btn-editar" data-id="${pago.id}">Editar</button>
                <button class="btn-eliminar" data-id="${pago.id}">Eliminar</button>
                <button class="btn-generar-recibo" data-id="${pago.id}">Recibo</button>
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
};

formPago.addEventListener('submit', async (e) => {
    e.preventDefault();

    const pagoData = {
        fecha: fechaPagoInput.value,
        tipo: document.getElementById('tipo-pago').value,
        concepto: document.getElementById('concepto-pago').value,
        monto: parseFloat(document.getElementById('monto-pago').value),
        metodo: document.getElementById('metodo-pago').value,
        entidadRelacionada: document.getElementById('entidad-relacionada').value,
        referencia: document.getElementById('referencia-pago').value,
    };

    try {
        let response;
        if (editPagoId === null) {
            response = await window.fetchWithAuth(API_URL_PAGOS, {
                method: 'POST',
                body: JSON.stringify(pagoData),
            });
        } else {
            response = await window.fetchWithAuth(`${API_URL_PAGOS}/${editPagoId}`, {
                method: 'PUT',
                body: JSON.stringify(pagoData),
            });
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        await renderizarTabla();
        resetFormulario();
    } catch (error) {
        console.error('Error al guardar pago:', error);
        alert('Error al guardar pago. Verifique la consola y asegúrese de que el backend esté funcionando.');
    }
});

tablaPagosBody.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-eliminar')) {
        const pagoId = parseInt(e.target.dataset.id, 10);
        if (confirm('¿Estás seguro de que quieres eliminar este pago?')) {
            try {
                const response = await window.fetchWithAuth(`${API_URL_PAGOS}/${pagoId}`, {
                    method: 'DELETE',
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                await renderizarTabla();
                resetFormulario();
            } catch (error) {
                console.error('Error al eliminar pago:', error);
                alert('Error al eliminar pago. Verifique la consola.');
            }
        }
    }

    if (e.target.classList.contains('btn-editar')) {
        const pagoId = parseInt(e.target.dataset.id, 10);
        try {
            const pagos = await fetchPagos();
            const pago = pagos.find(p => p.id === pagoId);

            if (pago) {
                fechaPagoInput.value = pago.fecha;
                document.getElementById('tipo-pago').value = pago.tipo;
                document.getElementById('concepto-pago').value = pago.concepto;
                document.getElementById('monto-pago').value = pago.monto;
                document.getElementById('metodo-pago').value = pago.metodo;
                document.getElementById('entidad-relacionada').value = pago.entidadRelacionada;
                document.getElementById('referencia-pago').value = pago.referencia;

                if (submitButton) submitButton.textContent = 'Actualizar Pago';
                editPagoId = pagoId;
                window.scrollTo(0, 0);
            }
        } catch (error) {
            console.error('Error al cargar pago para edición:', error);
            alert('Error al cargar pago para edición. Verifique la consola.');
        }
    }

    if (e.target.classList.contains('btn-generar-recibo')) {
        const pagoId = parseInt(e.target.dataset.id, 10);
        try {
            const pagos = await fetchPagos();
            const pago = pagos.find(p => p.id === pagoId);

            if (pago) {
                const receiptNumber = await getNewReceiptNumber();
                if (receiptNumber === null) return; // Error al obtener número de recibo

                const receiptHTML = `
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Recibo #${receiptNumber}</title>
                        <style>
                            body { font-family: 'Roboto', sans-serif; margin: 20px; color: #333; }
                            .receipt-container { width: 80mm; margin: 0 auto; border: 1px solid #ccc; padding: 10mm; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                            .header { text-align: center; margin-bottom: 20px; }
                            .header h1 { margin: 0; font-size: 24px; color: #2c3e50; }
                            .header p { margin: 5px 0; font-size: 12px; }
                            .details { margin-bottom: 20px; font-size: 12px; }
                            .details div { margin-bottom: 5px; }
                            .item-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                            .item-table th, .item-table td { border: 1px solid #eee; padding: 8px; text-align: left; font-size: 12px; }
                            .item-table th { background-color: #f2f2f2; }
                            .total { text-align: right; font-size: 14px; font-weight: bold; }
                            .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #777; }
                        </style>
                    </head>
                    <body>
                        <div class="receipt-container">
                            <div class="header">
                                <h1>Recibo de Pago</h1>
                                <p>Granja Cerdito Feliz</p>
                                <p>Fecha de Emisión: ${new Date().toLocaleDateString()}</p>
                            </div>
                            <div class="details">
                                <div><strong>Recibo No:</strong> ${receiptNumber}</div>
                                <div><strong>Fecha del Pago:</strong> ${escape(pago.fecha)}</div>
                                <div><strong>Tipo de Pago:</strong> ${escape(pago.tipo)}</div>
                                <div><strong>Concepto:</strong> ${escape(pago.concepto)}</div>
                                <div><strong>Monto:</strong> $${escape(pago.monto)}</div>
                                <div><strong>Método:</strong> ${escape(pago.metodo)}</div>
                                <div><strong>Entidad Relacionada:</strong> ${escape(pago.entidadRelacionada || 'N/A')}</div>
                                <div><strong>Referencia:</strong> ${escape(pago.referencia || 'N/A')}</div>
                            </div>
                            <div class="footer">
                                <p>Comprobante de pago.</p>
                                <p>Contacto: [Tu Contacto Aquí]</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `;

                const newWindow = window.open('', '_blank');
                newWindow.document.write(receiptHTML);
                newWindow.document.close();
                newWindow.print();
            }
        } catch (error) {
            console.error('Error al generar recibo:', error);
            alert('Error al generar recibo. Verifique la consola.');
        }
    }
});

// Inicialización
renderizarTabla();
})();