(function() {
    const formUsuario = document.getElementById('form-usuario');
    const tablaUsuariosBody = document.getElementById('tabla-usuarios');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const submitButton = formUsuario.querySelector('button[type="submit"]');

    const API_URL_USERS = '/users';
    const API_URL_ROLES = '/roles';

    let editUserId = null;

    const fetchRoles = async () => {
        try {
            const response = await window.fetchWithAuth(API_URL_ROLES);
            if (!response.ok) throw new Error('Error al cargar roles');
            return await response.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    };

    const populateRoles = async () => {
        const roles = await fetchRoles();
        const roleSelect = document.getElementById('role');
        roleSelect.innerHTML = '';
        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.id;
            option.textContent = role.nombre;
            roleSelect.appendChild(option);
        });
    };

    const fetchUsers = async () => {
        try {
            const response = await window.fetchWithAuth(API_URL_USERS);
            if (!response.ok) throw new Error('Error al cargar usuarios');
            const users = await response.json();
            console.log('Fetched Users:', users); // Log fetched users
            return users;
        } catch (error) {
            console.error('Error in fetchUsers:', error);
            return [];
        }
    };

    const renderUsers = async () => {
        const users = await fetchUsers();
        console.log('Rendering Users:', users); // Log users before rendering
        tablaUsuariosBody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.username}</td>
                <td>${user.nombre}</td>
                <td>${user.role}</td>
                <td>
                    <button class="btn-editar" data-id="${user.id}">Editar</button>
                    <button class="btn-eliminar" data-id="${user.id}">Eliminar</button>
                </td>
            `;
            tablaUsuariosBody.appendChild(tr);
        });
    };

    const resetForm = () => {
        formUsuario.reset();
        editUserId = null;
        submitButton.textContent = 'Guardar Usuario';
        cancelEditBtn.style.display = 'none';
        document.getElementById('password').required = true;
    };

    formUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const nombre = document.getElementById('nombre').value;
        const password = document.getElementById('password').value;
        const role_id = document.getElementById('role').value;

        const userData = { username, nombre, role_id };
        if (password) {
            userData.password = password;
        }

        const url = editUserId ? `${API_URL_USERS}/${editUserId}` : API_URL_USERS;
        const method = editUserId ? 'PUT' : 'POST';

        try {
            const response = await window.fetchWithAuth(url, {
                method,
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al guardar usuario');
            }

            await renderUsers();
            resetForm();
        } catch (error) {
            alert(error.message);
        }
    });

    tablaUsuariosBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-editar')) {
            const id = e.target.dataset.id;
            const users = await fetchUsers();
            const user = users.find(u => u.id == id);

            if (user) {
                editUserId = id;
                document.getElementById('usuario-id').value = user.id;
                document.getElementById('username').value = user.username;
                document.getElementById('nombre').value = user.nombre;
                document.getElementById('role').value = user.role_id;
                document.getElementById('password').required = false;
                submitButton.textContent = 'Actualizar Usuario';
                cancelEditBtn.style.display = 'inline-block';
            }
        }

        if (e.target.classList.contains('btn-eliminar')) {
            const id = e.target.dataset.id;
            if (confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
                try {
                    const response = await window.fetchWithAuth(`${API_URL_USERS}/${id}`, {
                        method: 'DELETE'
                    });
                    if (!response.ok) throw new Error('Error al eliminar usuario');
                    await renderUsers();
                } catch (error) {
                    alert(error.message);
                }
            }
        }
    });

    cancelEditBtn.addEventListener('click', resetForm);

    const init = async () => {
        await populateRoles();
        await renderUsers();
        resetForm();
    };

    init();
})();
