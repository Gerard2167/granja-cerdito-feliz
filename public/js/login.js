document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';

        const username = loginForm.username.value;
        const password = loginForm.password.value;

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const { token, role, nombre } = await response.json();
                localStorage.setItem('token', token);
                localStorage.setItem('userRole', role);
                localStorage.setItem('userName', nombre);
                window.location.href = '/index.html'; // Redirigir al dashboard
            } else {
                const { error } = await response.json();
                errorMessage.textContent = error;
            }
        } catch (error) {
            errorMessage.textContent = 'Error de conexión. Inténtelo de nuevo.';
        }
    });
});