document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('.nav-link');
    const defaultPage = 'pages/dashboard.html';
    const logoutBtn = document.getElementById('logout-btn');
    const userDisplayName = document.getElementById('user-display-name');

    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sidebar = document.getElementById('sidebar');
    const appContainer = document.querySelector('.app-container');

    // Display user name
    const userName = localStorage.getItem('userName');
    if (userDisplayName && userName) {
        userDisplayName.textContent = `Hola, ${userName}`;
    }

    // --- ROLE-BASED NAVIGATION ---
    const userRole = localStorage.getItem('userRole');
    const navPermissions = {
        'Administrador General': ['dashboard', 'contabilidad', 'inventario', 'ventas', 'gastos', 'clientes', 'colaboradores', 'pagos', 'proveedores', 'calendarios', 'proyecciones', 'usuarios', 'nosotros', 'perfil'],
        'Contador / Finanzas': ['dashboard', 'contabilidad', 'gastos', 'pagos', 'proyecciones', 'perfil'],
        'Vendedor': ['dashboard', 'ventas', 'clientes', 'inventario', 'perfil'],
        'Encargado de Inventario': ['dashboard', 'inventario', 'proveedores', 'perfil'],
        'Colaborador / Empleado': ['dashboard', 'calendarios', 'nosotros', 'perfil'],
        'Supervisor de Producción': ['dashboard', 'inventario', 'proveedores', 'colaboradores', 'calendarios', 'perfil']
    };

    const authorizedNavs = navPermissions[userRole] || [];
    document.querySelectorAll('.nav-list li a').forEach(link => {
        const page = link.getAttribute('href').split('/').pop().split('.')[0];
        console.log(`Checking link: ${link.getAttribute('href')}, Page: ${page}, Is Authorized: ${authorizedNavs.includes(page)}`);
        if (page && authorizedNavs.includes(page)) {
            link.parentElement.style.display = 'block';
        } else if (link.id !== 'logout-btn') {
            link.parentElement.style.display = 'none';
        }
    });


    // --- AUTHENTICATION & API CALLS ---
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        window.location.href = 'login.html';
    };

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    window.fetchWithAuth = async (url, options = {}) => {
        const token = localStorage.getItem('token');
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) {
            logout();
        }

        return response;
    };


    // --- UI & NAVIGATION ---
    if (hamburgerMenu && appContainer) {
        hamburgerMenu.addEventListener('click', () => {
            appContainer.classList.toggle('sidebar-open');
            hamburgerMenu.classList.toggle('open');
        });
    }

    const removeModuleScript = () => {
        const oldScript = document.getElementById('module-script');
        if (oldScript) {
            oldScript.remove();
        }
    };

    const loadModuleScript = (url) => {
        const moduleName = url.substring(url.lastIndexOf('/') + 1, url.lastIndexOf('.'));
        const modulesWithScripts = ['clientes', 'ventas', 'inventario', 'gastos', 'proveedores', 'pagos', 'contabilidad', 'calendarios', 'colaboradores', 'proyecciones', 'dashboard', 'usuarios', 'perfil'];

        if (modulesWithScripts.includes(moduleName)) {
            const scriptSrc = `js/${moduleName}.js`;
            const newScript = document.createElement('script');
            newScript.id = 'module-script';
            newScript.src = scriptSrc;
            newScript.defer = true;
            document.body.appendChild(newScript);
        }
    };

    const loadContent = async (url) => {
        try {
            // For HTML content, we don't need to send the auth header
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            mainContent.innerHTML = html;
            removeModuleScript();
            loadModuleScript(url);

            if (appContainer.classList.contains('sidebar-open')) {
                appContainer.classList.remove('sidebar-open');
                hamburgerMenu.classList.remove('open');
            }
        } catch (error) {
            console.error('Error loading page:', error);
            mainContent.innerHTML = '<h1>Error al cargar la página.</h1><p>Por favor, revise la consola para más detalles.</p>';
        }
    };

    const handleNavClick = (event) => {
        event.preventDefault();
        const url = event.currentTarget.getAttribute('href');
        if(url === '#') return;
        navLinks.forEach(link => link.classList.remove('active'));
        event.currentTarget.classList.add('active');
        loadContent(url);
    };

    navLinks.forEach(link => {
        link.addEventListener('click', handleNavClick);
    });

    const dashboardLink = document.querySelector(`a[href="${defaultPage}"]`);
    if (dashboardLink) {
        dashboardLink.classList.add('active');
    }
    loadContent(defaultPage);
});