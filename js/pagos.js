(function() {
// Script para la gestión de Pagos

const formPago = document.getElementById('form-pago');
const tablaPagosBody = document.querySelector('#tabla-pagos tbody');
const submitButton = formPago.querySelector('button[type="submit"]');

if (formPago && tablaPagosBody) {
    let pagos = JSON.parse(localStorage.getItem('pagos')) || [];
    let editIndex = null;

    // Establecer la fecha actual por defecto
    const fechaPagoInput = document.getElementById('fecha-pago');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months start at 0!
    const dd = String(today.getDate()).padStart(2, '0');
    fechaPagoInput.value = `${yyyy}-${mm}-${dd}`;

    const guardarPagos = () => {
        localStorage.setItem('pagos', JSON.stringify(pagos));
    };

    // Función para obtener y actualizar el número de recibo secuencial
    const getNewReceiptNumber = () => {
        let lastReceiptNumber = parseInt(localStorage.getItem('lastReceiptNumber') || '0', 10);
        lastReceiptNumber++;
        localStorage.setItem('lastReceiptNumber', lastReceiptNumber.toString());
        return lastReceiptNumber;
    };

    const renderizarTabla = () => {
        tablaPagosBody.innerHTML = '';
        pagos.forEach((pago, index) => {
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
                    <button class="btn-editar" data-index="${index}">Editar</button>
                    <button class="btn-eliminar" data-index="${index}">Eliminar</button>
                    <button class="btn-generar-recibo" data-index="${index}">Recibo</button>
                </td>
            `;
            tablaPagosBody.appendChild(fila);
        });
    };

    const resetFormulario = () => {
        formPago.reset();
        submitButton.textContent = 'Registrar Pago';
        editIndex = null;
        fechaPagoInput.value = `${yyyy}-${mm}-${dd}`;
    };

    formPago.addEventListener('submit', (e) => {
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

        if (editIndex === null) {
            pagos.push(pagoData);
        } else {
            pagos[editIndex] = pagoData;
        }
        
        guardarPagos();
        renderizarTabla();
        resetFormulario();
    });

    tablaPagosBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            const index = parseInt(e.target.dataset.index, 10);
            pagos.splice(index, 1);
            guardarPagos();
            renderizarTabla();
            resetFormulario();
        }

        if (e.target.classList.contains('btn-editar')) {
            const index = parseInt(e.target.dataset.index, 10);
            const pago = pagos[index];

            fechaPagoInput.value = pago.fecha;
            document.getElementById('tipo-pago').value = pago.tipo;
            document.getElementById('concepto-pago').value = pago.concepto;
            document.getElementById('monto-pago').value = pago.monto;
            document.getElementById('metodo-pago').value = pago.metodo;
            document.getElementById('entidad-relacionada').value = pago.entidadRelacionada;
            document.getElementById('referencia-pago').value = pago.referencia;

            submitButton.textContent = 'Actualizar Pago';
            editIndex = index;
            window.scrollTo(0, 0);
        }

        if (e.target.classList.contains('btn-generar-recibo')) {
            const index = parseInt(e.target.dataset.index, 10);
            const pago = pagos[index];
            const receiptNumber = getNewReceiptNumber();

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
                            <p>Plataforma GCF</p>
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
            newWindow.print(); // Abre el diálogo de impresión automáticamente
        }
    });

    // Inicialización
    renderizarTabla();
}
})();