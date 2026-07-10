// ==========================================
// 1. VARIABLES GLOBALES Y CONFIGURACIÓN
// ==========================================
let allProducts = [];
let viewingInactive = false; 
const API_BASE_URL = 'http://127.0.0.1:8000/api';

document.addEventListener('DOMContentLoaded', () => {
    initCustomSelects();
    // ==========================================
    // SEGURIDAD: Ocultar botón CSV a Operadores
    // ==========================================
    const userRole = localStorage.getItem('user_role') || 'Operador';
    const btnImportCsv = document.getElementById('btn-import-catalog-csv');
    if (userRole === 'Operador' && btnImportCsv) {
        btnImportCsv.style.display = 'none';
    }

    fetchInventory();

    const searchInput = document.getElementById('search-inventory');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
});

// ==========================================
// 2. FUNCIÓN PRINCIPAL: CARGAR INVENTARIO
// ==========================================
async function fetchInventory() {
    const token = localStorage.getItem('honda_token');
    const tbody = document.getElementById('inventory-body');

    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center p-8 text-gray-400"><i class="fas fa-spinner fa-spin mr-2 text-red-500"></i>Sincronizando existencias...</td></tr>';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/spare-parts`, { 
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        const json = await response.json();

        if (response.ok && json.status) {
            allProducts = json.data; 
            populateCategoryFilter(allProducts);
            applyFilters(); 
        } else {
            if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center p-8 text-red-500">Error en el mapeo de respuesta de refacciones.</td></tr>';
        }
    } catch (error) {
        console.error('Error de red detectado:', error);
        if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center p-8 text-red-500">Fallo de conexión. El servidor de Laravel está apagado.</td></tr>';
    }
}

// ==========================================
// 3. POBLAR FILTROS (CON ORDENAMIENTO NATIVO)
// ==========================================
function populateCategoryFilter(products) {
    const filterSelect = document.getElementById('categoryFilter');
    if (!filterSelect) return; 

    // 1. Agrupar categorías y subcategorías
    const categoryMap = new Map();

    products.forEach(p => {
        const catName = p.category ? p.category.name : 'General';
        const subName = p.subcategory ? p.subcategory.name : null;

        if (!categoryMap.has(catName)) {
            categoryMap.set(catName, new Set());
        }
        if (subName) {
            categoryMap.get(catName).add(subName);
        }
    });

    // 2. ORDENAMIENTO ALFABÉTICO (Forzando "General" al principio)
    const sortedCategories = Array.from(categoryMap.keys()).sort((a, b) => {
        const aGeneral = a.toLowerCase().includes('general');
        const bGeneral = b.toLowerCase().includes('general');
        
        if (aGeneral && !bGeneral) return -1;
        if (!aGeneral && bGeneral) return 1;
        return a.localeCompare(b);
    });

    // 3. Construir el menú desplegable visual
    filterSelect.innerHTML = `<option value="ALL|all">Todas las Categorías</option>`;

    sortedCategories.forEach(catName => {
        filterSelect.innerHTML += `<option value="CAT|${catName}" class="font-bold bg-slate-800 text-white">📦 ${catName.toUpperCase()} (Todo)</option>`;
        
        // Ordenamiento A-Z para las subcategorías (ej. Aceites, Llantas, etc.)
        const sortedSubcats = Array.from(categoryMap.get(catName)).sort((a, b) => a.localeCompare(b));
        
        sortedSubcats.forEach(subName => {
            filterSelect.innerHTML += `<option value="SUB|${subName}">&nbsp;&nbsp;&nbsp;↳ ${subName}</option>`;
        });
    });

    // 4. Transformar diseño
    if (typeof initCustomSelects === 'function') {
        initCustomSelects();
    }
}

// ==========================================
// 4. RENDERIZAR TABLA Y FILTROS
// ==========================================
function applyFilters() {
    const searchTerm = document.getElementById('search-inventory').value.toLowerCase();
    const filterValue = document.getElementById('categoryFilter').value; 
    
    const [filterType, filterName] = filterValue.split('|');

    const filtered = allProducts.filter(part => {
        const matchesSearch = part.name.toLowerCase().includes(searchTerm) || part.sku.toLowerCase().includes(searchTerm);
        
        const catName = part.category ? part.category.name : 'General';
        const subName = part.subcategory ? part.subcategory.name : '';

        let matchesCat = false;
        if (filterType === 'ALL') matchesCat = true;
        else if (filterType === 'CAT') matchesCat = (catName === filterName);
        else if (filterType === 'SUB') matchesCat = (subName === filterName);

        const matchesStatus = viewingInactive ? !part.is_active : part.is_active;

        return matchesSearch && matchesCat && matchesStatus;
    });

    renderInventoryTable(filtered);
}

function renderInventoryTable(products) {
    const tbody = document.getElementById('inventory-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center p-8 text-gray-500">No hay refacciones que coincidan con la búsqueda.</td></tr>';
        return;
    }

    products.forEach(part => {
        const pPurchase = parseFloat(part.purchase_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });
        const pSale = parseFloat(part.sale_price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 });
        
        const isCritical = part.current_stock <= (part.min_stock || 5);
        const stockBadge = isCritical 
            ? `<span class="bg-red-500/10 text-red-500 border border-red-500/30 px-2 py-1 rounded font-black">${part.current_stock}</span>`
            : `<span class="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded font-bold">${part.current_stock}</span>`;

        const isInactive = !part.is_active;
        const rowClass = isInactive ? 'opacity-50 grayscale bg-slate-900/50' : 'hover:bg-slate-800/30';
        const statusBadge = isInactive ? `<span class="bg-red-900/50 text-red-400 border border-red-800 text-[10px] px-2 py-0.5 rounded-full font-bold ml-2">INACTIVO</span>` : '';
        
        const toggleIcon = part.is_active ? 'fa-power-off text-red-400' : 'fa-check text-green-400';
        const toggleTitle = part.is_active ? 'Inhabilitar' : 'Habilitar';

        const imgHtml = part.images
            ? `<img src="${part.images}" loading="lazy" class="w-10 h-10 object-cover rounded shadow-sm border border-gray-700 flex-shrink-0">`
            : `<div class="w-10 h-10 bg-slate-800 border border-gray-700 rounded flex items-center justify-center flex-shrink-0"><i class="fas fa-image text-gray-600"></i></div>`;

        // ==========================================
        // SEGURIDAD: BOTONES DE ACCIÓN EN TABLA
        // ==========================================
        const partData = JSON.stringify(part).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        
        // Botón de Movimiento (Entrada/Salida)
        const movementButton = (hasPermission('create_in') || hasPermission('create_out')) 
            ? (part.is_active 
                ? `<button onclick="openGlobalMovementModal(JSON.parse(this.dataset.part))" data-part="${partData}" title="Registrar Movimiento" class="bg-slate-800 hover:bg-blue-600 border border-gray-700 text-gray-300 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-all font-medium"><i class="fas fa-plus-minus"></i></button>`
                : `<span class="text-[10px] text-gray-600 italic flex items-center px-2">Bloqueado</span>`)
            : '';

        // Botón de Habilitar/Inhabilitar
        const toggleButton = hasPermission('toggle_status') 
            ? `<button onclick="toggleProductStatus(${part.id}, '${part.name.replace(/'/g, "\\'")}')" title="${toggleTitle}" class="bg-slate-800 hover:bg-slate-700 border border-gray-700 text-gray-300 text-xs px-3 py-1.5 rounded-lg transition-all"><i class="fas ${toggleIcon}"></i></button>`
            : '';

        // NUEVO: Botón de Editar (Protegido por permiso específico)
       const editButton = hasPermission('edit_spare_parts')
            ? `<button onclick="window.openCrudModal('${part.sku}')" title="Editar Refacción" class="bg-slate-800 hover:bg-blue-600 border border-gray-700 text-gray-300 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-all"><i class="fas fa-edit"></i></button>`
            : '';
            
        const catName = part.category ? part.category.name : 'General';
        const subName = part.subcategory ? part.subcategory.name : 'Sin subcategoría';

        tbody.innerHTML += `
            <tr class="border-b border-gray-800 transition ${rowClass}">
                <td class="p-4 font-mono text-xs text-red-500 tracking-wider font-bold">${part.sku}</td>
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        ${imgHtml}
                        <div>
                            <span class="font-bold text-white">${part.name}</span>
                            ${statusBadge}
                        </div>
                    </div>
                </td>
                <td class="p-4">
                    <p class="text-sm text-gray-300">${catName}</p>
                    <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">${subName}</p>
                </td>
                <td class="p-4 text-center">${stockBadge}</td>
                <td class="p-4 text-center text-xs text-gray-500">${part.min_stock || 5} / ${part.max_stock || 50}</td>
                <td class="p-4 text-right font-medium text-gray-400">$${pPurchase}</td>
                <td class="p-4 text-right font-bold text-white">$${pSale}</td>
                <td class="p-4 text-center flex justify-center gap-2">
                    ${movementButton}
                    ${toggleButton}
                    ${editButton}
                </td>
            </tr>
        `;
    });
}

// ==========================================
// 5. ALTERNAR VISTA DE INACTIVOS (BOTÓN)
// ==========================================
window.toggleInactiveView = function() {
    viewingInactive = !viewingInactive;
    const btn = document.getElementById('btn-toggle-inactive');
    
    if (viewingInactive) {
        btn.innerHTML = '<i class="fas fa-box text-white mr-2"></i> Ver Catálogo Activo';
        btn.classList.replace('bg-slate-800', 'bg-red-600');
        btn.classList.replace('text-gray-300', 'text-white');
    } else {
        btn.innerHTML = '<i class="fas fa-ban text-red-500 mr-2"></i> Ver Inhabilitados';
        btn.classList.replace('bg-red-600', 'bg-slate-800');
        btn.classList.replace('text-white', 'text-gray-300');
    }
    
    applyFilters();
}

// ==========================================
// 6. INHABILITAR / HABILITAR REFACCIÓN
// ==========================================
// ==========================================
// 6. INHABILITAR / HABILITAR REFACCIÓN
// ==========================================
window.toggleProductStatus = async function(id, currentName) {
    const confirmacion = await Swal.fire({
        title: 'Modificar Estado',
        text: `¿Deseas cambiar el estado de la refacción: "${currentName}"?`,
        icon: 'warning',
        input: 'text',
        inputLabel: 'Motivo del cambio (Obligatorio)',
        inputPlaceholder: 'Escribe aquí la razón de la modificación...',
        showCancelButton: true,
        background: '#0f172a', color: '#f8fafc',
        confirmButtonText: 'Sí, cambiar',
        cancelButtonText: 'Cancelar',
        customClass: { popup: 'border border-gray-800 rounded-2xl shadow-2xl', confirmButton: 'bg-red-600 text-white rounded-xl font-bold px-6 py-2.5 mx-2', cancelButton: 'bg-slate-800 text-white rounded-xl font-bold px-6 py-2.5 mx-2' },
        preConfirm: (reason) => {
            if (!reason || reason.trim() === '') {
                Swal.showValidationMessage('El motivo es obligatorio.');
            }
            return reason;
        }
    });

    if (!confirmacion.isConfirmed) return;

    const token = localStorage.getItem('honda_token');

    try {
        const response = await fetch(`${API_BASE_URL}/spare-parts/${id}/toggle-status`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: confirmacion.value.trim() }) 
        });

        const data = await response.json();

        if (response.ok && data.status) {
            fetchInventory(); 
            showAppAlert("Éxito", data.message, "success");
        } else {
            showAppAlert("Error", data.message || 'Error al cambiar el estado.', "error");
        }
    } catch (error) {
        showAppAlert("Error de red", 'Error de conexión con el servidor.', "error");
    }
}

// ==========================================
// 7. ANIMADOR DE VENTANAS MODALES
// ==========================================
function animateModal(modalId, contentId, show) {
    const modal = document.getElementById(modalId);
    const content = document.getElementById(contentId);
    if (!modal || !content) return;

    if (show) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
        }, 10);
    } else {
        modal.classList.add('opacity-0');
        content.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

// ==========================================
// 8. IMPORTACIÓN MASIVA (CSV)
// ==========================================
window.openSparePartsCsvModal = function() {
    animateModal('csv-catalog-modal', 'csv-catalog-content', true);
    const fileInput = document.getElementById('csv-catalog-file');
    if(fileInput) fileInput.value = '';
}

window.closeSparePartsCsvModal = function() {
    animateModal('csv-catalog-modal', 'csv-catalog-content', false);
}

const csvCatalogForm = document.getElementById('csv-catalog-form');
if (csvCatalogForm) {
    csvCatalogForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById('csv-catalog-file');
        if (!fileInput || !fileInput.files.length) {
            showAppAlert("Atención", 'Por favor selecciona un archivo CSV primero.', "warning");
            return;
        }

        const file = fileInput.files[0];
        const btnSubmitCsv = document.getElementById('btn-submit-catalog-csv');
        const originalText = btnSubmitCsv.innerHTML;
        
        btnSubmitCsv.disabled = true;
        btnSubmitCsv.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Cargando Catálogo...';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('honda_token');
            const response = await fetch(`${API_BASE_URL}/import/spare-parts-csv`, {
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
                    showAppAlert("Importación Parcial", `${data.message}\nOmitimos ${data.errores.length} filas (Revisa la consola F12).`, "warning");
                } else {
                    showAppAlert("¡Listo!", data.message, "success");
                }
                closeSparePartsCsvModal();
                fetchInventory();
            } else {
                showAppAlert("Error", data.message || 'Error al procesar el catálogo en el servidor.', "error");
            }
        } catch (error) {
            showAppAlert("Fallo Crítico", "Error de red. Verifica el estado de tu servidor Laravel.", "error");
        } finally {
            btnSubmitCsv.disabled = false;
            btnSubmitCsv.innerHTML = originalText;
        }
    });
}

// ==========================================
// 10. BUSCADOR EN TIEMPO REAL PARA EL MODAL DE AUDITORÍA
// ==========================================
window.filterStatusLogs = function() {
    const term = document.getElementById('search-status-logs').value.toLowerCase();
    const rows = document.querySelectorAll('#status-logs-body tr.log-row');

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (text.includes(term)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ==========================================
// 9. MODAL: HISTORIAL DE ESTADOS (AUDITORÍA)
// ==========================================
window.openStatusLogsModal = async function() {
    animateModal('status-logs-modal', 'status-logs-content', true);

    const tbody = document.getElementById('status-logs-body');
    const token = localStorage.getItem('honda_token');

    try {
        const response = await fetch(`${API_BASE_URL}/movements/status-logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        tbody.innerHTML = '';
        if (data.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center p-8 text-gray-500">No hay registros de cambios de estado.</td></tr>';
            return;
        }

        data.data.forEach(log => {
            const date = new Date(log.created_at).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
            const part = log.spare_part ? log.spare_part.name : 'Desconocida';
            const sku = log.spare_part ? log.spare_part.sku : '---';
            const user = log.user ? log.user.name : 'Sistema';
            
            const splitReason = log.reason.split(': ');
            const accion = splitReason[0];
            const motivo = splitReason[1] || 'Sin motivo especificado';
            
            const badgeClass = accion.includes('Inhabilitación') ? 'text-red-400 bg-red-900/30 border-red-800' : 'text-green-400 bg-green-900/30 border-green-800';

            tbody.innerHTML += `
                <tr class="hover:bg-slate-800/30 transition border-b border-gray-800 log-row">
                    <td class="p-3 text-xs text-gray-400"><i class="far fa-clock mr-1"></i> ${date}</td>
                    <td class="p-3">
                        <p class="font-bold text-gray-200 text-xs">${part}</p>
                        <p class="text-[10px] text-gray-500 font-mono">SKU: ${sku}</p>
                    </td>
                    <td class="p-3 text-xs text-blue-400 uppercase tracking-wider font-bold"><i class="fas fa-user-edit mr-1"></i> ${user}</td>
                    <td class="p-3">
                        <span class="inline-block px-2 py-0.5 border rounded text-[10px] font-black uppercase tracking-wider mb-1 ${badgeClass}">${accion}</span>
                        <p class="text-xs text-gray-300 italic">"${motivo}"</p>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-8 text-red-500">Error al cargar el historial.</td></tr>';
    }
}

window.closeStatusLogsModal = function() {
    animateModal('status-logs-modal', 'status-logs-content', false);
}