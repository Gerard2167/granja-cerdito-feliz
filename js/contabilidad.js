(function() {
// Script para el módulo de Contabilidad

const totalVentasEl = document.getElementById('total-ventas');
const totalGastosEl = document.getElementById('total-gastos');
const totalIngresosEl = document.getElementById('total-ingresos');
const totalEgresosEl = document.getElementById('total-egresos');
const balanceNetoEl = document.getElementById('balance-neto');
const recentTransactionsEl = document.querySelector('.recent-transactions');

const API_URL_VENTAS = 'http://localhost:3000/api/ventas';
const API_URL_GASTOS = 'http://localhost:3000/api/gastos';
const API_URL_PAGOS = 'http://localhost:3000/api/pagos';

if (totalVentasEl && totalGastosEl && totalIngresosEl && totalEgresosEl && balanceNetoEl) {

    const formatCurrency = (amount) => `${amount.toFixed(2)}`;

    const fetchData = async (url) => {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching data from ${url}:`, error);
            return [];
        }
    };

    const cargarResumenContable = async () => {
        const [ventas, gastos, pagos] = await Promise.all([
            fetchData(API_URL_VENTAS),
            fetchData(API_URL_GASTOS),
            fetchData(API_URL_PAGOS)
        ]);

        let totalVentas = 0;
        ventas.forEach(venta => {
            totalVentas += venta.total;
        });

        let totalGastos = 0;
        gastos.forEach(gasto => {
            totalGastos += gasto.monto;
        });

        let totalIngresos = 0;
        let totalEgresos = 0;
        pagos.forEach(pago => {
            if (pago.tipo === 'Ingreso') {
                totalIngresos += pago.monto;
            } else if (pago.tipo === 'Egreso') {
                totalEgresos += pago.monto;
            }
        });

        const balanceNeto = totalIngresos - totalEgresos; // O totalVentas - totalGastos, dependiendo de la definición

        totalVentasEl.textContent = formatCurrency(totalVentas);
        totalGastosEl.textContent = formatCurrency(totalGastos);
        totalIngresosEl.textContent = formatCurrency(totalIngresos);
        totalEgresosEl.textContent = formatCurrency(totalEgresos);
        balanceNetoEl.textContent = formatCurrency(balanceNeto);

        if (balanceNeto < 0) {
            balanceNetoEl.parentElement.classList.add('negative');
        } else {
            balanceNetoEl.parentElement.classList.remove('negative');
        }

        // Cargar transacciones recientes (combinando ventas, gastos y pagos)
        const allTransactions = [];

        ventas.forEach(venta => {
            allTransactions.push({
                fecha: venta.fecha,
                descripcion: `Venta: ${venta.producto} a ${venta.cliente}`,
                monto: venta.total,
                tipo: 'income'
            });
        });

        gastos.forEach(gasto => {
            allTransactions.push({
                fecha: gasto.fecha,
                descripcion: `Gasto: ${gasto.categoria} - ${gasto.descripcion}`,
                monto: gasto.monto,
                tipo: 'expense'
            });
        });

        pagos.forEach(pago => {
            if (pago.tipo === 'Ingreso') {
                allTransactions.push({
                    fecha: pago.fecha,
                    descripcion: `Pago Recibido: ${pago.concepto} de ${pago.entidadRelacionada}`,
                    monto: pago.monto,
                    tipo: 'income'
                });
            } else if (pago.tipo === 'Egreso') {
                allTransactions.push({
                    fecha: pago.fecha,
                    descripcion: `Pago Realizado: ${pago.concepto} a ${pago.entidadRelacionada}`,
                    monto: pago.monto,
                    tipo: 'expense'
                });
            }
        });

        // Ordenar por fecha (más reciente primero)
        allTransactions.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        // Mostrar solo las últimas 10 transacciones
        recentTransactionsEl.innerHTML = '';
        const transactionsToShow = allTransactions.slice(0, 10);

        transactionsToShow.forEach(trans => {
            const transItem = document.createElement('div');
            transItem.classList.add('transaction-item');
            transItem.innerHTML = `
                <span class="date">${trans.fecha}</span>
                <span class="description">${trans.descripcion}</span>
                <span class="amount ${trans.tipo}">${trans.tipo === 'income' ? '+' : '-'}${formatCurrency(trans.monto)}</span>
            `;
            recentTransactionsEl.appendChild(transItem);
        });

        if (transactionsToShow.length === 0) {
            recentTransactionsEl.innerHTML = '<p style="text-align: center; color: #777;">No hay transacciones recientes para mostrar.</p>';
        }
    };

    // Inicialización
    cargarResumenContable();
}
})();