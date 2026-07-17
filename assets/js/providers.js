document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('lista-proveedores-body');
    const btnNuevo = document.getElementById('btn-nuevo-proveedor');

    // ==========================================
    // 1. SEGURIDAD FRONTEND (Control de Roles)
    // ==========================================
    // Asume que guardas el rol en localStorage al iniciar sesión. 
    // Cambia 'user_role' por el nombre exacto de la variable que uses.
    const userRole = localStorage.getItem('user_role') || 'operator'; 

    // Si el rol es diferente a 'operator' (ej. admin o gerente), mostramos el botón
    if (userRole !== 'operator') {
        btnNuevo.style.display = 'inline-block';
    }

    // ==========================================
    // 2. OBTENER DATOS DE LA API
    // ==========================================
    // ==========================================
    // 2. OBTENER DATOS DE LA API (Con Seguridad)
    // ==========================================
    const cargarProveedores = async () => {
        try {
            const API_URL = window.API_BASE_URL || 'https://sistema-inventario-ltei.onrender.com/api';
            
            // Obtenemos el token de sesión (Ajusta el nombre 'auth_token' si en tu sistema lo guardas diferente)
            const token = localStorage.getItem('honda_token');

            const response = await fetch(`${API_URL}/proveedores`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json', // Obliga a Laravel a no devolver HTML
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // La llave para pasar el middleware auth:sanctum
                }
            });

            const data = await response.json();

            if (data.status) {
                renderizarTabla(data.data);
            } else {
                mostrarError(data.message || 'No se pudo cargar la lista.');
            }
        } catch (error) {
            console.error('Error al obtener proveedores:', error);
            mostrarError('Error de conexión. Verifica que tengas sesión iniciada.');
        }
    };

    // ==========================================
    // 3. PINTAR LA TABLA
    // ==========================================
    const renderizarTabla = (proveedores) => {
        tableBody.innerHTML = ''; // Limpiamos el "Cargando..."

        if (proveedores.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #94a3b8;">Aún no hay proveedores registrados en el sistema.</td></tr>`;
            return;
        }

        proveedores.forEach(prov => {
            const fila = document.createElement('tr');
            
            // Evaluamos si traen datos, si no, ponemos N/A
            const contacto = prov.contact ? prov.contact : '<span class="badge-empty">N/A</span>';
            const telefono = prov.phone ? prov.phone : '<span class="badge-empty">N/A</span>';
            const email = prov.email ? prov.email : '<span class="badge-empty">N/A</span>';

            fila.innerHTML = `
                <td style="font-weight: 500; color: #f8fafc;">${prov.name}</td>
                <td>${contacto}</td>
                <td>${telefono}</td>
                <td>${email}</td>
            `;
            
            tableBody.appendChild(fila);
        });
    };

    const mostrarError = (mensaje) => {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ef4444;">${mensaje}</td></tr>`;
    };

    // ==========================================
    // 4. LÓGICA DEL MODAL (Crear Proveedor)
    // ==========================================
    const modalProveedor = document.getElementById('modal-proveedor');
    const formProveedor = document.getElementById('form-proveedor');
    const btnCancelarProv = document.getElementById('btn-cancelar-prov');
    const btnGuardarProv = document.getElementById('btn-guardar-prov');

    // Abrir el modal al hacer clic en "+ Nuevo Proveedor"
    btnNuevo.addEventListener('click', () => {
        formProveedor.reset(); // Limpiar campos viejos
        modalProveedor.style.display = 'flex';
    });

    // Cerrar el modal al hacer clic en "Cancelar"
    btnCancelarProv.addEventListener('click', () => {
        modalProveedor.style.display = 'none';
    });

    // Enviar el formulario a la API
    formProveedor.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evitar que la página se recargue

        // Estado de carga
        const textoOriginal = btnGuardarProv.textContent;
        btnGuardarProv.textContent = 'Guardando...';
        btnGuardarProv.disabled = true;

        // Construimos el objeto tal y como lo espera el ProveedorController
        const datosNuevoProveedor = {
            nombre_empresa: document.getElementById('prov-nombre').value,
            contacto: document.getElementById('prov-contacto').value,
            telefono: document.getElementById('prov-telefono').value,
            email: document.getElementById('prov-correo').value
        };

        try {
            const API_URL = window.API_BASE_URL || 'https://sistema-inventario-ltei.onrender.com/api';
            const token = localStorage.getItem('honda_token');

            const response = await fetch(`${API_URL}/proveedores`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Llave maestra
                },
                body: JSON.stringify(datosNuevoProveedor)
            });

            const data = await response.json();

            if (response.ok && data.status) {
                // Éxito: Cerramos el modal y recargamos la tabla
                modalProveedor.style.display = 'none';
                cargarProveedores(); // Tu función existente que refresca la lista visualmente
            } else {
                alert('Error al guardar: ' + (data.message || 'Verifica los datos'));
            }
        } catch (error) {
            console.error('Error enviando el proveedor:', error);
            alert('Fallo de conexión. Verifica tu internet.');
        } finally {
            // Regresar el botón a la normalidad
            btnGuardarProv.textContent = textoOriginal;
            btnGuardarProv.disabled = false;
        }
    });

    // Ejecutamos la carga inicial
    cargarProveedores();
});