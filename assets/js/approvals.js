// ==========================================
// CONFIGURACIÓN GLOBAL
// ==========================================
const API_BASE_URL = 'http://127.0.0.1:8000/api';
let allPending = [];
let allRejected = [];
let fetchedRejected = false;
let currentTab = 'approvals'; 

document.addEventListener('DOMContentLoaded', () => {
    fetchPendingApprovals();
    initCustomSelects();
});

// ==========================================
// 1. OBTENER DATOS DEL SERVIDOR
// ==========================================
async function fetchPendingApprovals() {
    const container = document.getElementById('approvals-container');
    const token = localStorage.getItem('honda_token');

    try {
        const response = await fetch(`${API_BASE_URL}/movements/pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();

        if (response.ok && data.status) {
            allPending = data.data;
            if(currentTab !== 'rejected') renderCards();
            if (typeof checkPendingApprovals === 'function') checkPendingApprovals();
        } else {
            container.innerHTML = `<div class="col-span-full text-center py-10 text-red-500">Error: ${data.message}</div>`;
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="col-span-full text-center py-10 text-red-500">Error de conexión con el servidor.</div>`;
    }
}

async function fetchRejectedApprovals() {
    const container = document.getElementById('approvals-container');
    const token = localStorage.getItem('honda_token');
    container.innerHTML = `<div class="col-span-full text-center py-20 text-gray-500"><i class="fas fa-spinner fa-spin text-4xl mb-4 text-red-600"></i><p>Cargando historial de rechazados...</p></div>`;

    try {
        const response = await fetch(`${API_BASE_URL}/movements/rejected`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();

        if (response.ok && data.status) {
            allRejected = data.data;
            fetchedRejected = true;
            renderCards();
        } else {
            container.innerHTML = `<div class="col-span-full text-center py-10 text-red-500">Error: ${data.message}</div>`;
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="col-span-full text-center py-10 text-red-500">Error de conexión con el servidor.</div>`;
    }
}

// ==========================================
// 2. SISTEMA DE PESTAÑAS Y RENDERIZADO
// ==========================================
window.switchTab = function(tabName) {
    currentTab = tabName;
    
    const btnApprovals = document.getElementById('tab-approvals');
    const btnProvider = document.getElementById('tab-provider');
    const btnRejected = document.getElementById('tab-rejected');

    const inactiveClass = 'px-6 py-2.5 rounded-md text-gray-400 hover:text-white font-bold text-sm transition-all flex items-center whitespace-nowrap';
    btnApprovals.className = inactiveClass;
    btnProvider.className = inactiveClass;
    btnRejected.className = inactiveClass;

    if (tabName === 'approvals') {
        btnApprovals.className = 'px-6 py-2.5 rounded-md bg-red-600 text-white font-bold text-sm shadow-md transition-all flex items-center whitespace-nowrap';
        renderCards();
    } else if (tabName === 'provider') {
        btnProvider.className = 'px-6 py-2.5 rounded-md bg-blue-600 text-white font-bold text-sm shadow-md transition-all flex items-center whitespace-nowrap';
        renderCards();
    } else if (tabName === 'rejected') {
        btnRejected.className = 'px-6 py-2.5 rounded-md bg-slate-800 text-white font-bold text-sm shadow-md transition-all flex items-center whitespace-nowrap border border-gray-700';
        if (!fetchedRejected) {
            fetchRejectedApprovals();
        } else {
            renderCards();
        }
    }
};

function renderCards() {
    const container = document.getElementById('approvals-container');
    container.innerHTML = '';

    let filtered = [];
    if (currentTab === 'approvals') filtered = allPending.filter(mov => mov.type === 'OUT');
    else if (currentTab === 'provider') filtered = allPending.filter(mov => mov.type === 'IN');
    else if (currentTab === 'rejected') filtered = allRejected;

    if (filtered.length === 0) {
        const icon = currentTab === 'rejected' ? 'fa-folder-open' : 'fa-check-circle';
        const title = currentTab === 'rejected' ? 'Historial Limpio' : '¡Todo al día!';
        const msg = currentTab === 'rejected' ? 'No hay movimientos rechazados en el historial.' : 'No hay casos pendientes en esta bandeja.';
        
        container.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-20 text-gray-500 animate-fade-up">
                <i class="fas ${icon} text-6xl mb-4 text-slate-800"></i>
                <p class="text-xl font-bold text-white mb-2">${title}</p>
                <p>${msg}</p>
            </div>
        `;
        return;
    }

    filtered.forEach(mov => {
        const date = new Date(mov.updated_at || mov.created_at).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });
        const partName = mov.spare_part ? mov.spare_part.name : 'Pieza Desconocida';
        const partSku = mov.spare_part ? mov.spare_part.sku : 'N/A';
        
        let userName = mov.user ? mov.user.name : 'Sistema';
        if (userName === 'Sistema' && mov.parent_movement && mov.parent_movement.user) {
            userName = mov.parent_movement.user.name;
        }
        
        const partNameEscaped = partName.replace(/'/g, "\\'");

        const photoUrl = mov.photo_1 || mov.photo_1_url || mov.evidence_photo || 
                         (mov.parent_movement ? (mov.parent_movement.photo_1_url || mov.parent_movement.photo_1) : null);
        
        let thumbnailsHtml = '';
        if (photoUrl) {
            thumbnailsHtml = `
            <div class="flex gap-2 mt-4">
                <div onclick="viewEvidenceImage('${photoUrl}')" class="h-20 w-24 rounded-lg bg-slate-950 border border-gray-700 cursor-pointer overflow-hidden group relative shadow-md" title="Ampliar Evidencia">
                    <img src="${photoUrl}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300">
                    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 transition-opacity duration-300">
                        <i class="fas fa-search-plus text-white text-xl drop-shadow-md"></i>
                    </div>
                </div>
            </div>`;
        }

        let actionsHtml = '';
        let badgeHtml = '';
        let opacityClass = 'hover:shadow-2xl hover:border-gray-700';

        if (currentTab === 'approvals') {
            actionsHtml = `
                <div class="flex gap-3 mt-5 pt-5 border-t border-gray-800">
                    <button onclick="promptRejectMovement(${mov.id}, '${partNameEscaped}')" class="flex-1 bg-slate-950 hover:bg-red-900/40 text-red-500 hover:text-red-400 py-3 rounded-xl font-bold border border-gray-800 hover:border-red-500/50 transition-colors text-sm shadow-sm">
                        <i class="fas fa-times mr-1"></i> Rechazar
                    </button>
                    <button onclick="processMovement(${mov.id}, 'approve')" class="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-900/20 transition-all text-sm">
                        <i class="fas fa-check mr-1"></i> Aprobar Salida
                    </button>
                </div>
            `;
        } else if (currentTab === 'provider') {
            actionsHtml = `
                <div class="flex mt-5 pt-5 border-t border-gray-800">
                    <button onclick="openResolveModal(${mov.id}, ${mov.quantity})" class="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all text-sm">
                        <i class="fas fa-handshake mr-1"></i> Registrar Respuesta de Proveedor
                    </button>
                </div>
            `;
        } else if (currentTab === 'rejected') {
            opacityClass = 'opacity-80'; // Hacer la tarjeta un poco opaca
            const rejecterName = mov.approver ? mov.approver.name : 'Administrador';
            badgeHtml = `<span class="absolute top-4 right-4 bg-red-900/30 text-red-500 border border-red-800/50 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest"><i class="fas fa-ban mr-1"></i> Rechazado por ${rejecterName}</span>`;
        }

        container.innerHTML += `
            <div class="bg-slate-900 border border-gray-800 rounded-2xl p-6 shadow-xl ${opacityClass} transition-all animate-fade-up relative">
                ${badgeHtml}
                <div class="flex justify-between items-start mb-4 pr-32">
                    <div>
                        <span class="text-[10px] font-black uppercase tracking-widest text-gray-500"><i class="far fa-clock mr-1"></i> ${date}</span>
                        <h4 class="text-lg font-bold text-white mt-1 leading-tight">${partName}</h4>
                        <p class="text-xs text-red-500 font-mono mt-0.5">SKU: ${partSku}</p>
                    </div>
                    <div class="bg-slate-950 px-3 py-1.5 rounded-lg border border-gray-800 text-center absolute right-6 top-12">
                        <p class="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Cant.</p>
                        <p class="text-xl font-black text-white leading-none">${mov.quantity}</p>
                    </div>
                </div>
                
                <div class="bg-slate-950 p-4 rounded-xl border border-gray-800/50">
                    <p class="text-xs text-gray-400 font-medium mb-1"><i class="fas fa-user-circle mr-1"></i> Solicitado por: <span class="text-gray-300">${userName}</span></p>
                    <p class="text-xs text-blue-400 font-medium leading-relaxed"><i class="fas fa-tag mr-1"></i> Razón: <span class="text-blue-300">${mov.reason}</span></p>
                </div>

                ${thumbnailsHtml}
                ${actionsHtml}
            </div>
        `;
    });
}
// ==========================================
// 3. ACCIONES DE APROBACIÓN / RECHAZO
// ==========================================
window.processMovement = async function(id, action) {
    const confirm = await Swal.fire({
        title: '¿Aprobar Movimiento?',
        text: "Esta acción afectará el inventario permanentemente.",
        icon: 'question',
        showCancelButton: true,
        background: '#0f172a', color: '#f8fafc', confirmButtonColor: '#10b981', cancelButtonColor: '#334155',
        confirmButtonText: 'Sí, Aprobar', cancelButtonText: 'Cancelar'
    });

    if (!confirm.isConfirmed) return;

    const token = localStorage.getItem('honda_token');
    try {
        const response = await fetch(`${API_BASE_URL}/movements/${id}/${action}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        if (response.ok && data.status) {
            showAppAlert("¡Aprobado!", "Movimiento procesado con éxito.", "success");
            fetchPendingApprovals(); 
        } else {
            showAppAlert("Error", data.message || 'Error al procesar.', "error");
        }
    } catch (error) {
        showAppAlert("Fallo de red", "No se pudo conectar con el servidor.", "error");
    }
}

window.promptRejectMovement = async function(id, partName) {
    const { value: reason, isConfirmed } = await Swal.fire({
        title: 'Rechazar Movimiento',
        text: `Motivo del rechazo para: "${partName}"`,
        input: 'text',
        icon: 'warning',
        showCancelButton: true,
        background: '#0f172a', color: '#f8fafc', confirmButtonColor: '#dc2626', cancelButtonColor: '#334155',
        confirmButtonText: 'Rechazar', cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value) return 'El motivo es obligatorio.'
        }
    });
    
    if (!isConfirmed) return; 

    try {
        const token = localStorage.getItem('honda_token');
        const response = await fetch(`${API_BASE_URL}/movements/${id}/reject`, {
            method: 'PATCH', 
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ rejection_reason: reason.trim() })
        });

        const data = await response.json();
        
        if (response.ok && data.status) {
            const nombreOperador = data.operator_name || 'Operador'; 
            Swal.fire({
                title: 'Movimiento Rechazado',
                html: `Comunícate con <b>${nombreOperador}</b> y envíale este mensaje:<br><br><span class="italic text-gray-400">"Tu movimiento de ${partName} fue rechazado. Motivo: ${reason}. Favor de repetirlo."</span>`,
                icon: 'success',
                background: '#0f172a', color: '#f8fafc'
            });
            fetchedRejected = false;
            fetchPendingApprovals();
        } else {
            showAppAlert("Error", data.message || "Error al rechazar en el servidor.", "error");
        }
    } catch (error) {
        showAppAlert("Fallo de conexión", "Error al comunicarse con el servidor.", "error");
    }
}

// ==========================================
// 4. VISOR DE FOTOGRAFÍAS (CÁMARA)
// ==========================================
window.animateModal = function(modalId, contentId, show) {
    const modal = document.getElementById(modalId);
    const content = document.getElementById(contentId);
    if (!modal || !content) return;

    if (show) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            if(content) content.classList.remove('scale-95');
        }, 10);
    } else {
        modal.classList.add('opacity-0');
        if(content) content.classList.add('scale-95');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

window.viewEvidenceImage = function(url) {
    document.getElementById('evidence-image-src').src = url;
    const downloadBtn = document.getElementById('photo-download-btn');
    if (downloadBtn) downloadBtn.href = url;
    animateModal('image-viewer-modal', 'image-viewer-content', true);
}

// ==========================================
// 5. MODAL DE RESOLUCIÓN DEL PROVEEDOR
// ==========================================
window.openResolveModal = function(id, originalQty) {
    document.getElementById('resolve-mov-id').value = id;
    document.getElementById('resolve-qty').value = originalQty;
    document.getElementById('resolve-qty').max = originalQty; 
    document.getElementById('resolve-original-qty').innerText = originalQty;
    
    document.getElementById('resolve-amount').value = '';
    document.getElementById('resolve-folio').value = '';
    document.getElementById('resolve-notes').value = '';
    
    document.getElementById('resolve-action').value = 'replace_same';
    toggleResolveQty();
    
    const modal = document.getElementById('resolve-modal');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('resolve-content').classList.remove('scale-95');
    }, 10);
}

window.closeResolveModal = function() {
    const modal = document.getElementById('resolve-modal');
    modal.classList.add('opacity-0');
    document.getElementById('resolve-content').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

window.toggleResolveQty = function() {
    const action = document.getElementById('resolve-action').value;
    const qtyContainer = document.getElementById('qty-container');
    const refundContainer = document.getElementById('refund-container');
    const btnSubmit = document.getElementById('btn-submit-resolution');

    if (action === 'replace_same') {
        qtyContainer.classList.remove('hidden');
        refundContainer.classList.add('hidden');
        btnSubmit.className = "w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center";
    } else {
        qtyContainer.classList.add('hidden');
        refundContainer.classList.remove('hidden');
        btnSubmit.className = "w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center";
    }
}

window.submitResolution = async function() {
    const id = document.getElementById('resolve-mov-id').value;
    const action = document.getElementById('resolve-action').value;
    const notes = document.getElementById('resolve-notes').value.trim();
    
    let qty = document.getElementById('resolve-qty').value;
    const maxQty = document.getElementById('resolve-qty').max;
    
    let amount = document.getElementById('resolve-amount').value;
    let folio = document.getElementById('resolve-folio').value.trim();
    
    if (action === 'replace_same') {
        if (!qty || qty < 1) {
            showAppAlert("Atención", "Debes ingresar una cantidad física válida.", "warning"); return;
        }
        if (parseInt(qty) > parseInt(maxQty)) {
            showAppAlert("Atención", `No puedes ingresar más de las ${maxQty} piezas que enviaste.`, "warning"); return;
        }
        amount = 0; folio = null;
    } else {
        if (!amount || amount <= 0) {
            showAppAlert("Atención", "Debes ingresar el monto del reembolso.", "warning"); return;
        }
        if (!folio) {
            showAppAlert("Atención", "El Folio o Nota de Crédito es obligatorio.", "warning"); return;
        }
        qty = 0; 
    }

    const btn = document.getElementById('btn-submit-resolution');
    const originalText = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...';
        
        const token = localStorage.getItem('honda_token');
        const response = await fetch(`${API_BASE_URL}/movements/${id}/resolve`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                action: action, 
                quantity: qty, 
                notes: notes,
                refund_amount: amount,
                refund_folio: folio
            }) 
        });

        const data = await response.json();
        if (response.ok && data.status) {
                closeResolveModal();
                fetchPendingApprovals();
                showAppAlert("Resolución Exitosa", "La respuesta del proveedor ha sido registrada.", "success");
            } else {
                showAppAlert("Error", data.message || 'Error al resolver el caso.', "error");
            }
        } catch (error) {
            showAppAlert("Error de red", "No se pudo conectar con el servidor.", "error");
        } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}