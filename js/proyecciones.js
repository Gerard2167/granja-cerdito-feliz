(function() {
// Script para el módulo de Proyecciones

const generarProyeccionBtn = document.getElementById('generar-proyeccion');
const periodosProyeccionInput = document.getElementById('periodos-proyeccion');
const historialVentasDiv = document.getElementById('historial-ventas');
const proyeccionesFuturasDiv = document.getElementById('proyecciones-futuras');

if (generarProyeccionBtn && historialVentasDiv && proyeccionesFuturasDiv) {

    const formatCurrency = (amount) => `$${amount.toFixed(2)}`;

    const calcularProyecciones = () => {
        const ventas = JSON.parse(localStorage.getItem('ventas')) || [];

        // 1. Agrupar ventas por mes
        const ventasPorMes = {};
        ventas.forEach(venta => {
            const fecha = new Date(venta.fecha);
            const mes = fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0');
            if (!ventasPorMes[mes]) {
                ventasPorMes[mes] = 0;
            }
            ventasPorMes[mes] += venta.total;
        });

        // Ordenar meses y mostrar historial
        const mesesOrdenados = Object.keys(ventasPorMes).sort();
        historialVentasDiv.innerHTML = '';
        if (mesesOrdenados.length === 0) {
            historialVentasDiv.innerHTML = '<p style="text-align: center; color: #777;">No hay datos de ventas históricos para mostrar.</p>';
        } else {
            mesesOrdenados.forEach(mes => {
                const item = document.createElement('div');
                item.classList.add('transaction-item');
                item.innerHTML = `
                    <span class="date">${mes}</span>
                    <span class="description">Ventas Totales:</span>
                    <span class="amount income">${formatCurrency(ventasPorMes[mes])}</span>
                `;
                historialVentasDiv.appendChild(item);
            });
        }

        // 2. Calcular promedio mensual de ventas
        let totalVentasHistoricas = 0;
        mesesOrdenados.forEach(mes => {
            totalVentasHistoricas += ventasPorMes[mes];
        });
        const promedioMensual = mesesOrdenados.length > 0 ? totalVentasHistoricas / mesesOrdenados.length : 0;

        // 3. Generar proyecciones futuras
        const numPeriodos = parseInt(periodosProyeccionInput.value, 10);
        proyeccionesFuturasDiv.innerHTML = '';

        if (promedioMensual === 0) {
            proyeccionesFuturasDiv.innerHTML = '<p style="text-align: center; color: #777;">No hay suficientes datos históricos para generar proyecciones.</p>';
            return;
        }

        const proyecciones = [];
        let currentMonth = new Date();
        if (mesesOrdenados.length > 0) {
            const lastMonth = new Date(mesesOrdenados[mesesOrdenados.length - 1] + '-01');
            currentMonth = new Date(lastMonth.setMonth(lastMonth.getMonth() + 1)); // Empezar desde el mes siguiente al último histórico
        }

        for (let i = 0; i < numPeriodos; i++) {
            const projectedMonth = currentMonth.getFullYear() + '-' + String(currentMonth.getMonth() + 1).padStart(2, '0');
            proyecciones.push({
                mes: projectedMonth,
                monto: promedioMensual
            });
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

        proyecciones.forEach(proj => {
            const item = document.createElement('div');
            item.classList.add('transaction-item');
            item.innerHTML = `
                <span class="date">${proj.mes} (Proyección)</span>
                <span class="description">Ventas Estimadas:</span>
                <span class="amount income">${formatCurrency(proj.monto)}</span>
            `;
            proyeccionesFuturasDiv.appendChild(item);
        });
    };

    generarProyeccionBtn.addEventListener('click', calcularProyecciones);

    // Inicialización: calcular proyecciones al cargar la página
    calcularProyecciones();
}
})();