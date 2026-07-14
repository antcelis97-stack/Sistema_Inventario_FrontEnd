const API_BASE_URL = 'https://sistema-inventario-ltei.onrender.com/api';// http://127.0.0.1:8000/api para el local, https://sistema-inventario-ltei.onrender.com/api para el servidor en Render
let allMovements = []; // Base de datos local

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // SEGURIDAD: Ocultar botón CSV a Operadores
    // ==========================================
    const userRole = localStorage.getItem('user_role') || 'Operador';
    const btnImportCsv = document.getElementById('btn-import-csv');
    if (userRole === 'Operador' && btnImportCsv) {
        btnImportCsv.style.display = 'none';
    }
    // 1. Inyectar el filtro de HTML crudo en la pantalla
    injectFilterUI();
    //Transformar el select a diseño moderno una vez que ya existe en el DOM
    if (typeof initCustomSelects === 'function') {
        initCustomSelects();
    }
    // 2. Traer los datos de la tabla
    fetchMovements();
    
    const csvForm = document.getElementById('csv-form');
    if (csvForm) csvForm.addEventListener('submit', submitCsvImport);
});

function injectFilterUI() {
    // Busca el header o título de la tabla e inyecta el select al lado
    const headerRow = document.querySelector('h2.text-3xl')?.parentElement;
    if (headerRow && !document.getElementById('filter-type')) {
        headerRow.innerHTML += `
        <div class="mt-4 sm:mt-0 flex items-center gap-3">
            <label class="text-xs font-bold text-gray-500 uppercase">Clasificación:</label>
            <select id="filter-type" onchange="applyMovementFilters()" class="bg-slate-900 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-red-500 shadow-md [color-scheme:dark]">
                <option value="Todos" class="bg-slate-900 text-white">Todos</option>
                <option value="Entradas" class="bg-slate-900 text-white">Entradas Libres</option>
                <option value="Salidas" class="bg-slate-900 text-white">Salidas Libres</option>
                <option value="Devoluciones" class="bg-slate-900 text-white">Devoluciones (Enviadas/Recibidas)</option>
                <option value="Ajustes" class="bg-slate-900 text-white">Ajustes (Cambios/Reembolsos/Rechazos)</option>
            </select>
        </div>`;
        headerRow.classList.add('flex', 'justify-between', 'items-end');
    }
}

async function fetchMovements() {
    const token = localStorage.getItem('honda_token');
    const tbody = document.getElementById('movements-body');

    try {
        const response = await fetch(`${API_BASE_URL}/movements`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        allMovements = await response.json();
        applyMovementFilters(); // Renderiza usando el filtro actual
    } catch (error) {
        console.error('Error al cargar movimientos:', error);
        if(tbody) tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-red-500">Error de conexión.</td></tr>';
    }
}

function applyMovementFilters() {
    const typeVal = document.getElementById('filter-type') ? document.getElementById('filter-type').value : 'Todos';

    const filtered = allMovements.filter(mov => {
        // Excluir SIEMPRE los STATUS_LOG (Habilitar/Inhabilitar) de esta pantalla
        if (mov.type === 'STATUS_LOG') return false;

        const razon = mov.reason || '';
        const isDevolucion = razon.includes('Devolución') || mov.reason === 'Esperando Resolución de Proveedor'; 
        const isAjuste = razon.includes('Ajuste') || mov.status === 'rejected' || parseFloat(mov.refund_amount) > 0;

        if (typeVal === 'Todos') return true;
        if (typeVal === 'Entradas') return (mov.type === 'IN') && !isDevolucion && !isAjuste;
        if (typeVal === 'Salidas') return (mov.type === 'OUT') && !isDevolucion && !isAjuste;
        if (typeVal === 'Devoluciones') return isDevolucion;
        if (typeVal === 'Ajustes') return isAjuste;
        
        return true;
    });

    renderMovementsTable(filtered);
}

function renderMovementsTable(data) {
    const tbody = document.getElementById('movements-body');
    const userRole = localStorage.getItem('user_role');
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-8 text-gray-500">No hay movimientos con este filtro.</td></tr>';
        return;
    }

    data.forEach(mov => {
        const date = new Date(mov.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
        
        const isEntry = mov.type === 'IN';
        const typeClass = isEntry ? 'text-green-500 bg-green-500/10 border border-green-500/40' : 'text-red-500 bg-red-500/10 border border-red-500/40';
        const typeLabel = isEntry ? '<i class="fas fa-arrow-down mr-1"></i> ENTRADA' : '<i class="fas fa-arrow-up mr-1"></i> SALIDA';

        let statusBadge = '';
        let rowStyle = '';

        if (mov.status === 'pending') {
            if (userRole === 'Administrador' || userRole === 'Supervisor') {
                statusBadge = `<button onclick="window.location.href='approvals.html'" class="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase hover:bg-yellow-500 hover:text-slate-900 transition-all w-full cursor-pointer">
                    <i class="fas fa-clock fa-spin-pulse mr-1"></i> PENDIENTE
                </button>`;
            } else {
                statusBadge = `<span class="bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase flex justify-center w-full">EN REVISIÓN</span>`;
            }
        } else if (mov.status === 'rejected') {
            rowStyle = 'opacity-50 grayscale'; 
            statusBadge = `<span class="bg-red-900/50 text-red-400 border border-red-800 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase flex justify-center w-full">RECHAZADO</span>`;
        } else {
            statusBadge = `<span class="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase flex justify-center w-full">APROBADO</span>`;
        }

        // MAKER-CHECKER (Creador y Aprobador)
        const creatorName = mov.user ? mov.user.name : 'Sistema';
        let approverName = 'En espera...';
        let approverColor = 'text-yellow-500';

        if (mov.status === 'approved' || mov.status === 'rejected') {
            // Si Laravel mandó el objeto approver, lo usamos; si no, asumimos que fue el creador si se aprobó
            approverName = mov.approver ? mov.approver.name : (mov.status === 'approved' ? creatorName : 'Sistema');
            approverColor = mov.status === 'rejected' ? 'text-red-500' : 'text-green-500';
        }

        const userHtml = `
            <div class="flex flex-col">
                <span class="text-sm text-blue-400 font-bold uppercase tracking-wider" title="Realizó el movimiento">
                    <i class="fas fa-user-edit mr-1 text-[10px]"></i> ${creatorName}
                </span>
                <span class="text-[10px] text-gray-400 mt-0.5" title="Autorizó el movimiento">
                    <i class="fas fa-check-double mr-1 ${approverColor}"></i> ${approverName}
                </span>
            </div>
        `;

        let reasonHtml = `<div class="flex flex-col gap-1">
            <span class="italic truncate" title="${mov.reason}">${mov.reason}</span>`;
            
        if (mov.refund_amount > 0) {
            reasonHtml += `<span class="text-[10px] text-emerald-400 font-bold tracking-wider"><i class="fas fa-file-invoice-dollar mr-1"></i>Folio: ${mov.refund_folio}</span>`;
        }
        if (mov.photo_1_url) {
            reasonHtml += `<button onclick="openPhotoModal('${mov.photo_1_url}')" class="text-blue-400 hover:text-white mt-1 flex items-center gap-1 text-[10px] bg-blue-900/30 px-2 py-1 rounded w-max"><i class="fas fa-camera"></i> Ver Foto</button>`;
        }
        reasonHtml += `</div>`;

        tbody.innerHTML += `
            <tr class="border-b border-gray-800 hover:bg-slate-800/50 transition ${rowStyle}">
                <td class="p-4 text-xs text-gray-400">${date}</td>
                <td class="p-4 font-bold text-gray-200">
                    ${mov.spare_part ? mov.spare_part.name : 'Refacción eliminada'}<br>
                    <span class="text-[10px] text-red-500 font-mono tracking-widest">${mov.spare_part ? mov.spare_part.sku : ''}</span>
                </td>
                <td class="p-4"><span class="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold ${typeClass}">${typeLabel}</span></td>
                <td class="p-4 font-black text-lg text-white">${mov.quantity}</td>
                <td class="p-4">${userHtml}</td>
                <td class="p-4 text-xs text-gray-400 max-w-[200px]">${reasonHtml}</td>
                <td class="p-4 align-middle">${statusBadge}</td>
            </tr>
        `;
    });
}
// ==========================================
// 3. IMPORTACIÓN MASIVA VÍA CSV
// ==========================================
function openCsvModal() {
    document.getElementById('csv-modal').classList.remove('hidden');
    const fileInput = document.getElementById('csv-file');
    if(fileInput) fileInput.value = '';
}

function closeCsvModal() {
    document.getElementById('csv-modal').classList.add('hidden');
}

async function submitCsvImport(e) {
    e.preventDefault();
        
    const fileInput = document.getElementById('csv-file');
    if (!fileInput || !fileInput.files.length) {
        showAppAlert("Atención", 'Por favor selecciona un archivo CSV.', "warning"); return;
    }

    const file = fileInput.files[0];
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showAppAlert("Error de formato", 'El sistema solo acepta archivos con extensión .csv', "error"); return;
    }

    const btnSubmitCsv = document.getElementById('btn-submit-csv');
    const originalText = btnSubmitCsv.innerHTML;
    btnSubmitCsv.disabled = true;
    btnSubmitCsv.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando CSV...';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const token = localStorage.getItem('honda_token');
        const response = await fetch(`${API_BASE_URL}/import/movements-csv`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.status) {
                if (data.errores && data.errores.length > 0) {
                    showAppAlert("Importación con Advertencias", `El archivo se procesó, pero hubo ${data.errores.length} registros omitidos. Revisa la consola.`, "warning");
                } else {
                    showAppAlert("¡Éxito!", data.message, "success");
                }
                closeCsvModal();
                fetchMovements(); 
            } else {
                showAppAlert("Error", data.message || 'Error al procesar el archivo.', "error");
            }
        } catch (error) {
            showAppAlert("Fallo Crítico", "Error de conexión con el servidor. Verifica que Laravel esté corriendo.", "error");
        } finally {
        btnSubmitCsv.disabled = false;
        btnSubmitCsv.innerHTML = originalText;
    }
}
// ==========================================
// 4. VISOR DE FOTOGRAFÍAS A PANTALLA COMPLETA
// ==========================================
window.openPhotoModal = function(url) {
    const modal = document.getElementById('photo-modal');
    document.getElementById('photo-viewer-img').src = url;
    document.getElementById('photo-download-btn').href = url;
    
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
}

window.closePhotoModal = function() {
    const modal = document.getElementById('photo-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('photo-viewer-img').src = '';
    }, 300);
}