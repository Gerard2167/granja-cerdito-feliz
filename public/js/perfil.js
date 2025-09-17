(function() {
    const formPerfil = document.getElementById('form-perfil');

    formPerfil.addEventListener('submit', async (e) => {
        e.preventDefault();

        const oldPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;

        if (newPassword !== confirmNewPassword) {
            alert('Las nuevas contraseñas no coinciden.');
            return;
        }

        try {
            const response = await window.fetchWithAuth('/users/change-password', {
                method: 'PUT',
                body: JSON.stringify({ oldPassword, newPassword })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al cambiar la contraseña');
            }

            alert('Contraseña cambiada exitosamente.');
            formPerfil.reset();
        } catch (error) {
            alert(error.message);
        }
    });
})();