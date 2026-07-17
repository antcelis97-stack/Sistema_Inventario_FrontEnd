// assets/js/component-loader.js

async function loadComponent(id, path) {
    try {
        const placeholder = document.getElementById(id);
        if (!placeholder) return false;
        
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        placeholder.innerHTML = html;
        return true;
    } catch (e) {
        console.error(`Error cargando el componente [${path}]:`, e);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    initCustomSelects();

    const token = localStorage.getItem('honda_token');
    if (!token) {
        window.location.replace('../index.html');
        return;
    }

    const requiresAdmin = document.body.getAttribute('data-admin-only') === 'true';
    const userRole = localStorage.getItem('user_role') || 'Operador';

    if (requiresAdmin && userRole !== 'Administrador' && userRole !== 'Supervisor') {
        window.location.replace('main.html');
        return; 
    }

    await loadComponent('navbar-placeholder', '../components/navbar.html');
    await loadComponent('sidebar-placeholder', '../components/sidebar.html');
    await loadComponent('support-modal-placeholder', '../components/support-modal.html');
    // carga de modales globales
    await loadComponent('my-movements-modal-placeholder', '../components/my-movements-modal.html');
    
    
    // CARGAR AMBOS COMPONENTES MODALES GLOBALES
    const loadedMovementModal = await loadComponent('global-modal-placeholder', '../components/movement-modal.html');
    if (loadedMovementModal && typeof initGlobalModalEvents === 'function') {
        initGlobalModalEvents();
    }
    await loadComponent('sparepart-modal-placeholder', '../components/sparepart-modal.html');

    // === MOSTRAR BOTÓN DE PERSONAL EN EL SIDEBAR ===
    const adminLink = document.getElementById('nav-users');
    if (adminLink && userRole === 'Administrador') {
        adminLink.classList.remove('hidden');
    }

    // === LÓGICA DEL MENÚ DE PERFIL Y MANUAL ===
    const userName = localStorage.getItem('user_name') || 'Usuario';
    const profileBtn = document.getElementById('profile-menu-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const profileChevron = document.getElementById('profile-chevron');
    const manualLink = document.getElementById('manual-link');

    // 1. Inyectar datos en la barra principal
    const nameDisplay = document.getElementById('navbar-user-name');
    const roleDisplay = document.getElementById('navbar-user-role');
    const avatarDisplay = document.getElementById('navbar-user-avatar');

    if (nameDisplay) nameDisplay.innerText = userName;
    if (roleDisplay) roleDisplay.innerText = userRole;
    if (avatarDisplay) avatarDisplay.innerText = userName.charAt(0).toUpperCase();

    // 2. Inyectar datos en el menú desplegable (Versión móvil)
    const ddUserName = document.getElementById('dropdown-user-name');
    const ddUserRole = document.getElementById('dropdown-user-role');
    if (ddUserName) ddUserName.innerText = userName;
    if (ddUserRole) ddUserRole.innerText = userRole;

    // 3. Asignar el enlace del manual según el rol
    if (manualLink) {
        if (userRole === 'Administrador') {
            manualLink.href = '../assets/manuals/manual_admin.pdf';
        } else if (userRole === 'Supervisor') {
            manualLink.href = '../assets/manuals/manual_supervisor.pdf';
        } else {
            manualLink.href = '../assets/manuals/manual_operador.pdf';
        }
    }

    // 4. Funcionalidad de apertura/cierre (Toggle) del menú de perfil
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('hidden');
            profileDropdown.classList.toggle('flex');
            if(profileChevron) profileChevron.classList.toggle('rotate-180');
        });

        // Cerrar el menú si el usuario hace clic en otra parte de la pantalla
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.add('hidden');
                profileDropdown.classList.remove('flex');
                if(profileChevron) profileChevron.classList.remove('rotate-180');
            }
        });
    }

    // Activar campana de notificaciones
    if (typeof window.checkPendingApprovals === 'function') {
        window.checkPendingApprovals();
    }

    // === RESALTAR MENÚ ACTIVO EN EL SIDEBAR ===
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('#sidebar-placeholder a');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            // Estilo especial azul para el menú de personal, rojo para los demás
            if(link.id === 'nav-users') {
                link.classList.add('bg-blue-600/10', 'text-blue-500', 'border', 'border-blue-600/20');
            } else {
                link.classList.add('bg-red-600/10', 'text-red-500', 'border', 'border-red-600/20');
            }
            link.classList.remove('text-gray-400');
        }
    });

    if (typeof initDashboard === 'function') {
        initDashboard();
    }
});

// Función de Cerrar Sesión
window.logout = function() {
    localStorage.removeItem('honda_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('session_start'); 
    window.location.replace('../index.html');
};

// Función de Notificaciones de Movimientos Pendientes
window.checkPendingApprovals = async function() {
    const userRole = localStorage.getItem('user_role');
    if (userRole !== 'Administrador' && userRole !== 'Supervisor') return;

    const notifContainer = document.getElementById('navbar-notifications');
    const badge = document.getElementById('notification-badge');
    
    if (notifContainer) notifContainer.classList.remove('hidden');

    try {
        const token = localStorage.getItem('honda_token');
        const response = await fetch(`${window.APP_API_URL}/movements/pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const json = await response.json();
        
        if (response.ok && json.status) {
            const count = json.data.length;
            if (count > 0 && badge) {
                badge.innerText = count > 9 ? '9+' : count;
                badge.classList.remove('hidden');
                badge.classList.add('animate-pulse');
            } else if (badge) {
                badge.classList.add('hidden');
                badge.classList.remove('animate-pulse');
            }
        }
    } catch (error) {
        console.error("Error al consultar notificaciones:", error);
    }
};

// ... (Mantén todo el código superior de tu component-loader.js igual, solo pega esto al final)

// =======================================================
// LÓGICA DEL MODAL: MIS MOVIMIENTOS (PERFIL)
// =======================================================
window.openMyMovementsModal = async function() {
    // 1. Ocultamos el menú desplegable del perfil para que no estorbe
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown) {
        profileDropdown.classList.add('hidden');
        profileDropdown.classList.remove('flex');
    }

    // 2. Animamos la entrada del Modal
    const modal = document.getElementById('my-movements-modal');
    const content = document.getElementById('my-movements-content');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
    }, 10);

    const tbody = document.getElementById('my-movements-body');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-gray-500"><i class="fas fa-spinner fa-spin mr-2 text-blue-500"></i> Recuperando historial...</td></tr>';

    try {
        const token = localStorage.getItem('honda_token');
        const response = await fetch(`${window.APP_API_URL}/movements/my-movements`, { // http://
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        tbody.innerHTML = '';
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-gray-500 font-medium">No has registrado ningún movimiento recientemente.</td></tr>';
            return;
        }

        data.data.forEach(mov => {
            const date = new Date(mov.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
            const partName = mov.spare_part ? mov.spare_part.name : 'Pieza Eliminada/Desconocida';
            const partSku = mov.spare_part ? mov.spare_part.sku : '---';
            
            // Renderizado de las etiquetas de Estado
            let statusBadge = '';
            let statusNotes = '';

            if (mov.status === 'approved') {
                const approver = mov.approver ? mov.approver.name : 'Auto-aprobado';
                statusBadge = `<span class="bg-green-900/30 text-green-400 border border-green-800 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest"><i class="fas fa-check mr-1"></i> Aprobado</span>`;
                statusNotes = `<p class="text-[9px] text-gray-500 mt-1 italic">Revisado por: ${approver}</p>`;
            } else if (mov.status === 'rejected') {
                const approver = mov.approver ? mov.approver.name : 'Administrador';
                statusBadge = `<span class="bg-red-900/30 text-red-500 border border-red-800 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest"><i class="fas fa-times mr-1"></i> Rechazado</span>`;
                statusNotes = `<p class="text-[9px] text-red-400/80 mt-1 italic truncate max-w-[150px]" title="${mov.reason}">Por: ${approver}</p>`;
            } else {
                statusBadge = `<span class="bg-yellow-900/30 text-yellow-500 border border-yellow-800 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest"><i class="fas fa-clock mr-1"></i> En Espera</span>`;
                statusNotes = `<p class="text-[9px] text-gray-500 mt-1 italic">Pendiente de revisión</p>`;
            }

            // Indicador visual de Entrada o Salida
            const typeIcon = mov.type === 'IN' 
                ? '<i class="fas fa-arrow-down text-green-500 mr-2 bg-green-500/10 p-1.5 rounded" title="Entrada"></i>' 
                : '<i class="fas fa-arrow-up text-red-500 mr-2 bg-red-500/10 p-1.5 rounded" title="Salida"></i>';

            tbody.innerHTML += `
                <tr class="hover:bg-slate-800/30 transition-colors border-b border-gray-800">
                    <td class="p-4 text-xs text-gray-400 font-medium">${date}</td>
                    <td class="p-4">
                        <p class="font-bold text-gray-200 text-sm truncate max-w-[200px]" title="${partName}">${partName}</p>
                        <p class="text-[10px] text-gray-500 font-mono tracking-wider mt-0.5">${partSku}</p>
                    </td>
                    <td class="p-4 text-center">
                        <span class="bg-slate-950 border border-gray-800 px-3 py-1 rounded font-black text-white">${mov.quantity}</span>
                    </td>
                    <td class="p-4">
                        <div class="flex items-center">
                            ${typeIcon}
                            <p class="text-xs text-gray-300 font-medium truncate max-w-[150px]" title="${mov.reason}">${mov.reason}</p>
                        </div>
                    </td>
                    <td class="p-4 text-center flex flex-col items-center justify-center">
                        ${statusBadge}
                        ${statusNotes}
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-red-500 font-bold"><i class="fas fa-wifi mr-2"></i> Error de conexión al cargar historial.</td></tr>';
    }
};

window.closeMyMovementsModal = function() {
    const modal = document.getElementById('my-movements-modal');
    const content = document.getElementById('my-movements-content');
    modal.classList.add('opacity-0');
    content.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

// Utilidad global de alertas SweetAlert2
window.showAppAlert = function(title, text, icon = 'success') {
    Swal.fire({
        title: title,
        text: text,
        icon: icon,
        background: '#0f172a',
        color: '#f8fafc',
        confirmButtonColor: '#2563eb',
        buttonsStyling: false,
        customClass: {
            popup: 'border border-gray-800 rounded-2xl shadow-2xl',
            confirmButton: 'bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold px-8 py-3 shadow-lg shadow-blue-900/20 transition-all',
            title: 'text-xl font-black text-white'
        }
    });
}

// =======================================================
// LÓGICA DEL MODAL: SOPORTE TÉCNICO
// =======================================================
window.openSupportModal = function() {
    const modal = document.getElementById('support-modal');
    const content = document.getElementById('support-content');
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
    }, 10);
};

window.closeSupportModal = function() {
    const modal = document.getElementById('support-modal');
    const content = document.getElementById('support-content');
    
    modal.classList.add('opacity-0');
    content.classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
};
// Utilidad global de diseño (Aplica para ambos modales y vistas)
window.initCustomSelects = function() {
    document.querySelectorAll('select.custom-select').forEach(select => {
        if (select.nextElementSibling && select.nextElementSibling.classList.contains('custom-select-wrapper')) {
            select.nextElementSibling.remove(); 
        }

        select.style.display = 'none';

        const wrapper = document.createElement('div');
        wrapper.className = 'relative custom-select-wrapper w-full ' + (select.classList.contains('w-full') ? '' : 'sm:w-auto');

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'w-full bg-slate-900 border border-gray-700 text-white rounded-lg px-4 py-2.5 flex justify-between items-center shadow-md focus:outline-none hover:border-blue-500 transition-colors text-sm';
        button.innerHTML = `<span class="selected-text truncate mr-4">${select.options[select.selectedIndex]?.text || 'Seleccionar...'}</span> <i class="fas fa-chevron-down text-xs text-gray-500"></i>`;

        const menu = document.createElement('ul');
        menu.className = 'absolute z-50 w-full min-w-[220px] bg-slate-900 border border-gray-700 rounded-xl shadow-2xl mt-2 p-2 hidden flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar';

        Array.from(select.options).forEach(option => {
            const reqPerm = option.getAttribute('data-permission');
            if (reqPerm && typeof hasPermission === 'function' && !hasPermission(reqPerm)) return;

            const li = document.createElement('li');
            li.className = 'px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium text-gray-300 border border-transparent transition-all duration-200 hover:text-blue-500 hover:border-blue-500 hover:bg-blue-500/10 truncate';
            li.textContent = option.text;

            li.addEventListener('click', () => {
                select.value = option.value;
                wrapper.querySelector('.selected-text').textContent = option.text;
                menu.classList.add('hidden');
                select.dispatchEvent(new Event('change')); 
            });
            menu.appendChild(li);
        });

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-wrapper ul').forEach(m => {
                if (m !== menu) m.classList.add('hidden');
            });
            menu.classList.toggle('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) menu.classList.add('hidden');
        });

        wrapper.appendChild(button);
        wrapper.appendChild(menu);
        select.parentNode.insertBefore(wrapper, select.nextSibling);
    });
}