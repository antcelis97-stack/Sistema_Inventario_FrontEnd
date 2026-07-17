// ==========================================
// GUARDAESPALDAS GLOBAL DE SEGURIDAD
// ==========================================
(function() {
    // 1. Verificación estricta al cargar la página
    // Si no hay token, lo mandamos al login ANTES de que se dibuje el HTML
    if (!localStorage.getItem('honda_token')) {
        window.location.replace('../index.html');
        return;
    }

    // 2. Interceptor Global de Peticiones (Magia Pura)
    // Clonamos la función fetch original del navegador
    const originalFetch = window.fetch;

    // Sobrescribimos fetch con nuestro propio validador
    window.fetch = async function(...args) {
        try {
            const response = await originalFetch.apply(this, args);
            
            // Si Laravel nos batea porque el token expiró o es inválido
            if (response.status === 401) {
                console.warn("🔒 Alerta de Seguridad: Token caducado o sesión inválida.");
                localStorage.removeItem('honda_token');
                
                // Alerta elegante antes de echar al usuario
                Swal.fire({
                    title: 'Sesión Caducada',
                    text: 'Por seguridad, tu sesión ha terminado. Por favor vuelve a ingresar.',
                    icon: 'info',
                    background: '#0f172a', color: '#f8fafc', confirmButtonColor: '#2563eb',
                    customClass: { popup: 'border border-gray-800 rounded-2xl shadow-2xl', confirmButton: 'bg-blue-600 text-white rounded-xl font-bold px-8 py-3' }
                }).then(() => {
                    window.location.replace('../index.html');
                });
                
                return new Promise(() => {}); 
            }
            
            return response;
        } catch (error) {
            // Dejamos pasar errores de red normales para que tus archivos .js los manejen
            throw error;
        }
    };
})();
// Verifica un permiso específico de forma instantánea
// Verifica un permiso específico de forma instantánea
window.hasPermission = function(reqPerm) {
    const userId = parseInt(localStorage.getItem('user_id') || '0');
    const userRole = localStorage.getItem('user_role');
    const userPermsRaw = localStorage.getItem('user_permissions');

    // 1. INMUNIDAD ABSOLUTA: El núcleo del sistema ve TODO siempre
    if ([1, 2, 3].includes(userId)) return true; 

    // 2. PARCHE DE EMERGENCIA: Si la sesión es antigua y no tiene ID, pero es Admin
    if (userId === 0 && userRole === 'Administrador') return true;

    // 3. COMPORTAMIENTO POR DEFECTO (Si nunca se le han configurado permisos)
    // Agregamos '[]' porque Laravel envía arreglos vacíos cuando no hay JSON guardado
    if (!userPermsRaw || userPermsRaw === 'null' || userPermsRaw === 'undefined' || userPermsRaw === '[]') {
        if (userRole === 'Administrador' || userRole === 'Supervisor') return true;
        if (userRole === 'Operador' && (reqPerm === 'create_in' || reqPerm === 'create_out')) return true;
        return false;
    }

    // 4. LA LEY ABSOLUTA: Si ya tiene permisos guardados, respetamos los interruptores
    try {
        const userPerms = JSON.parse(userPermsRaw) || [];
        return userPerms.includes(reqPerm);
    } catch(e) { 
        return false; 
    }
}

// Oculta elementos estáticos en el HTML al cargar la página
window.enforcePermissions = function() {
    const restrictedElements = document.querySelectorAll('[data-permission]');

    restrictedElements.forEach(el => {
        const reqPerm = el.getAttribute('data-permission');
        
        // Si NO tiene el permiso, lo desaparecemos
        if (!hasPermission(reqPerm)) {
            el.style.display = 'none'; 
            if(el.tagName === 'OPTION') el.disabled = true; // Doble bloqueo si es un <select>
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    enforcePermissions();
});

// Ejecutar automáticamente al cargar cualquier pantalla
document.addEventListener('DOMContentLoaded', () => {
    enforcePermissions();
});
// ==========================================
// TARJETA DE DETALLES DE USUARIO (GLOBAL)
// ==========================================
// ==========================================
// TARJETA DE DETALLES DE USUARIO (GLOBAL)
// ==========================================
window.showUserDetails = function(id, name, email, role, avatarUrl = null) {
    let modal = document.getElementById('global-user-modal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'global-user-modal';
        modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center hidden opacity-0 transition-opacity duration-300';
        document.body.appendChild(modal);
    }

    // 1. LÓGICA DE SEGURIDAD VISUAL
    const currentUserId = parseInt(localStorage.getItem('user_id') || '0');
    const protectedIds = [1, 2, 5];
    const targetId = parseInt(id);
    
    const isUntouchable = protectedIds.includes(targetId);
    const isMe = (targetId === currentUserId);
    
    // Solo permitimos editar la foto si NO es del núcleo, o si es del núcleo y ERES TÚ.
    const canEditPhoto = (!isUntouchable || isMe);

    // 2. CONSTRUCCIÓN CONDICIONAL DE LA CÁMARA
    const fileInputHtml = canEditPhoto ? `<input type="file" id="gu-avatar-input" class="hidden" accept="image/png, image/jpeg, image/webp" onchange="handleAvatarUpload(event)">` : '';
    
    const cameraButtonHtml = canEditPhoto ? `
        <label for="gu-avatar-input" class="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-slate-900 transition-colors" title="Cambiar Foto">
            <i class="fas fa-camera text-xs"></i>
        </label>
    ` : '';

    // 3. REDIBUJAR EL MODAL (Para que no se queden botones pegados de clics anteriores)
    modal.innerHTML = `
        <div class="bg-slate-900 border border-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl transform scale-95 transition-transform duration-300" id="global-user-content">
            <div class="flex justify-end">
                <button onclick="closeUserDetails()" class="text-gray-500 hover:text-red-500 transition-colors"><i class="fas fa-times text-xl"></i></button>
            </div>
            
            <div class="text-center mt-2 mb-8">
                <input type="hidden" id="gu-user-id" value="${id}">
                ${fileInputHtml}
                
                <div class="relative w-24 h-24 mx-auto mb-5">
                    <div class="w-full h-full bg-gradient-to-br from-blue-600/20 to-transparent rounded-full border border-blue-500/30 shadow-inner flex items-center justify-center overflow-hidden">
                        <img id="gu-avatar-img" src="" class="w-full h-full object-cover hidden" alt="Avatar">
                        <div id="gu-avatar-icon" class="text-blue-500 text-4xl transition-opacity">
                            <i class="fas fa-user-astronaut"></i>
                        </div>
                    </div>
                    ${cameraButtonHtml}
                </div>

                <h2 id="gu-name" class="text-2xl font-black text-white">${name}</h2>
                <p id="gu-email" class="text-sm text-gray-400 mt-1 font-mono tracking-wide">${email || 'Sin correo registrado'}</p>
            </div>
            
            <div class="bg-slate-950 rounded-xl p-5 border border-gray-800 flex justify-between items-center shadow-inner">
                <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nivel de Autoridad</span>
                <span id="gu-role" class="bg-blue-600/20 text-blue-400 font-bold px-3 py-1 rounded-lg text-xs uppercase tracking-wider">${role || 'Operador'}</span>
            </div>
        </div>
    `;

    // Control de la imagen
    const imgEl = document.getElementById('gu-avatar-img');
    const iconEl = document.getElementById('gu-avatar-icon');
    
    if (avatarUrl && avatarUrl !== 'null' && avatarUrl !== 'undefined') {
        imgEl.src = avatarUrl;
        imgEl.classList.remove('hidden');
        iconEl.classList.add('hidden');
    } else {
        imgEl.src = '';
        imgEl.classList.add('hidden');
        iconEl.classList.remove('hidden');
    }

    // Animación de entrada
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('global-user-content').classList.remove('scale-95');
    }, 10);
};

window.closeUserDetails = function() {
    const modal = document.getElementById('global-user-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        document.getElementById('global-user-content').classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
};

window.handleAvatarUpload = async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const userId = document.getElementById('gu-user-id').value;
    const token = localStorage.getItem('honda_token');
    const imgEl = document.getElementById('gu-avatar-img');
    const iconEl = document.getElementById('gu-avatar-icon');

    try {
        iconEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        imgEl.classList.add('hidden');
        iconEl.classList.remove('hidden');

        // Comprimimos la imagen con la librería que ya tienes instalada
        const compressionOptions = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };
        const compressedFile = await imageCompression(file, compressionOptions);

        const formData = new FormData();
        formData.append('avatar', compressedFile, compressedFile.name);

        // Usamos POST en lugar de PUT porque FormData y archivos en Laravel a veces chocan con PUT
        const response = await fetch(`${window.APP_API_URL}/users/${userId}/avatar`, {
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.status) {
            imgEl.src = data.avatar_url;
            imgEl.classList.remove('hidden');
            iconEl.classList.add('hidden');
            
            // Si te editaste a ti mismo, actualiza tu avatar en la barra superior
            if (data.is_me && document.getElementById('navbar-user-avatar')) {
                document.getElementById('navbar-user-avatar').innerHTML = `<img src="${data.avatar_url}" class="w-full h-full rounded-full object-cover">`;
                document.getElementById('navbar-user-avatar').classList.add('p-0', 'border-0'); // Ajuste visual
            }
            // Recargar tabla si estamos en la vista de configuración
            if(typeof loadUsers === 'function') loadUsers(); 
            showAppAlert("¡Listo!", "Foto de perfil actualizada correctamente.", "success");
        } else {
            showAppAlert("Atención", data.message || 'Error al subir la imagen.', "warning");
            iconEl.innerHTML = '<i class="fas fa-user-astronaut"></i>'; 
        }
    } catch (error) {
        console.error(error);
        showAppAlert("Error de Red", "Fallo al subir la imagen al servidor.", "error");
        iconEl.innerHTML = '<i class="fas fa-user-astronaut"></i>'; 
    } finally {
        e.target.value = ''; 
    }
};