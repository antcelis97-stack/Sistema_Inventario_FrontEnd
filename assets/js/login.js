/**
 * login.js - Lógica del Portal Empresarial y Autenticación Segura
 * Controla el acceso, la sesión de 24 hrs y la prevención del autocompletado nativo.
 */

let pendingTargetUrl = '';

function checkSession() {
    const token = localStorage.getItem('honda_token');
    const sessionStart = localStorage.getItem('session_start');
    
    if (!token || !sessionStart) return false;

    const now = new Date().getTime();
    const diff = now - parseInt(sessionStart);
    if (diff > (24 * 60 * 60 * 1000)) {
        localStorage.clear();
        return false;
    }
    return true; 
}

function initPortal() {
    const hasSession = checkSession();
    const welcomeMessage = document.getElementById('welcomeMessage');
    const portalLogoutBtn = document.getElementById('portalLogoutBtn');
    const portalUserName = document.getElementById('portalUserName');

    if (hasSession) {
        if (welcomeMessage) welcomeMessage.classList.remove('hidden');
        if (portalLogoutBtn) portalLogoutBtn.classList.remove('hidden');
        if (portalUserName) {
            const fullName = localStorage.getItem('user_name') || 'Usuario';
            portalUserName.innerText = fullName.split(' ')[0];
        }
    } else {
        if (welcomeMessage) welcomeMessage.classList.add('hidden');
        if (portalLogoutBtn) portalLogoutBtn.classList.add('hidden');
    }
}

// Interceptor del clic en las tarjetas del menú
window.accessModule = function(url) {
    if (checkSession()) {
        window.location.href = url;
    } else {
        pendingTargetUrl = url;
        showLoginModal();
    }
};

function showLoginModal() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.classList.remove('hidden');
        setTimeout(() => {
            loginModal.classList.remove('opacity-0', 'translate-y-10');
        }, 10);
    }
}

window.closeLoginModal = function() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        // FORZAR CIERRE DE LA CAJA DE AUTOCOMPLETADO DEL NAVEGADOR
        document.getElementById('email').blur();
        document.getElementById('password').blur();

        loginModal.classList.add('opacity-0', 'translate-y-10');
        setTimeout(() => {
            loginModal.classList.add('hidden');
            document.getElementById('loginForm').reset();
            document.getElementById('statusMessage').classList.add('hidden');
        }, 500);
    }
};

// Lógica del Formulario
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const statusMessage = document.getElementById('statusMessage');
        const btnLogin = document.getElementById('btnLogin');

        statusMessage.className = 'text-center text-xs font-medium text-gray-400 block mt-4 bg-slate-950 p-3 rounded-lg border border-gray-800';
        statusMessage.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Verificando credenciales...';
        btnLogin.disabled = true;

        try {
            const response = await fetch('http://127.0.0.1:8000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                statusMessage.className = 'text-center text-xs font-medium text-green-500 block mt-4 bg-slate-950 p-3 rounded-lg border border-green-900/30';
                statusMessage.innerText = '¡Acceso Concedido!';
            
                localStorage.setItem('honda_token', data.token || data.access_token);
                localStorage.setItem('session_start', new Date().getTime().toString());
                localStorage.setItem('user_permissions', JSON.stringify(data.user.permissions || []));
                
                if (data.user) {
                    localStorage.setItem('user_id', data.user.id);
                    localStorage.setItem('user_role', data.user.role || 'Operador'); 
                    localStorage.setItem('user_name', data.user.name || 'Usuario'); 
                }

                // Limpiar el foco por si acaso el navegador intenta guardar la contraseña y molesta la UI
                document.getElementById('email').blur();
                document.getElementById('password').blur();

                setTimeout(() => {
                    window.location.href = pendingTargetUrl || 'pages/main.html';
                }, 600);

            } else {
                statusMessage.className = 'text-center text-xs font-medium text-red-500 block mt-4 bg-slate-950 p-3 rounded-lg border border-red-900/30';
                statusMessage.innerText = data.message || 'Credenciales inválidas';
                btnLogin.disabled = false;
            }
        } catch (error) {
            console.error("Error en login:", error);
            statusMessage.className = 'text-center text-xs font-medium text-red-500 block mt-4 bg-slate-950 p-3 rounded-lg border border-red-900/30';
            statusMessage.innerText = 'Error interno de conexión.';
            btnLogin.disabled = false;
        }
    });
}

window.logout = function() {
    localStorage.clear();
    window.location.reload(); 
};
// Lógica para Mostrar/Ocultar Contraseña
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const passwordInput = document.getElementById('password');
const togglePasswordIcon = document.getElementById('togglePasswordIcon');

if (togglePasswordBtn && passwordInput && togglePasswordIcon) {
    togglePasswordBtn.addEventListener('click', function () {
        // Alternar el tipo de input entre 'password' y 'text'
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Alternar el ícono de FontAwesome (ojo / ojo tachado)
        togglePasswordIcon.classList.toggle('fa-eye');
        togglePasswordIcon.classList.toggle('fa-eye-slash');
    });
}

// Además, cuando cerremos el modal, asegurémonos de ocultar la contraseña de nuevo si se quedó abierta
const originalCloseModal = window.closeLoginModal;
window.closeLoginModal = function() {
    originalCloseModal(); // Ejecuta lo que ya tenías
    if (passwordInput && passwordInput.getAttribute('type') === 'text') {
        passwordInput.setAttribute('type', 'password');
        togglePasswordIcon.classList.add('fa-eye');
        togglePasswordIcon.classList.remove('fa-eye-slash');
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPortal);
} else {
    initPortal();
}

// ==========================================
// MODAL DE SOPORTE TÉCNICO (PORTAL INICIO)
// ==========================================
window.openPortalSupportModal = function() {
    const modal = document.getElementById('support-modal');
    if (!modal) {
        console.error("El modal de soporte no ha sido cargado aún.");
        return;
    }
    
    // Forzamos la visibilidad
    modal.style.display = 'flex'; 
    modal.classList.remove('hidden');
    modal.classList.remove('pointer-events-none')
    
    // Pequeño timeout para que CSS pueda procesar el cambio de estado
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.remove('translate-y-10');
    }, 50);
};

window.closePortalSupportModal = function() {
    const modal = document.getElementById('support-modal');
    if (modal) {
        modal.classList.add('opacity-0', 'translate-y-10');
        // Esperamos a que termine la transición CSS para ocultarlo completamente
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 500);
    }
};

// ==========================================
// INYECCIÓN NATIVA DEL MODAL DE SOPORTE
// ==========================================
async function loadSupportModal() {
    try {
        const placeholder = document.getElementById('support-modal-placeholder');
        if (!placeholder) return;
        
        const response = await fetch('components/support-modal.html'); 
        if (response.ok) {
            const html = await response.text();
            placeholder.innerHTML = html;
        } else {
            console.error("Error 404: No se encontró el componente support-modal.html en la raíz.");
        }
    } catch (error) {
        console.error("Error inyectando modal:", error);
    }
}

// Inicializador modificado para cargar la sesión y el modal simultáneamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initPortal();
        loadSupportModal();
    });
} else {
    initPortal();
    loadSupportModal();
}

// ==========================================
// MODAL DE SOPORTE TÉCNICO (PORTAL INICIO)
// ==========================================
window.openPortalSupportModal = function() {
    const modal = document.getElementById('support-modal');
    if (!modal) {
        console.error("El modal de soporte no ha sido inyectado en el DOM.");
        return;
    }
    
    // Forzamos la visibilidad (cambiamos hidden por flex)
    modal.classList.remove('hidden');
    modal.classList.add('flex'); 
    modal.classList.remove('pointer-events-none');
    
    // Pequeño timeout para la animación de opacidad
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.remove('translate-y-10');
    }, 50);
};

window.closePortalSupportModal = function() {
    const modal = document.getElementById('support-modal');
    if (modal) {
        modal.classList.add('opacity-0', 'translate-y-10');
        
        // Esperamos a que termine la transición CSS (300ms) para ocultarlo
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            modal.classList.add('pointer-events-none');
        }, 300);
    }
};

// 1. Alias para que el botón de la "X" del HTML funcione en el index
window.closeSupportModal = window.closePortalSupportModal;

// 2. Escuchador global para cerrar al dar clic fuera del contenido (en el fondo oscuro)
document.addEventListener('click', (e) => {
    const modal = document.getElementById('support-modal');
    
    // Verificamos si el modal existe, si está visible, y si el clic fue EXACTAMENTE en el fondo oscuro
    if (modal && !modal.classList.contains('hidden') && e.target === modal) {
        closePortalSupportModal();
    }
});