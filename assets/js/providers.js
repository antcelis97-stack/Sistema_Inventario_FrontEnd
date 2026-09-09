document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('lista-proveedores-body');
    const btnNuevo = document.getElementById('btn-nuevo-proveedor');
    
    const modalProveedor = document.getElementById('modal-proveedor');
    const contentProveedor = document.getElementById('modal-proveedor-content');
    const formProveedor = document.getElementById('form-proveedor');
    const btnCancelarProv = document.getElementById('btn-cancelar-prov');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const btnGuardarProv = document.getElementById('btn-guardar-prov');
    const tituloModal = document.getElementById('titulo-modal');

    const userRole = localStorage.getItem('user_role') || 'Operador'; 
    let proveedoresMemoria = []; 
    let proveedorIdEdicion = null; 

    if (userRole !== 'Operador') {
        btnNuevo.classList.remove('hidden');
    }

    // ANIMACIÓN DEL MODAL
    const toggleModal = (show) => {
        if (show) {
            modalProveedor.classList.remove('hidden');
            setTimeout(() => {
                modalProveedor.classList.remove('opacity-0');
                contentProveedor.classList.remove('scale-95');
            }, 10);
        } else {
            modalProveedor.classList.add('opacity-0');
            contentProveedor.classList.add('scale-95');
            setTimeout(() => {
                modalProveedor.classList.add('hidden');
            }, 300);
        }
    };

    const cargarProveedores = async () => {
        // ESQUELETO MIENTRAS CARGA
        tableBody.innerHTML = `
            <tr>
                <td class="p-4"><div class="skeleton skeleton-title mb-0"></div></td>
                <td class="p-4"><div class="skeleton skeleton-text short mb-0"></div></td>
                <td class="p-4"><div class="skeleton skeleton-text short mb-0"></div></td>
                <td class="p-4"><div class="skeleton skeleton-text short mb-0"></div></td>
                <td class="p-4"><div class="skeleton skeleton-text short mb-0"></div></td>
            </tr>
        `.repeat(3);

        try {
            const token = localStorage.getItem('honda_token');
            const response = await fetch(`${window.APP_API_URL}/proveedores`, {
                method: 'GET',
                headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (response.ok && data.status) {
                proveedoresMemoria = data.data; 
                renderizarTabla(data.data);
            } else {
                mostrarError(data.message || 'No se pudo cargar la lista.');
            }
        } catch (error) {
            mostrarError('Error de conexión. Verifica que el servidor esté activo.');
        }
    };

    const renderizarTabla = (proveedores) => {
        tableBody.innerHTML = ''; 

        if (proveedores.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-gray-500">Aún no hay proveedores registrados.</td></tr>`;
            return;
        }

        proveedores.forEach(prov => {
            const fila = document.createElement('tr');
            fila.className = 'hover:bg-slate-800/30 transition-colors';
            
            const contacto = prov.contact ? prov.contact : '<span class="text-gray-600 italic text-xs">N/A</span>';
            const telefono = prov.phone ? prov.phone : '<span class="text-gray-600 italic text-xs">N/A</span>';
            const email = prov.email ? prov.email : '<span class="text-gray-600 italic text-xs">N/A</span>';

            let botonesAcciones = '';
            if (userRole !== 'Operador') {
                botonesAcciones = `
                    <div class="flex justify-end gap-2">
                        <button onclick="editarProveedor(${prov.id})" class="h-8 w-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-colors" title="Editar"><i class="fas fa-pen"></i></button>
                        <button onclick="confirmarEliminarProveedor(${prov.id}, '${prov.name}')" class="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors" title="Eliminar"><i class="fas fa-trash"></i></button>
                    </div>
                `;
            } else {
                botonesAcciones = `<span class="text-xs text-gray-600">Solo lectura</span>`;
            }

            fila.innerHTML = `
                <td class="p-4 font-bold text-white">${prov.name}</td>
                <td class="p-4">${contacto}</td>
                <td class="p-4">${telefono}</td>
                <td class="p-4 text-blue-400">${email}</td>
                <td class="p-4 text-right">${botonesAcciones}</td>
            `;
            tableBody.appendChild(fila);
        });
    };

    window.confirmarEliminarProveedor = async (id, nombre) => {
        const confirmacion = await Swal.fire({
            title: '¿Eliminar Proveedor?',
            text: `Borrarás a "${nombre}". Esta acción no se puede deshacer.`,
            icon: 'warning',
            showCancelButton: true,
            background: '#0f172a', color: '#f8fafc', confirmButtonColor: '#dc2626', cancelButtonColor: '#334155',
            confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar'
        });

        if (confirmacion.isConfirmed) {
            try {
                const token = localStorage.getItem('honda_token');
                const response = await fetch(`${window.APP_API_URL}/proveedores/${id}`, {
                    method: 'DELETE',
                    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
                });

                const data = await response.json();
                if (response.ok && data.status) {
                    cargarProveedores();
                    Swal.fire({title: 'Eliminado', icon: 'success', background: '#0f172a', color: '#f8fafc', showConfirmButton: false, timer: 1500});
                } else {
                    Swal.fire({title: 'Error', text: data.message, icon: 'error', background: '#0f172a', color: '#f8fafc'});
                }
            } catch (error) {
                Swal.fire({title: 'Fallo de red', text: 'Error de conexión', icon: 'error', background: '#0f172a', color: '#f8fafc'});
            }
        }
    };

    window.editarProveedor = (id) => {
        proveedorIdEdicion = id; 
        const prov = proveedoresMemoria.find(p => p.id === id);
        
        if(prov) {
            document.getElementById('prov-nombre').value = prov.name || '';
            document.getElementById('prov-contacto').value = prov.contact || '';
            document.getElementById('prov-telefono').value = prov.phone || '';
            document.getElementById('prov-correo').value = prov.email || '';
            
            tituloModal.innerHTML = '<i class="fas fa-edit text-amber-500 mr-2"></i> Editar Proveedor';
            btnGuardarProv.textContent = 'Actualizar';
            btnGuardarProv.classList.replace('bg-blue-600', 'bg-amber-600');
            btnGuardarProv.classList.replace('hover:bg-blue-700', 'hover:bg-amber-700');
            
            toggleModal(true);
        }
    };

    const mostrarError = (mensaje) => {
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center p-8 text-red-500">${mensaje}</td></tr>`;
    };

    btnNuevo.addEventListener('click', () => {
        proveedorIdEdicion = null; 
        formProveedor.reset(); 
        tituloModal.innerHTML = '<i class="fas fa-truck text-blue-500 mr-2"></i> Añadir Proveedor';
        btnGuardarProv.textContent = 'Guardar';
        btnGuardarProv.classList.replace('bg-amber-600', 'bg-blue-600');
        btnGuardarProv.classList.replace('hover:bg-amber-700', 'hover:bg-blue-700');
        toggleModal(true);
    });

    btnCancelarProv.addEventListener('click', () => toggleModal(false));
    btnCerrarModal.addEventListener('click', () => toggleModal(false));

    formProveedor.addEventListener('submit', async (e) => {
        e.preventDefault();

        const textoOriginal = btnGuardarProv.textContent;
        btnGuardarProv.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btnGuardarProv.disabled = true;

        const datosProveedor = {
            nombre_empresa: document.getElementById('prov-nombre').value,
            contacto: document.getElementById('prov-contacto').value,
            telefono: document.getElementById('prov-telefono').value,
            email: document.getElementById('prov-correo').value
        };

        try {
            const token = localStorage.getItem('honda_token');
            const metodo = proveedorIdEdicion ? 'PUT' : 'POST';
            const endpoint = proveedorIdEdicion ? `/proveedores/${proveedorIdEdicion}` : `/proveedores`;

            const response = await fetch(`${window.APP_API_URL}${endpoint}`, {
                method: metodo,
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(datosProveedor)
            });

            const data = await response.json();

            if (response.ok && data.status) {
                toggleModal(false);
                cargarProveedores(); 
            } else {
                Swal.fire({title: 'Atención', text: data.message, icon: 'warning', background: '#0f172a', color: '#f8fafc'});
            }
        } catch (error) {
            Swal.fire({title: 'Fallo de red', text: 'Verifica tu internet.', icon: 'error', background: '#0f172a', color: '#f8fafc'});
        } finally {
            btnGuardarProv.textContent = textoOriginal;
            btnGuardarProv.disabled = false;
        }
    });

    cargarProveedores();
});