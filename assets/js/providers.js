document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('lista-proveedores-body');
    const btnNuevo = document.getElementById('btn-nuevo-proveedor');
    
    // Variables del Modal[cite: 4]
    const modalProveedor = document.getElementById('modal-proveedor');
    const formProveedor = document.getElementById('form-proveedor');
    const btnCancelarProv = document.getElementById('btn-cancelar-prov');
    const btnGuardarProv = document.getElementById('btn-guardar-prov');
    const tituloModal = document.querySelector('#modal-proveedor h2');

    const userRole = localStorage.getItem('user_role') || 'operator'; 
    let proveedoresMemoria = []; // Almacena la tabla temporalmente para facilitar la edición
    let proveedorIdEdicion = null; // Bandera para saber si el usuario está creando o editando

    if (userRole !== 'operator') {
        btnNuevo.style.display = 'inline-block';
    }

    // ==========================================
    // OBTENER DATOS[cite: 4]
    // ==========================================
    const cargarProveedores = async () => {
        try {
            const API_URL = window.API_BASE_URL || 'https://sistema-inventario-ltei.onrender.com/api';
            const token = localStorage.getItem('honda_token');

            const response = await fetch(`${API_URL}/proveedores`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                }
            });

            const data = await response.json();

            if (data.status) {
                proveedoresMemoria = data.data; // Guardamos los datos recibidos
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
    // RENDERIZAR TABLA[cite: 4]
    // ==========================================
    const renderizarTabla = (proveedores) => {
        tableBody.innerHTML = ''; 

        if (proveedores.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #94a3b8;">Aún no hay proveedores registrados.</td></tr>`;
            return;
        }

        proveedores.forEach(prov => {
            const fila = document.createElement('tr');
            
            const contacto = prov.contact ? prov.contact : '<span class="badge-empty">N/A</span>';
            const telefono = prov.phone ? prov.phone : '<span class="badge-empty">N/A</span>';
            const email = prov.email ? prov.email : '<span class="badge-empty">N/A</span>';

            let botonesAcciones = '';
            if (userRole !== 'operator') {
                botonesAcciones = `
                    <button onclick="editarProveedor(${prov.id})" style="background: transparent; border: none; color: #3b82f6; cursor: pointer; margin-right: 8px; font-size: 1.1rem;" title="Editar">✏️</button>
                    <button onclick="confirmarEliminarProveedor(${prov.id}, '${prov.name}')" style="background: transparent; border: none; color: #ef4444; cursor: pointer; font-size: 1.1rem;" title="Eliminar">🗑️</button>
                `;
            } else {
                botonesAcciones = `<span style="color: #64748b; font-size: 0.8rem;">Solo lectura</span>`;
            }

            fila.innerHTML = `
                <td style="font-weight: 500; color: #f8fafc;">${prov.name}</td>
                <td>${contacto}</td>
                <td>${telefono}</td>
                <td>${email}</td>
                <td>${botonesAcciones}</td>
            `;
            
            tableBody.appendChild(fila);
        });
    };

    // ==========================================
    // FUNCIÓN: ELIMINAR PROVEEDOR[cite: 4]
    // ==========================================
    window.confirmarEliminarProveedor = async (id, nombre) => {
        const confirmacion = confirm(`¿Estás seguro de que deseas eliminar al proveedor "${nombre}"?\n\nEsta acción no se puede deshacer.`);
        if (confirmacion) {
            try {
                const API_URL = window.API_BASE_URL || 'https://sistema-inventario-ltei.onrender.com/api';
                const token = localStorage.getItem('honda_token');

                const response = await fetch(`${API_URL}/proveedores/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (response.ok && data.status) {
                    cargarProveedores();
                } else {
                    alert('Error al eliminar: ' + (data.message || 'El proveedor no pudo ser borrado.'));
                }
            } catch (error) {
                console.error('Error eliminando el proveedor:', error);
                alert('Fallo de conexión al intentar eliminar.');
            }
        }
    };

    // ==========================================
    // FUNCIÓN: PREPARAR EDICIÓN[cite: 4]
    // ==========================================
    window.editarProveedor = (id) => {
        proveedorIdEdicion = id; // Guardamos el ID en nuestra bandera global
        
        // Buscamos los datos exactos del proveedor en nuestra memoria
        const prov = proveedoresMemoria.find(p => p.id === id);
        
        if(prov) {
            // Autocompletamos los campos del formulario
            document.getElementById('prov-nombre').value = prov.name || '';
            document.getElementById('prov-contacto').value = prov.contact || '';
            document.getElementById('prov-telefono').value = prov.phone || '';
            document.getElementById('prov-correo').value = prov.email || '';
            
            // Adaptamos la interfaz del modal para que parezca de "Edición"
            tituloModal.textContent = 'Editar Proveedor';
            btnGuardarProv.textContent = 'Actualizar Proveedor';
            
            modalProveedor.style.display = 'flex';
        }
    };

    const mostrarError = (mensaje) => {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444;">${mensaje}</td></tr>`;
    };

    // ==========================================
    // LOGICA DEL MODAL: CREAR Y CANCELAR[cite: 4]
    // ==========================================
    btnNuevo.addEventListener('click', () => {
        proveedorIdEdicion = null; // Reiniciamos la bandera
        formProveedor.reset(); 
        tituloModal.textContent = 'Añadir Proveedor';
        btnGuardarProv.textContent = 'Guardar Proveedor';
        modalProveedor.style.display = 'flex';
    });

    btnCancelarProv.addEventListener('click', () => {
        modalProveedor.style.display = 'none';
        proveedorIdEdicion = null; // Limpiamos bandera por seguridad
    });

    // ==========================================
    // LOGICA DEL MODAL: ENVÍO (POST o PUT)[cite: 4]
    // ==========================================
    formProveedor.addEventListener('submit', async (e) => {
        e.preventDefault();

        const textoOriginal = btnGuardarProv.textContent;
        btnGuardarProv.textContent = 'Guardando...';
        btnGuardarProv.disabled = true;

        const datosProveedor = {
            nombre_empresa: document.getElementById('prov-nombre').value,
            contacto: document.getElementById('prov-contacto').value,
            telefono: document.getElementById('prov-telefono').value,
            email: document.getElementById('prov-correo').value
        };

        try {
            const API_URL = window.API_BASE_URL || 'https://sistema-inventario-ltei.onrender.com/api';
            const token = localStorage.getItem('honda_token');

            // Magia dinámica: Si la bandera tiene un ID, usamos PUT. Si es nula, usamos POST.
            const metodo = proveedorIdEdicion ? 'PUT' : 'POST';
            const endpoint = proveedorIdEdicion ? `/proveedores/${proveedorIdEdicion}` : `/proveedores`;

            const response = await fetch(`${API_URL}${endpoint}`, {
                method: metodo,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(datosProveedor)
            });

            const data = await response.json();

            if (response.ok && data.status) {
                modalProveedor.style.display = 'none';
                cargarProveedores(); // Refrescamos tabla visualmente
            } else {
                alert('Error: ' + (data.message || 'Verifica los datos ingresados'));
            }
        } catch (error) {
            console.error('Error enviando el proveedor:', error);
            alert('Fallo de conexión. Verifica tu internet.');
        } finally {
            btnGuardarProv.textContent = textoOriginal;
            btnGuardarProv.disabled = false;
        }
    });

    // Arrancamos el proceso
    cargarProveedores();
});