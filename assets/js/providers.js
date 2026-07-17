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
    const cargarProveedores = async () => {
        try {
            // Usa tu URL configurada o la de Render directamente
            const API_URL = window.API_BASE_URL || 'https://sistema-inventario-ltei.onrender.com/api';
            
            const response = await fetch(`${API_URL}/proveedores`);
            const data = await response.json();

            if (data.status) {
                renderizarTabla(data.data);
            } else {
                mostrarError('No se pudo cargar la lista.');
            }
        } catch (error) {
            console.error('Error al obtener proveedores:', error);
            mostrarError('Error de conexión con el servidor.');
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

    // Al darle clic al botón nuevo (Solo lo verán los admins)
    btnNuevo.addEventListener('click', () => {
        // Por ahora lo rediriges a tu modal o página de creación si la tienes separada.
        // O puedes mandar un alert de "En desarrollo" si apenas lo vas a programar.
        alert('Abrir modal de nuevo proveedor (Función en desarrollo)');
    });

    // Ejecutamos la carga inicial
    cargarProveedores();
});