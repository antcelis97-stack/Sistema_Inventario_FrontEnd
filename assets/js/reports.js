// assets/js/reports.js
let currentReportData = [];
const currencyFormatter = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

// ==========================================
// HELPER: Validador de Permisos Seguro
// ==========================================
function canAccessReport(permId) {
    // Si la función global existe, la usamos
    if (typeof hasPermission === 'function') return hasPermission(permId);
    
    // Si no, verificamos manualmente desde el Storage
    const role = localStorage.getItem('user_role');
    if (role === 'Administrador' || role === 'Supervisor') return true;
    try {
        const perms = JSON.parse(localStorage.getItem('user_permissions')) || [];
        return perms.includes(permId);
    } catch(e) { 
        return false; 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    const typeSelect = document.getElementById('report-type');
    let hasAnyReportPerm = false;

    // 1. FILTRAMOS LAS OPCIONES ANTES DEL DISEÑO VISUAL
    if (typeSelect) {
        // Mapeamos los valores del <select> a los IDs de tu matriz de permisos
        const permMap = {
            'all': 'reports_all',
            'in': 'reports_in',
            'out': 'reports_out',
            'adjustments': 'reports_adjustments',
            'returns': 'reports_returns'
        };

        // Recorremos las opciones y eliminamos las que no tienen permiso
        Array.from(typeSelect.options).forEach(opt => {
            const requiredPerm = permMap[opt.value];
            if (requiredPerm && !canAccessReport(requiredPerm)) {
                opt.remove(); // Quitamos la opción del HTML
            } else {
                hasAnyReportPerm = true; // Tiene al menos 1 permiso
            }
        });

        // Seleccionamos por defecto la primera opción disponible 
        if (typeSelect.options.length > 0) {
            typeSelect.selectedIndex = 0;
        }
    }

    // 2. AHORA SÍ inicializamos el estilo del menú desplegable
    if (typeof initCustomSelects === 'function') initCustomSelects();
    
    const userRole = localStorage.getItem('user_role') || 'Operador';

    // 3. BLOQUEO VISUAL: Ocultar métricas financieras (Solo Admins/Supervisores)
    if (userRole === 'Operador') {
        const financialHeader = document.getElementById('financial-header');
        const financialCards = document.getElementById('financial-cards-wrapper');
        if (financialHeader) financialHeader.style.display = 'none';
        if (financialCards) financialCards.style.display = 'none';
    } else {
        fetchFinancialDashboard();
    }

    // 4. BLOQUEO LÓGICO DEL BOTÓN BUSCAR
    const btnSearch = document.getElementById('btn-search');
    const btnExport = document.getElementById('btn-export');
    const formInputs = document.querySelectorAll('#report-form input, #report-form select');

    // Solo bloqueamos la barra si de verdad NO tiene ningún permiso de reporte
    if (!hasAnyReportPerm) {
        formInputs.forEach(input => {
            input.disabled = true;
            input.classList.add('opacity-50', 'cursor-not-allowed');
        });

        if (btnSearch) {
            btnSearch.disabled = true;
            btnSearch.innerHTML = '<i class="fas fa-lock mr-1"></i> Bloqueado';
            btnSearch.classList.replace('bg-blue-600', 'bg-slate-800');
            btnSearch.classList.replace('hover:bg-blue-700', 'hover:bg-slate-800');
            btnSearch.classList.replace('text-white', 'text-gray-500');
            btnSearch.classList.remove('shadow-blue-500/20');
        }
        if (btnExport) btnExport.disabled = true;
    }

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('date-start').value = firstDay.toISOString().split('T')[0];
    document.getElementById('date-end').value = today.toISOString().split('T')[0];

    const reportForm = document.getElementById('report-form');
    if (reportForm) reportForm.addEventListener('submit', handleReportGeneration);

    if (btnExport) btnExport.addEventListener('click', exportToExcel);
});

async function fetchFinancialDashboard() {
    const token = localStorage.getItem('honda_token');
    try {
        const response = await fetch(`${window.APP_API_URL}/reports/financial`, {
            method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        const json = await response.json();
        if (response.ok && json.status) {
            renderFinancialMetrics(json.data.financials);
        }
    } catch (error) { console.error("Fallo de red:", error); }
}

function renderFinancialMetrics(financials) {
    const elAsset = document.getElementById('metric-asset');
    const elSales = document.getElementById('metric-sales');
    const elProfit = document.getElementById('metric-profit');
    const elMargin = document.getElementById('metric-margin');

    if (elAsset) elAsset.innerText = currencyFormatter.format(financials.total_asset);
    if (elSales) elSales.innerText = currencyFormatter.format(financials.projected_sales);
    if (elProfit) elProfit.innerText = currencyFormatter.format(financials.projected_profit);
    if (elMargin) elMargin.innerText = `${financials.margin_percentage}%`;
}

async function handleReportGeneration(e) {
    e.preventDefault(); 
    
    // 5. VALIDACIÓN DE PERMISO ESPECÍFICO EN TIEMPO REAL
    const selectedType = document.getElementById('report-type').value;
    const permMap = {
        'all': 'reports_all',
        'in': 'reports_in',
        'out': 'reports_out',
        'adjustments': 'reports_adjustments',
        'returns': 'reports_returns'
    };
    
    const requiredPerm = permMap[selectedType];

    if (requiredPerm && !canAccessReport(requiredPerm)) {
        showAppAlert("Acceso Denegado", "Tu rol no tiene permisos para generar este reporte específico.", "error");
        return;
    }

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const originalContent = btnSubmit.innerHTML;
    const btnExport = document.getElementById('btn-export');

    const payload = {
        start_date: document.getElementById('date-start').value,
        end_date: document.getElementById('date-end').value,
        type: selectedType
    };

    if (!payload.start_date || !payload.end_date) {
        showAppAlert("Fechas inválidas", "Por favor selecciona un rango de fechas.", "warning"); return;
    }

    btnSubmit.disabled = true; btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btnExport.disabled = true;

    try {
        const token = localStorage.getItem('honda_token');
        const response = await fetch(`${window.APP_API_URL}/reports/generate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (response.ok && data.status) {
            currentReportData = data.data; 
            renderResults(data.data);
            document.getElementById('results-container').classList.remove('hidden');
            document.getElementById('results-count').innerText = `${data.count} registros`;
            if (data.count > 0) btnExport.disabled = false;
        } else {
            showAppAlert("Error", data.message || 'Error al generar el reporte.', "error");
        }
    } catch (error) {
        showAppAlert("Error de Red", "Fallo al conectar con el servidor.", "error");
    } finally {
        btnSubmit.disabled = false; btnSubmit.innerHTML = originalContent;
    }
}

function renderResults(movements) {
    const tbody = document.getElementById('report-results-body');
    tbody.innerHTML = '';

    if (movements.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500 text-sm">No se encontraron movimientos.</td></tr>`;
        return;
    }

    movements.forEach(mov => {
        const date = new Date(mov.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
        const typeClass = mov.type === 'IN' ? 'text-green-500 bg-green-500/10 px-2 py-1 rounded' : 'text-red-500 bg-red-500/10 px-2 py-1 rounded';
        const typeLabel = mov.type === 'IN' ? 'ENTRADA' : 'SALIDA';

        let extraBadges = '';
        
        if (mov.refund_folio) {
            extraBadges += `<br><span class="inline-block mt-1 bg-emerald-900/30 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[9px] font-bold tracking-wide">
                                <i class="fas fa-file-invoice-dollar mr-1"></i> Folio: ${mov.refund_folio} | $${parseFloat(mov.refund_amount).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                              </span>`;
        }

        const photoUrl = mov.photo_1_url || mov.photo_1 || mov.evidence_photo;
        if (photoUrl && (typeof hasPermission === 'function' ? hasPermission('view_evidence') : true)) {
            extraBadges += `<br><button onclick="openPhotoModal('${photoUrl}')" class="text-blue-400 hover:text-white mt-1.5 flex items-center gap-1 text-[10px] bg-blue-900/30 border border-blue-800/50 hover:bg-blue-600 px-2 py-1 rounded w-max transition-all shadow-sm">
                                <i class="fas fa-camera"></i> Ver Evidencia
                            </button>`;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-slate-800/50 transition">
                <td class="p-3 text-xs text-gray-400 whitespace-nowrap">${date}</td>
                <td class="p-3">
                    <p class="font-bold text-white text-xs">${mov.spare_part ? mov.spare_part.name : 'Eliminada'}</p>
                    <p class="text-[10px] text-gray-500 font-mono">SKU: ${mov.spare_part ? mov.spare_part.sku : '---'}</p>
                </td>
                <td class="p-3 font-black text-[10px] ${typeClass}">${typeLabel}</td>
                <td class="p-3 font-bold text-white text-sm text-center">${mov.quantity}</td>
                <td class="p-3 text-[10px] text-gray-400 max-w-[250px] truncate" title="${mov.reason}">
                    <span class="text-blue-400 mr-1 font-bold">@${mov.user ? mov.user.name : 'Sistema'}</span>
                    ${mov.reason}
                    ${extraBadges}
                </td>
            </tr>
        `;
    });
}

function exportToExcel() {
    if (currentReportData.length === 0) return;
    
    // El bloqueo estricto se removió aquí: Si el usuario llegó a este punto
    // significa que ya superó la validación del "handleReportGeneration".
    
    let csvContent = "Fecha,SKU,Refaccion,Tipo,Cantidad,Usuario,Motivo,Monto Reembolsado,Folio / NC\n";
    currentReportData.forEach(mov => {
        const date = new Date(mov.created_at).toLocaleString('es-MX').replace(',', '');
        const sku = mov.spare_part ? mov.spare_part.sku : 'N/A';
        const name = mov.spare_part ? `"${mov.spare_part.name}"` : 'N/A'; 
        const type = mov.type === 'IN' ? 'Entrada' : 'Salida';
        const user = mov.user ? mov.user.name : 'Sistema';
        const reason = `"${mov.reason}"`; 
        const refundAmount = mov.refund_amount ? mov.refund_amount : '0.00';
        const refundFolio = mov.refund_folio ? `"${mov.refund_folio}"` : 'N/A';
        csvContent += `${date},${sku},${name},${type},${mov.quantity},${user},${reason},${refundAmount},${refundFolio}\n`;
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Inventario_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

// ==========================================
// VISOR DE FOTOGRAFÍAS DE EVIDENCIA
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