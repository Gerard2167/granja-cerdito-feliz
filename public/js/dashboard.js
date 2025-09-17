(function() {
// Script para el módulo de Dashboard

const dashboardVentasMesEl = document.getElementById('dashboard-ventas-mes');
const dashboardGastosMesEl = document.getElementById('dashboard-gastos-mes');
const dashboardBalanceMesEl = document.getElementById('dashboard-balance-mes');
const dashboardTotalClientesEl = document.getElementById('dashboard-total-clientes');
const dashboardTotalProductosEl = document.getElementById('dashboard-total-productos');
const dashboardTareasPendientesEl = document.getElementById('dashboard-tareas-pendientes');

const dashboardVentasRecientesEl = document.getElementById('dashboard-ventas-recientes');
const dashboardGastosRecientesEl = document.getElementById('dashboard-gastos-recientes');
const dashboardEventosProximosEl = document.getElementById('dashboard-eventos-proximos');

const balanceCard = document.getElementById('balance-card');

const API_URL_VENTAS = '/ventas';
const API_URL_GASTOS = '/gastos';
const API_URL_CLIENTES = '/clientes';
const API_URL_INVENTARIO = '/inventario';
const API_URL_CALENDARIOS = '/calendarios';


if (dashboardVentasMesEl) { // Check if at least one element exists

    const userRole = localStorage.getItem('userRole');

    const apiPermissions = {
        [API_URL_VENTAS]: ['Administrador General', 'Contador / Finanzas', 'Vendedor'],
        [API_URL_GASTOS]: ['Administrador General', 'Contador / Finanzas'],
        [API_URL_CLIENTES]: ['Administrador General', 'Vendedor'],
        [API_URL_INVENTARIO]: ['Administrador General', 'Vendedor', 'Encargado de Inventario', 'Supervisor de Producción'],
        [API_URL_CALENDARIOS]: ['Administrador General', 'Colaborador / Empleado', 'Supervisor de Producción']
    };

    const formatCurrency = (amount) => `${amount.toFixed(2)}`;

    const fetchData = async (url) => {
        if (apiPermissions[url] && !apiPermissions[url].includes(userRole)) {
            return []; // Si el rol no tiene permiso, devuelve un array vacío
        }
        try {
            const response = await window.fetchWithAuth(url);
            if (!response.ok) {
                // Si la respuesta es 403 (prohibido), no lo tomamos como un error fatal de logout
                if (response.status === 403) {
                    console.warn(`Acceso denegado para ${url}. El rol '${userRole}' no tiene permisos.`);
                    return []; // Devuelve un array vacío para que el dashboard no se rompa
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching data from ${url}:`, error);
            return [];
        }
    };

    const loadDashboardData = async () => {
        const [ventas, gastos, clientes, inventario, calendarioEventos] = await Promise.all([
            fetchData(API_URL_VENTAS),
            fetchData(API_URL_GASTOS),
            fetchData(API_URL_CLIENTES),
            fetchData(API_URL_INVENTARIO),
            fetchData(API_URL_CALENDARIOS)
        ]);

        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // --- Role-based card visibility ---
        if (userRole !== 'Administrador General' && userRole !== 'Contador / Finanzas') {
            if(balanceCard) balanceCard.style.display = 'none';
        }

        // --- Métricas del Mes --- //
        let ventasMes = 0;
        if (ventas.length > 0) {
            ventas.forEach(venta => {
                const ventaDate = new Date(venta.fecha);
                if (ventaDate.getMonth() === currentMonth && ventaDate.getFullYear() === currentYear) {
                    ventasMes += venta.total;
                }
            });
        }
        dashboardVentasMesEl.textContent = formatCurrency(ventasMes);

        let gastosMes = 0;
        if (gastos.length > 0) {
            gastos.forEach(gasto => {
                const gastoDate = new Date(gasto.fecha);
                if (gastoDate.getMonth() === currentMonth && gastoDate.getFullYear() === currentYear) {
                    gastosMes += gasto.monto;
                }
            });
        }
        dashboardGastosMesEl.textContent = formatCurrency(gastosMes);

        const balanceMes = ventasMes - gastosMes;
        dashboardBalanceMesEl.textContent = formatCurrency(balanceMes);
        if (balanceMes < 0) {
            dashboardBalanceMesEl.parentElement.classList.add('negative');
        } else {
            dashboardBalanceMesEl.parentElement.classList.remove('negative');
        }

        // --- Totales Generales --- //
        dashboardTotalClientesEl.textContent = clientes.length;
        dashboardTotalProductosEl.textContent = inventario.length;

        let tareasPendientes = 0;
        if (calendarioEventos.length > 0) {
            calendarioEventos.forEach(evento => {
                if (evento.estado === 'Pendiente') {
                    tareasPendientes++;
                }
            });
        }
        dashboardTareasPendientesEl.textContent = tareasPendientes;

        // --- Actividades Recientes --- //
        // Ventas Recientes
        dashboardVentasRecientesEl.innerHTML = '';
        const recentSales = ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5);
        if (recentSales.length === 0) {
            dashboardVentasRecientesEl.innerHTML = '<p style="text-align: center; color: #777;">No hay ventas recientes.</p>';
        } else {
            recentSales.forEach(venta => {
                const item = document.createElement('div');
                item.classList.add('transaction-item');
                item.innerHTML = `
                    <span class="date">${venta.fecha}</span>
                    <span class="description">${venta.producto} a ${venta.cliente}</span>
                    <span class="amount income">${formatCurrency(venta.total)}</span>
                `;
                dashboardVentasRecientesEl.appendChild(item);
            });
        }

        // Gastos Recientes
        dashboardGastosRecientesEl.innerHTML = '';
        const recentExpenses = gastos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5);
        if (recentExpenses.length === 0) {
            dashboardGastosRecientesEl.innerHTML = '<p style="text-align: center; color: #777;">No hay gastos recientes.</p>';
        } else {
            recentExpenses.forEach(gasto => {
                const item = document.createElement('div');
                item.classList.add('transaction-item');
                item.innerHTML = `
                    <span class="date">${gasto.fecha}</span>
                    <span class="description">${gasto.categoria}: ${gasto.descripcion}</span>
                    <span class="amount expense">${formatCurrency(gasto.monto)}</span>
                `;
                dashboardGastosRecientesEl.appendChild(item);
            });
        }

        // Próximos Eventos del Calendario
        dashboardEventosProximosEl.innerHTML = '';
        const upcomingEvents = calendarioEventos.filter(evento => {
            const eventDate = new Date(evento.fecha);
            return eventDate >= today && evento.estado === 'Pendiente';
        }).sort((a, b) => new Date(a.fecha) - new Date(a.fecha)).slice(0, 5);

        if (upcomingEvents.length === 0) {
            dashboardEventosProximosEl.innerHTML = '<p style="text-align: center; color: #777;">No hay eventos próximos.</p>';
        } else {
            upcomingEvents.forEach(evento => {
                const item = document.createElement('div');
                item.classList.add('transaction-item');
                item.innerHTML = `
                    <span class="date">${evento.fecha}</span>
                    <span class="description">${evento.tipo}: ${evento.descripcion}</span>
                    <span class="amount">${evento.responsable || ''}</span>
                `;
                dashboardEventosProximosEl.appendChild(item);
            });
        }
    };

    // Inicialización
    loadDashboardData();
}
})();