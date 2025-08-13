document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('.nav-link');
    const defaultPage = 'pages/dashboard.html';

    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sidebar = document.getElementById('sidebar');
    const appContainer = document.querySelector('.app-container');

    // Toggle sidebar on hamburger click
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
        const modulesWithScripts = ['clientes', 'ventas', 'inventario', 'gastos', 'proveedores', 'pagos', 'contabilidad', 'calendarios', 'colaboradores', 'proyecciones', 'dashboard']; // Add other modules with JS here in the future

        if (modulesWithScripts.includes(moduleName)) {
            const scriptSrc = `js/${moduleName}.js`;
            const newScript = document.createElement('script');
            newScript.id = 'module-script';
            newScript.src = scriptSrc;
            newScript.defer = true;
            document.body.appendChild(newScript);
        }
    };

    const loadContent = (url) => {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                mainContent.innerHTML = html;
                removeModuleScript();
                loadModuleScript(url);

                // Close sidebar after loading content on mobile
                if (appContainer.classList.contains('sidebar-open')) {
                    appContainer.classList.remove('sidebar-open');
                    hamburgerMenu.classList.remove('open');
                }
            })
            .catch(error => {
                console.error('Error loading page:', error);
                mainContent.innerHTML = '<h1>Error al cargar la página.</h1><p>Por favor, revise la consola para más detalles.</p>';
            });
    };

    const handleNavClick = (event) => {
        event.preventDefault();
        const url = event.currentTarget.getAttribute('href');
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