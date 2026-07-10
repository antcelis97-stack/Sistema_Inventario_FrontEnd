// assets/js/movement-modal.js
const MOVEMENT_API_BASE_URL = 'http://127.0.0.1:8000/api';

window.initGlobalModalEvents = function() {
    const scannerInput = document.getElementById('g-scanner-input');
    
    if (scannerInput && !document.getElementById('g-search-results')) {
        const resultsContainer = document.createElement('ul');
        resultsContainer.id = 'g-search-results';
        resultsContainer.className = 'absolute z-50 w-full bg-slate-900 border border-gray-700 rounded-lg shadow-2xl max-h-48 overflow-y-auto hidden mt-1 divide-y divide-gray-800';
        scannerInput.parentNode.style.position = 'relative'; 
        scannerInput.parentNode.appendChild(resultsContainer);
    }

    if (scannerInput) {
        scannerInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const term = scannerInput.value.trim();
                if (!term) return;

                const statusObj = document.getElementById('g-scanner-status');
                const resultsList = document.getElementById('g-search-results');
                
                scannerInput.disabled = true;
                statusObj.innerHTML = '<i class="fas fa-spinner fa-spin text-blue-400 mr-1"></i> Buscando coincidencias...';
                resultsList.classList.add('hidden'); 
                
                try {
                    const response = await fetch(`${MOVEMENT_API_BASE_URL}/spare-parts/search-smart/${term}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('honda_token')}` }
                    });
                    const data = await response.json();

                    if (response.ok && data.status) {
                        if (data.data.length === 1) {
                            fillGlobalPreview(data.data[0]);
                            scannerInput.value = data.data[0].sku; 
                            statusObj.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i> Lista para procesar.';
                            statusObj.className = 'text-xs text-green-500 mt-2 font-bold';
                        } else {
                            statusObj.innerHTML = `<i class="fas fa-list text-blue-400 mr-1"></i> Se encontraron ${data.data.length} coincidencias.`;
                            statusObj.className = 'text-xs text-blue-400 mt-2 font-bold';
                            
                            resultsList.innerHTML = '';
                            data.data.forEach(part => {
                                const li = document.createElement('li');
                                li.className = 'p-3 hover:bg-blue-600/20 cursor-pointer transition-colors flex justify-between items-center';
                                li.innerHTML = `
                                    <div>
                                        <p class="font-bold text-white text-sm">${part.name}</p>
                                        <p class="text-[10px] text-gray-400 font-mono">SKU: ${part.sku}</p>
                                    </div>
                                    <span class="text-xs bg-slate-800 text-gray-300 px-2 py-1 rounded">Stock: ${part.current_stock}</span>
                                `;
                                
                                li.onclick = () => {
                                    fillGlobalPreview(part);
                                    scannerInput.value = part.sku;
                                    resultsList.classList.add('hidden');
                                    statusObj.innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i> Lista para procesar.';
                                    statusObj.className = 'text-xs text-green-500 mt-2 font-bold';
                                };
                                resultsList.appendChild(li);
                            });
                            resultsList.classList.remove('hidden');
                        }
                    } else {
                        resetGlobalMovementForm();
                        statusObj.innerHTML = `<i class="fas fa-exclamation-triangle text-red-500 mr-1"></i> ${data.message}`;
                        statusObj.className = 'text-xs text-red-500 mt-2 font-bold';
                    }
                } catch (error) {
                    resetGlobalMovementForm();
                    statusObj.innerHTML = '<i class="fas fa-wifi text-red-500 mr-1"></i> Error de conexión.';
                } finally {
                    scannerInput.disabled = false;
                    scannerInput.focus();
                }
            }
        });

        document.addEventListener('click', (e) => {
            const resultsList = document.getElementById('g-search-results');
            if (resultsList && e.target !== scannerInput && !resultsList.contains(e.target)) {
                resultsList.classList.add('hidden');
            }
        });
    }

    const form = document.getElementById('g-movement-form');
    if (form) {
        form.addEventListener('submit', submitGlobalMovement);
    }
}

window.openGlobalMovementModal = function(part = null) {
    const modal = document.getElementById('global-movement-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        document.getElementById('global-movement-content').classList.remove('scale-95');
    }, 10);

    resetGlobalMovementForm();

    if (part) {
        fillGlobalPreview(part);
        document.getElementById('g-scanner-input').value = part.sku;
    } else {
        setTimeout(() => document.getElementById('g-scanner-input').focus(), 150);
    }
};

window.closeGlobalMovementModal = function() {
    const modal = document.getElementById('global-movement-modal');
    if (!modal) return;
    
    modal.classList.add('opacity-0');
    document.getElementById('global-movement-content').classList.add('scale-95');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

// ==========================================
// NUEVA FUNCIÓN: ACTUALIZACIÓN DINÁMICA DE CLASIFICACIÓN
// ==========================================
window.updateGlobalMovementForm = function() {
    const type = document.getElementById('g-mov-type').value;
    const reasonSelect = document.getElementById('g-mov-reason');
    const photoContainer = document.getElementById('g-mov-photo-container');

    // 1. Definimos tus clasificaciones exactas
    const optionsIN = [
        { value: 'Compra Proveedor', text: 'Compra Proveedor' },
        { value: 'Devolución Correcta', text: 'Devolución Correcta' },
        { value: 'Ajuste por Cambio', text: 'Ajuste por Cambio' },
        { value: 'Ajuste por Reembolso', text: 'Ajuste por Reembolso' }
    ];

    const optionsOUT = [
        { value: 'Venta', text: 'Venta' },
        { value: 'Daño / Scrap (Merma)', text: 'Daño / Scrap (Merma)' },
        { value: 'Uso en Taller', text: 'Uso en Taller' },
        { value: 'Devolución a proveedor', text: 'Devolución a proveedor' }
    ];

    // 2. Vaciamos el selector nativo
    reasonSelect.innerHTML = '';

    // 3. Inyectamos la lista correspondiente
    const activeOptions = type === 'IN' ? optionsIN : optionsOUT;
    activeOptions.forEach(opt => {
        const newOption = document.createElement('option');
        newOption.value = opt.value;
        newOption.text = opt.text;
        reasonSelect.appendChild(newOption);
    });

    // 4. Forzamos a tu sistema de diseño a redibujar el menú desplegable
    if (typeof initCustomSelects === 'function') {
        initCustomSelects();
    }

    // 5. Control de la evidencia fotográfica (Ocultar/Mostrar cámara)
    const currentReason = reasonSelect.value;
    if (currentReason.includes('Daño') || currentReason.includes('Devolución a proveedor')) {
        photoContainer.classList.remove('hidden');
    } else {
        photoContainer.classList.add('hidden');
        document.getElementById('g-mov-photo-1').value = '';
        document.getElementById('g-mov-photo-2').value = '';
    }
};

function resetGlobalMovementForm() {
    const form = document.getElementById('g-movement-form');
    form.reset();
    form.classList.add('opacity-50', 'pointer-events-none');
    document.getElementById('g-hidden-part-id').value = '';
    
    document.getElementById('g-preview-empty').classList.remove('opacity-0');
    document.getElementById('g-preview-empty').style.pointerEvents = 'auto';
    document.getElementById('g-preview-data').classList.add('opacity-0');
    
    document.getElementById('g-scanner-status').innerHTML = '<i class="fas fa-info-circle mr-1"></i> Presiona Enter para buscar.';
    document.getElementById('g-scanner-status').className = 'text-xs text-gray-500 mt-2';
    
    updateGlobalMovementForm(); 
}

function fillGlobalPreview(part) {
    const catName = part.category ? part.category.name : 'General';
    const subName = part.subcategory ? ` > ${part.subcategory.name}` : '';
    document.getElementById('g-hidden-part-id').value = part.id;
    document.getElementById('g-preview-cat').innerText = catName + subName;
    
    const stockEl = document.getElementById('g-preview-stock');
    stockEl.innerText = part.current_stock || 0;
    stockEl.className = part.current_stock <= (part.min_stock || 5) ? 'text-lg font-black text-red-500' : 'text-lg font-black text-green-400';

    document.getElementById('g-preview-name').innerText = part.name;
    document.getElementById('g-preview-sku').innerText = `SKU: ${part.sku}`;
    
    document.getElementById('g-preview-purchase').innerText = `$${parseFloat(part.purchase_price || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
    document.getElementById('g-preview-sale').innerText = `$${parseFloat(part.sale_price || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}`;

    const imgEl = document.getElementById('g-preview-image');
    const noImgEl = document.getElementById('g-preview-no-image');
    
    if (part.images) {
        imgEl.src = part.images;
        imgEl.classList.remove('hidden');
        noImgEl.classList.add('hidden');
    } else {
        imgEl.src = '';
        imgEl.classList.add('hidden');
        noImgEl.classList.remove('hidden');
    }

    document.getElementById('g-preview-empty').classList.add('opacity-0');
    document.getElementById('g-preview-empty').style.pointerEvents = 'none';
    document.getElementById('g-preview-data').classList.remove('opacity-0');
    
    const form = document.getElementById('g-movement-form');
    form.classList.remove('opacity-50', 'pointer-events-none');
    setTimeout(() => document.getElementById('g-mov-qty').focus(), 100);
}

async function submitGlobalMovement(e) {
    e.preventDefault();
    
    const btnSubmit = document.getElementById('g-btn-submit');
    const originalText = btnSubmit.innerHTML;
    
    let photo1 = document.getElementById('g-mov-photo-1').files[0];
    let photo2 = document.getElementById('g-mov-photo-2').files[0];

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Comprimiendo fotos...';

    try {
        const compressionOptions = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true, initialQuality: 0.8 };

        if (photo1) photo1 = await imageCompression(photo1, compressionOptions);
        if (photo2) photo2 = await imageCompression(photo2, compressionOptions);

        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Enviando a servidor...';

        const formData = new FormData();
        formData.append('spare_part_id', document.getElementById('g-hidden-part-id').value);
        formData.append('type', document.getElementById('g-mov-type').value);
        formData.append('quantity', document.getElementById('g-mov-qty').value);
        
        const baseReason = document.getElementById('g-mov-reason').value;
        const notes = document.getElementById('g-mov-notes').value.trim();
        formData.append('reason', notes ? `${baseReason} - ${notes}` : baseReason);
        
        const invoice = document.getElementById('g-mov-invoice').value.trim();
        if (invoice) formData.append('numero_factura', invoice);

        if (photo1) formData.append('photo_1', photo1, photo1.name);
        if (photo2) formData.append('photo_2', photo2, photo2.name);

        const response = await fetch(`${MOVEMENT_API_BASE_URL}/movements`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('honda_token')}`,
                'Accept': 'application/json'
            },
            body: formData
        });

        if (response.status === 413) throw new Error("El archivo sigue siendo demasiado grande para el servidor.");

        const data = await response.json();

        if (response.ok && data.status) {
            alert(data.message);
            closeGlobalMovementModal();
            if (typeof fetchInventory === 'function') fetchInventory();
            if (typeof fetchMovements === 'function') fetchMovements();
        } else {
            alert(data.message || 'Error al guardar el movimiento.');
        }

    } catch (error) {
        console.error("Error en el proceso:", error);
        alert(error.message || 'Error de conexión con el servidor.');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
    }
}