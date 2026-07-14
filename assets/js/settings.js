// assets/js/settings.js
const API_BASE_URL = 'https://sistema-inventario-ltei.onrender.com/api';// http://127.0.0.1:8000/api para el local, https://sistema-inventario-ltei.onrender.com/api para el servidor en Render

const availablePermissions = [
    { id: 'create_in', icon: 'fa-arrow-down', color: 'text-green-500', name: 'Crear Entradas', desc: 'Registrar ingreso de refacciones al almacén.', allowOperator: true },
    { id: 'create_out', icon: 'fa-arrow-up', color: 'text-red-500', name: 'Crear Salidas', desc: 'Registrar ventas, mermas o devoluciones.', allowOperator: true },
    { id: 'reports_in', icon: 'fa-chart-pie', color: 'text-blue-500', name: 'Reportes de Entradas', desc: 'Consultar y exportar bitácora de ingresos.', allowOperator: true },
    { id: 'reports_out', icon: 'fa-file-export', color: 'text-orange-500', name: 'Reportes de Salidas', desc: 'Consultar y exportar bitácora de salidas.', allowOperator: true },
    { id: 'reports_all', icon: 'fa-chart-line', color: 'text-indigo-500', name: 'Reportes Completos', desc: 'Consultar historial general del sistema.', allowOperator: true },
    { id: 'reports_adjustments', icon: 'fa-balance-scale', color: 'text-yellow-500', name: 'Reportes de Ajustes', desc: 'Auditar cambios y rechazos de inventario.', allowOperator: false },
    { id: 'reports_returns', icon: 'fa-undo', color: 'text-pink-500', name: 'Reportes de Devoluciones', desc: 'Auditar devoluciones y reembolsos.', allowOperator: false },
    { id: 'approve_movements', icon: 'fa-check-double', color: 'text-emerald-500', name: 'Aprobar Salidas', desc: 'Autorizar movimientos en cuarentena.', allowOperator: false },
    { id: 'reject_movements', icon: 'fa-ban', color: 'text-red-600', name: 'Rechazar Salidas', desc: 'Cancelar movimientos pendientes.', allowOperator: false },
    { id: 'view_evidence', icon: 'fa-camera', color: 'text-gray-400', name: 'Ver Evidencias', desc: 'Consultar fotografías de devoluciones.', allowOperator: false },
    { id: 'manage_catalog', icon: 'fa-box', color: 'text-blue-400', name: 'Gestionar Catálogo', desc: 'Crear y editar refacciones.', allowOperator: false },
    { id: 'import_csv', icon: 'fa-file-csv', color: 'text-green-600', name: 'Importar CSV', desc: 'Carga masiva de inventario y catálogos.', allowOperator: false },
    { id: 'toggle_status', icon: 'fa-power-off', color: 'text-red-400', name: 'Habilitar/Inhabilitar', desc: 'Cambiar el estado de los productos.', allowOperator: false }
];

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    initCustomSelects();

    const userForm = document.getElementById('user-form');
    if (userForm) userForm.addEventListener('submit', createNewUser);
    
    // Toggles de contraseñas
    setupPasswordToggle('btn-toggle-pass', 'u-password', 'icon-toggle-pass');
    setupPasswordToggle('btn-toggle-confirm', 'u-password-confirm', 'icon-toggle-confirm');
    setupPasswordToggle('btn-toggle-edit-pass', 'e-password', 'icon-toggle-edit-pass');
    setupPasswordToggle('btn-toggle-edit-confirm', 'e-password-confirm', 'icon-toggle-edit-confirm');
});

async function loadUsers() {
    const token = localStorage.getItem('honda_token');
    const tbody = document.getElementById('users-table-body');
    
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await response.json();

        if (response.ok && json.status) {
            tbody.innerHTML = '';
            
            // Atrapamos quién está viendo la pantalla
            const currentUserId = json.current_user_id;

            json.data.forEach(user => {
                
                const protectedIds = [1, 2, 5]; 
                const isUntouchable = protectedIds.includes(user.id);
                const isMe = (user.id === currentUserId);
                
                const isInactive = !user.activo; 
                const rowClass = isInactive ? 'opacity-50 bg-slate-950' : 'hover:bg-slate-800/30';
                
                let roleColor = 'text-gray-400';
                if (user.role === 'Administrador') roleColor = 'text-blue-400 font-bold';
                if (user.role === 'Supervisor') roleColor = 'text-purple-400';

                const statusBadge = user.activo 
                    ? `<span class="bg-green-500/10 text-green-500 border border-green-500/30 px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase">Activo</span>`
                    : `<span class="bg-red-500/10 text-red-500 border border-red-500/30 px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase">Inactivo</span>`;

                const displayEmail = user.email === 'PROTEGIDO' 
                    ? `<span class="bg-gray-800 text-gray-500 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest"><i class="fas fa-eye-slash mr-1"></i> OCULTO</span>` 
                    : user.email;

                // 🛡️ LÓGICA DE RENDERIZADO DE BOTONES
                let actionButtons = '';
                const editBtn = `<button onclick="openEditUserModal(${user.id}, '${user.name}', '${user.email}')" class="h-8 w-8 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 transition-colors" title="Editar Datos"><i class="fas fa-pen"></i></button>`;

                if (isUntouchable && !isMe) {
                    // Es núcleo, pero NO eres tú: Bloqueo Total
                    actionButtons = `<span class="text-xs text-gray-600 font-mono italic flex items-center justify-end"><i class="fas fa-lock mr-2"></i> Núcleo del Sistema</span>`;
                } else if (isUntouchable && isMe) {
                    // Eres tú mismo (Núcleo): Solo puedes editar tus datos
                    actionButtons = `<div class="flex justify-end gap-2">${editBtn}</div>`;
                } else {
                    // Usuario mortal: Controles completos
                    const toggleIcon = user.activo ? 'fa-power-off text-red-400' : 'fa-check text-green-400';
                    const permsStr = user.permissions ? JSON.stringify(user.permissions).replace(/"/g, '&quot;') : '[]';
                    
                    actionButtons = `
                        <div class="flex justify-end gap-2">
                            ${editBtn}
                            <button onclick="openPermissionsModal(${user.id}, '${user.name}', '${permsStr}', '${user.role}')" class="h-8 w-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-colors" title="Matriz de Permisos">
                                <i class="fas fa-fingerprint"></i>
                            </button>
                            <button onclick="openRoleModal(${user.id}, '${user.name}', '${user.role}')" class="h-8 w-8 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-colors" title="Cambiar Rol">
                                <i class="fas fa-user-tag"></i>
                            </button>
                            <button onclick="toggleUser(${user.id}, '${user.name}')" class="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors" title="Cambiar Estado">
                                <i class="fas ${toggleIcon}"></i>
                            </button>
                        </div>
                    `;
                }

                // (Busca este fragmento dentro de tu función loadUsers)
                tbody.innerHTML += `
                    <tr class="border-b border-gray-800 transition ${rowClass}">
                        <td class="p-4 font-mono text-xs text-gray-500">USR-${String(user.id).padStart(3, '0')}</td>
                        <td class="p-4">
                            <!-- AQUÍ DEVOLVEMOS LAS CLASES VISUALES AL BOTÓN -->
                            <button onclick="showUserDetails(${user.id}, '${user.name}', '${user.email}', '${user.role}', '${user.avatar_url || ''}')" class="font-bold text-white hover:text-blue-400 transition-colors cursor-pointer text-left">
                                ${user.name} ${isUntouchable ? '<i class="fas fa-shield-alt text-blue-500 ml-1 text-xs" title="Sistema"></i>' : ''}
                            </button>
                            <p class="text-[10px] text-gray-500 font-mono mt-1">${displayEmail}</p>
                        </td>
                        <td class="p-4 text-xs ${roleColor}">${user.role}</td>
                        <td class="p-4 text-center">${statusBadge}</td>
                        <td class="p-4 pr-6">${actionButtons}</td>
                    </tr>
                `;
            });
        }
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
    }
}

// ==========================================
// NUEVO: LÓGICA DE EDICIÓN DE USUARIO
// ==========================================
window.openEditUserModal = function(id, name, email) {
    document.getElementById('e-user-id').value = id;
    document.getElementById('e-name').value = name;
    document.getElementById('e-email').value = email;
    document.getElementById('e-password').value = '';
    document.getElementById('e-password-confirm').value = '';

    const modal = document.getElementById('editUserModal');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('editUserContent').classList.remove('scale-95'); }, 10);
}

window.closeEditUserModal = function() {
    const modal = document.getElementById('editUserModal');
    modal.classList.add('opacity-0'); document.getElementById('editUserContent').classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); document.getElementById('edit-user-form').reset(); }, 300);
}

window.submitEditUser = async function(e) {
    e.preventDefault();
    const id = document.getElementById('e-user-id').value;
    const password = document.getElementById('e-password').value;
    const confirmPassword = document.getElementById('e-password-confirm').value;

    if (password && password !== confirmPassword) {
        showAppAlert("Error de Seguridad", "Las contraseñas no coinciden.", "warning");
        return;
    }

    const payload = {
        name: document.getElementById('e-name').value,
        email: document.getElementById('e-email').value
    };
    if (password) payload.password = password;

    const btn = document.getElementById('btn-submit-edit');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Guardando...';

    try {
        const token = localStorage.getItem('honda_token');
        const response = await fetch(`${API_BASE_URL}/users/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok && data.status) {
            closeEditUserModal();
            loadUsers();
            showAppAlert("Operación Exitosa", "Los datos del usuario fueron actualizados.", "success");
            
            // Si el admin se editó a sí mismo, actualizamos su nombre localmente
            if (payload.name && document.getElementById('navbar-user-name')) {
                const currentName = document.getElementById('navbar-user-name').innerText;
                if (currentName !== payload.name) {
                    localStorage.setItem('user_name', payload.name);
                    document.getElementById('navbar-user-name').innerText = payload.name;
                    document.getElementById('navbar-user-avatar').innerText = payload.name.charAt(0).toUpperCase();
                }
            }
        } else {
            showAppAlert("Atención", data.message || "No se pudo actualizar el usuario", "error");
        }
    } catch (error) {
        showAppAlert("Fallo de red", "Verifica tu conexión al servidor.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// === CREACIÓN DE USUARIO ===
async function createNewUser(e) {
    e.preventDefault();
    
    const password = document.getElementById('u-password').value;
    const confirmPassword = document.getElementById('u-password-confirm').value;

    if (password !== confirmPassword) {
        showAppAlert("Atención", "Las contraseñas no coinciden. Por favor verifica.", "warning");
        return; 
    }
    const payload = {
        name: document.getElementById('u-name').value,
        email: document.getElementById('u-email').value,
        password: document.getElementById('u-password').value,
        role: document.getElementById('u-role').value
    };

    const btn = document.getElementById('btn-submit-user');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';

    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('honda_token')}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok) {
            closeUserModal();
            loadUsers();
            showAppAlert("Operación Exitosa", "Usuario creado con éxito.", "success");
        } else {
            showAppAlert("Error", data.message || "Error al crear usuario.", "error");
        }
    } catch (error) {
        showAppAlert("Fallo de red", "Verifica tu conexión al servidor.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Registrar Usuario';
    }
}

// === MODIFICAR ROL ===
async function saveNewRole() {
    const id = document.getElementById('r-user-id').value;
    const role = document.getElementById('r-role').value;
    const btn = document.getElementById('btn-submit-role');

    btn.disabled = true;
    btn.innerText = 'Guardando...';

    try {
        const response = await fetch(`${API_BASE_URL}/users/${id}/role`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('honda_token')}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ role })
        });
        
        if (response.ok) {
            closeRoleModal();
            loadUsers();
        } else {
            alert("No se pudo actualizar el rol.");
        }
    } catch (error) {
        console.error(error);
    } finally {
        btn.disabled = false;
        btn.innerText = 'Guardar';
    }
}

// === HABILITAR / INHABILITAR ===
// === HABILITAR / INHABILITAR ===
function toggleUser(id, name) {
    Swal.fire({
        title: '¿Confirmar acción?',
        text: `¿Deseas modificar el acceso al sistema de ${name}?`,
        icon: 'warning',
        showCancelButton: true,
        background: '#0f172a',
        color: '#f8fafc',
        confirmButtonText: '<i class="fas fa-check mr-2"></i> Sí, modificar',
        cancelButtonText: 'Cancelar',
        buttonsStyling: false,
        customClass: {
            popup: 'border border-gray-800 rounded-2xl shadow-2xl',
            confirmButton: 'bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold px-6 py-2.5 mx-2 transition-colors',
            cancelButton: 'bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold px-6 py-2.5 mx-2 transition-colors',
            title: 'text-xl font-black text-white'
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`${API_BASE_URL}/users/${id}/toggle-status`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('honda_token')}`,
                        'Accept': 'application/json'
                    }
                });

                const data = await response.json();
                if (response.ok) {
                    loadUsers();
                    showAppAlert("Actualizado", data.message, "success");
                } else {
                    showAppAlert("Acceso Denegado", data.message, "error");
                }
            } catch (error) {
                showAppAlert("Error de red", "No se pudo conectar con el servidor.", "error");
            }
        }
    });
}

// === MOSTRAR / OCULTAR CONTRASEÑA ===
function setupPasswordToggle(btnId, inputId, iconId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (btn && input && icon) {
        btn.addEventListener('click', () => {
            const isPassword = input.getAttribute('type') === 'password';
            input.setAttribute('type', isPassword ? 'text' : 'password');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
}

// === CONTROL DE MODALES ORIGINALES ===
function openUserModal() {
    const modal = document.getElementById('userModal');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('userContent').classList.remove('scale-95'); }, 10);
}
function closeUserModal() {
    const modal = document.getElementById('userModal');
    modal.classList.add('opacity-0'); document.getElementById('userContent').classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); document.getElementById('user-form').reset(); }, 300);
}
function openRoleModal(id, name, currentRole) {
    document.getElementById('r-user-id').value = id;
    document.getElementById('r-name-display').innerText = name;
    document.getElementById('r-role').value = currentRole;
    
    const modal = document.getElementById('roleModal');
    modal.classList.remove('hidden');
    setTimeout(() => { modal.classList.remove('opacity-0'); document.getElementById('roleContent').classList.remove('scale-95'); }, 10);
}
function closeRoleModal() {
    const modal = document.getElementById('roleModal');
    modal.classList.add('opacity-0'); document.getElementById('roleContent').classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

// ==========================================
// MODAL DE PERMISOS
// ==========================================
window.openPermissionsModal = function(userId, userName, currentPermissions, userRole) {
    document.getElementById('perm-user-id').value = userId;
    document.getElementById('perm-user-name').innerText = userName + ` (${userRole.toUpperCase()})`;

    let userPerms = [];
    if (typeof currentPermissions === 'string') {
        try { userPerms = JSON.parse(currentPermissions); } catch(e){}
    } else if (Array.isArray(currentPermissions)) {
        userPerms = currentPermissions;
    }

    const grid = document.getElementById('permissions-grid');
    grid.innerHTML = '';

    availablePermissions.forEach(perm => {
        if (!perm.allowOperator && userRole === 'Operador') {
            return; 
        }

        let isChecked = false;
        if (userPerms.length > 0) {
            isChecked = userPerms.includes(perm.id);
        } else {
            if (userRole === 'Administrador' || userRole === 'Supervisor') {
                isChecked = true; 
            } else if (userRole === 'Operador' && (perm.id === 'create_in' || perm.id === 'create_out')) {
                isChecked = true; 
            }
        }

        grid.innerHTML += `
            <div class="bg-slate-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-700 transition-colors">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center border border-gray-800 shadow-inner">
                        <i class="fas ${perm.icon} ${perm.color}"></i>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold text-white">${perm.name}</h4>
                        <p class="text-[10px] text-gray-500 uppercase tracking-wide font-medium mt-0.5">${perm.desc}</p>
                    </div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" value="${perm.id}" class="sr-only peer perm-checkbox" ${isChecked ? 'checked' : ''}>
                    <div class="w-11 h-6 bg-slate-950 border border-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-checked:shadow-[0_0_15px_rgba(16,185,129,0.6)]"></div>
                </label>
            </div>
        `;
    });

    const modal = document.getElementById('permissions-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('permissions-content').classList.remove('scale-95');
    }, 10);
}

window.closePermissionsModal = function() {
    const modal = document.getElementById('permissions-modal');
    modal.classList.add('opacity-0');
    document.getElementById('permissions-content').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

window.savePermissions = async function() {
    const userId = document.getElementById('perm-user-id').value;
    const checkboxes = document.querySelectorAll('.perm-checkbox');
    
    const selectedPermissions = [];
    checkboxes.forEach(chk => {
        if (chk.checked) selectedPermissions.push(chk.value);
    });

    const btn = document.getElementById('btn-save-perms');
    const originalText = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando Matrix...';
        
        const token = localStorage.getItem('honda_token');
        const response = await fetch(`${API_BASE_URL}/users/${userId}/permissions`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ permissions: selectedPermissions })
        });

        const data = await response.json();
        if (response.ok && data.status) {
            closePermissionsModal();
            loadUsers();
        } else {
            ShowAppAlert(data.message || "Error", "No se pudo actualizar el rol.", "error");
        }
    } catch (error) {
        console.error(error);
        ShowAppAlert('Error de red', 'No se pudo conectar con el servidor.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}