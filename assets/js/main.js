/**
 * main.js - Lógica específica del Dashboard Principal
 * Maneja la visualización de tarjetas, actualización del Navbar y Logout.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Recuperamos los datos de la memoria
    const userName = localStorage.getItem('user_name') || 'Usuario';
    const userRole = localStorage.getItem('user_role') || 'Operador';

    // ==========================================
    // 2. ACTUALIZAR EL NAVBAR
    // ==========================================
    const navNameElement = document.getElementById('navbar-user-name');
    const navRoleElement = document.getElementById('navbar-user-role');
    const navAvatarElement = document.querySelector('.h-10.w-10.rounded-full');
    
    if (navNameElement) navNameElement.innerText = userName;
    if (navRoleElement) navRoleElement.innerText = userRole; 
    
    // Cambia la inicial si el usuario tiene nombre
    if (navAvatarElement && userName !== 'Usuario') {
        navAvatarElement.innerText = userName.charAt(0).toUpperCase();
    }

    // ==========================================
    // 3. CONTROL DE ACCESO BASADO EN ROLES (RBAC)
    // ==========================================
    const cardReports = document.getElementById('card-reports');
    
    if (cardReports) {
        if (userRole === 'Administrador') {
            cardReports.classList.remove('hidden');
        } else {
            cardReports.classList.add('hidden');
        }
    }

    // ==========================================
    // 4. LÓGICA DE CERRAR SESIÓN
    // ==========================================
    const btnLogout = document.getElementById('btn-logout');
    
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.clear(); // Limpiamos todo al salir
            window.location.replace('../index.html'); // Te regresa al login
        });
    }
});