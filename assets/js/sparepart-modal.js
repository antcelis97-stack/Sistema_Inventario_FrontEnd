// assets/js/sparepart-modal.js
let precioVentaOriginal = 0; 
let selectedSubstitutes = []; // Variable global para la memoria temporal de sustitutos

window.openCrudModal = function(identifier = null) {
    const form = document.getElementById('crud-form');
    if (form) form.reset(); 
    
    let productToEdit = null;

    if (identifier) {
        const skuString = typeof identifier === 'object' ? (identifier.sku || identifier.id) : identifier;
        if (typeof allProducts !== 'undefined') {
            productToEdit = allProducts.find(p => p.sku === skuString || p.id == skuString);
        }
    }
    
    const userRole = localStorage.getItem('user_role') || 'Operador';
    const financeSection = document.getElementById('admin-finance-section');
    const financeContent = document.getElementById('finance-accordion-content');
    const financeIcon = document.getElementById('finance-accordion-icon');
    
    if (financeContent) {
        financeContent.style.maxHeight = null;
        if(financeIcon) financeIcon.style.transform = 'rotate(0deg)';
    }

    if (financeSection) {
        financeSection.classList.toggle('hidden', userRole.toLowerCase() !== 'administrador');
    }

    // Llenar categorías
    const catSelect = document.getElementById('crud-category');
    if (catSelect && typeof allProducts !== 'undefined') {
        catSelect.innerHTML = '<option value="">Selecciona una categoría...</option>';
        const uniqueCatObjects = new Map();
        allProducts.forEach(p => {
            if (p.category && !uniqueCatObjects.has(p.category.id)) {
                uniqueCatObjects.set(p.category.id, p.category.name);
                catSelect.innerHTML += `<option value="${p.category.id}">${p.category.name}</option>`;
            }
        });
        catSelect.onchange = () => window.updateSubcategories(catSelect.value);
    }

    const crudId = document.getElementById('crud-id');
    const crudSku = document.getElementById('crud-sku');
    const crudTitle = document.getElementById('crud-title');
    
    if (crudId) crudId.value = '';
    if (crudSku) crudSku.disabled = false; 

    const crudUtility = document.getElementById('crud-utility');
    const crudIva = document.getElementById('crud-iva');
    const crudDiscount = document.getElementById('crud-discount');

    if (productToEdit) {
        if (crudTitle) crudTitle.innerHTML = '<i class="fas fa-edit text-red-500 mr-2"></i> Editar Refacción';
        if (crudId) crudId.value = productToEdit.id; 
        if (crudSku) { crudSku.value = productToEdit.sku; crudSku.disabled = true; }
        
        document.getElementById('crud-name').value = productToEdit.name || '';
        document.getElementById('crud-category').value = productToEdit.category_id || 1;
        window.updateSubcategories(productToEdit.category_id, productToEdit.subcategory_id);
        
        window.loadProviders(productToEdit.proveedor_id); // Carga dinámica
        
        document.getElementById('crud-stock').value = productToEdit.current_stock || 0;
        document.getElementById('crud-desc').value = productToEdit.description || '';
        document.getElementById('crud-purchase-price').value = productToEdit.purchase_price || '';
        
        precioVentaOriginal = parseFloat(productToEdit.sale_price || 0);
        
        if (crudUtility) crudUtility.value = productToEdit.utility_percentage ?? 30;
        if (crudIva) crudIva.value = productToEdit.iva_percentage ?? 16;
        if (crudDiscount) crudDiscount.value = productToEdit.discount_percentage ?? 0;
        
        // --- Cargar sustitutos de la base de datos ---
        selectedSubstitutes = productToEdit.substitutes ? productToEdit.substitutes.map(s => ({
            id: s.id, name: s.name, sku: s.sku, stock: s.current_stock
        })) : [];
        updateSubstitutesBadge();

        window.calcularPrecioVenta(); 
    } else {
        if (crudTitle) crudTitle.innerHTML = '<i class="fas fa-plus-circle text-red-500 mr-2"></i> Registrar Nueva Refacción';
        document.getElementById('crud-subcategory').innerHTML = '<option value="">Selecciona primero una categoría...</option>';
        window.loadProviders(); // Carga dinámica
        
        precioVentaOriginal = 0;
        document.getElementById('crud-sale-price').value = '';
        if (crudUtility) crudUtility.value = 30;
        if (crudIva) crudIva.value = 16;
        if (crudDiscount) crudDiscount.value = 0;

        // --- Limpiar sustitutos para refacción nueva ---
        selectedSubstitutes = [];
        updateSubstitutesBadge();
    }

    if (typeof initCustomSelects === 'function') initCustomSelects();

    const modal = document.getElementById('crudModal');
    const content = document.getElementById('crudContent');
    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95'); }, 10);
    }
};
// ==========================================
// CREACIÓN RÁPIDA DE PROVEEDORES
// ==========================================
window.promptNewProvider = async function() {
    const { value: nombreEmpresa, isConfirmed } = await Swal.fire({
        title: 'Nuevo Proveedor',
        input: 'text',
        inputLabel: 'Nombre de la empresa',
        inputPlaceholder: 'Ej. AutoZone, Castrol, etc.',
        showCancelButton: true,
        background: '#0f172a',
        color: '#f8fafc',
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#334155',
        confirmButtonText: '<i class="fas fa-save mr-1"></i> Guardar',
        cancelButtonText: 'Cancelar',
        customClass: {
            popup: 'border border-gray-800 rounded-2xl shadow-2xl',
            confirmButton: 'rounded-xl font-bold px-6 py-2',
            cancelButton: 'rounded-xl font-bold px-6 py-2'
        },
        inputValidator: (value) => {
            if (!value || value.trim() === '') return 'Debes ingresar un nombre válido.';
        }
    });

    if (isConfirmed && nombreEmpresa) {
        try {
            const token = localStorage.getItem('honda_token');
            // Nota: Aquí disparamos un POST hacia la misma ruta
            const response = await fetch(`${window.APP_API_URL}/proveedores`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ nombre_empresa: nombreEmpresa.trim(), activo: true })
            });

            const data = await response.json();
            
            if (response.ok && data.status) {
                // Alerta silenciosa de éxito
                const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, background: '#0f172a', color: '#10b981' });
                Toast.fire({ icon: 'success', title: 'Proveedor guardado' });
                
                // Recargamos la lista y forzamos a que seleccione el ID que acaba de crear Laravel
                window.loadProviders(data.data.id);
            } else {
                Swal.fire({ title: 'Error', text: data.message || 'No se pudo guardar.', icon: 'error', background: '#0f172a', color: '#f8fafc' });
            }
        } catch (error) {
            Swal.fire({ title: 'Error de Red', text: 'No se pudo conectar con el servidor.', icon: 'error', background: '#0f172a', color: '#f8fafc' });
        }
    }
};

// ==========================================
// CÁLCULO FINANCIERO (UNICA FUENTE)
// ==========================================
window.calcularPrecioVenta = function() {
    const purchasePrice = parseFloat(document.getElementById('crud-purchase-price')?.value) || 0;
    const utilityEl = document.getElementById('crud-utility');
    const ivaEl = document.getElementById('crud-iva');
    const discountEl = document.getElementById('crud-discount');

    const utilityPercent = utilityEl ? parseFloat(utilityEl.value) || 0 : 0;
    const ivaPercent = ivaEl ? parseFloat(ivaEl.value) || 0 : 0;
    const discountPercent = discountEl ? parseFloat(discountEl.value) || 0 : 0;

    if (purchasePrice <= 0) {
        const salePrice = document.getElementById('crud-sale-price');
        if(salePrice) salePrice.value = '';
        return;
    }

    const precioFinal = (purchasePrice * (1 + (utilityPercent / 100)) * (1 + (ivaPercent / 100))) * (1 - (discountPercent / 100));
    const salePriceInput = document.getElementById('crud-sale-price');
    if(salePriceInput) salePriceInput.value = precioFinal.toFixed(2);
};

window.closeCrudModal = function() {
    const modal = document.getElementById('crudModal');
    const content = document.getElementById('crudContent');
    if (modal && content) {
        modal.classList.add('opacity-0');
        content.classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

window.updateSubcategories = function(categoryId, selectedSubId = null) {
    const subSelect = document.getElementById('crud-subcategory');
    if(!subSelect) return;
    
    subSelect.innerHTML = '<option value="">Selecciona una subcategoría...</option>';
    const uniqueSubs = new Map();
    if (typeof allProducts !== 'undefined') {
        allProducts.forEach(p => {
            if (p.category_id == categoryId && p.subcategory) {
                uniqueSubs.set(p.subcategory.id, p.subcategory.name);
            }
        });
    }

    uniqueSubs.forEach((name, id) => {
        subSelect.innerHTML += `<option value="${id}" ${(id == selectedSubId) ? 'selected' : ''}>${name}</option>`;
    });
    
    if (typeof initCustomSelects === 'function') initCustomSelects();
};

window.toggleFinanceAccordion = function() {
    const content = document.getElementById('finance-accordion-content');
    const icon = document.getElementById('finance-accordion-icon');
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
        icon.style.transform = 'rotate(180deg)';
    }
};

window.submitProductForm = async function(e) {
    e.preventDefault(); 
    
    const currentSalePrice = parseFloat(document.getElementById('crud-sale-price').value) || 0;
    const currentUtility = parseFloat(document.getElementById('crud-utility').value) || 0;
    const currentDiscount = parseFloat(document.getElementById('crud-discount').value) || 0;
    const crudId = document.getElementById('crud-id').value;

    if (currentUtility < 25) {
        const confirm = await Swal.fire({ title: '¿Confirmar?', text: 'Margen de utilidad menor al 25%.', icon: 'warning', showCancelButton: true, background: '#0f172a', color: '#fff' });
        if (!confirm.isConfirmed) return;
    }

    const btnSubmit = e.target.querySelector('button[type="submit"]');
    const originalText = btnSubmit.innerHTML;
    
    try {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...';

        const formData = new FormData();
        formData.append('sku', document.getElementById('crud-sku').value);
        formData.append('name', document.getElementById('crud-name').value);
        formData.append('category_id', document.getElementById('crud-category').value);
        formData.append('subcategory_id', document.getElementById('crud-subcategory').value);
        formData.append('proveedor_id', document.getElementById('crud-provider').value);
        formData.append('current_stock', document.getElementById('crud-stock').value);
        formData.append('purchase_price', document.getElementById('crud-purchase-price').value);
        formData.append('sale_price', currentSalePrice); 
        formData.append('description', document.getElementById('crud-desc').value);
        formData.append('utility_percentage', currentUtility);
        formData.append('iva_percentage', parseFloat(document.getElementById('crud-iva').value) || 0);
        formData.append('discount_percentage', currentDiscount);

        // --- ENVIAR SUSTITUTOS ---
        formData.append('substitutes', JSON.stringify(selectedSubstitutes.map(s => s.id)));

        // Imágenes
        const imgs = ['crud-image-1', 'crud-image-2', 'crud-image-3', 'crud-image-4'];
        const compressionOptions = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true, fileType: 'image/webp', initialQuality: 0.8 };
        
        for (let i = 0; i < imgs.length; i++) {
            const file = document.getElementById(imgs[i])?.files[0];
            if (file) {
                const compressed = await imageCompression(file, compressionOptions);
                const fieldName = (i === 0) ? 'images' : `img_${i + 1}`;
                formData.append(fieldName, compressed, compressed.name);
            }
        }

        if (crudId !== '') formData.append('_method', 'PUT'); 

        const response = await fetch(`${window.APP_API_URL}/spare-parts${crudId ? '/' + crudId : ''}`, {
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${localStorage.getItem('honda_token')}`, 'Accept': 'application/json' },
            body: formData
        });

        const data = await response.json();
        if (response.ok && data.status) {
            alert(data.message);
            closeCrudModal(); 
            if (typeof fetchCatalog === 'function') fetchCatalog(); 
            if (typeof fetchInventory === 'function') fetchInventory(); 
        } else {
            alert(data.message || 'Error al guardar.');
        }

    } catch (error) {
        console.error("Error crítico:", error);
        alert("Fallo de conexión.");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
    }
}

// Carga de proveedores dinámica
window.loadProviders = async function(selectedProviderId = null) {
    const provSelect = document.getElementById('crud-provider');
    if (!provSelect) return;

    try {
        const response = await fetch(`${window.APP_API_URL}/proveedores`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('honda_token')}`, 'Accept': 'application/json' }
        });
        
        const json = await response.json();
        if (response.ok && json.status) {
            provSelect.innerHTML = '<option value="">Selecciona un proveedor...</option>';
            json.data.forEach(prov => {
                provSelect.innerHTML += `<option value="${prov.id}" ${(selectedProviderId == prov.id) ? 'selected' : ''}>${prov.nombre_empresa}</option>`;
            });
            if (typeof initCustomSelects === 'function') initCustomSelects();
        }
    } catch (error) { console.error("Error al cargar proveedores:", error); }
}

// ==========================================
// GESTOR DE SUSTITUTOS
// ==========================================
window.openSubstituteModal = function() {
    renderSelectedSubstitutes();
    document.getElementById('sub-search-input').value = '';
    document.getElementById('sub-results').classList.add('hidden');

    const modal = document.getElementById('substituteModal');
    const content = document.getElementById('substituteContent');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95'); }, 10);
};

window.closeSubstituteModal = function() {
    const modal = document.getElementById('substituteModal');
    const content = document.getElementById('substituteContent');
    modal.classList.add('opacity-0');
    content.classList.add('scale-95');
    setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); }, 300);
    updateSubstitutesBadge();
};

window.updateSubstitutesBadge = function() {
    const badge = document.getElementById('substitutes-count-badge');
    if (badge) {
        badge.innerText = `${selectedSubstitutes.length} seleccionados`;
        if (selectedSubstitutes.length > 0) {
            badge.classList.replace('bg-gray-800', 'bg-blue-600/20');
            badge.classList.replace('text-gray-400', 'text-blue-400');
        } else {
            badge.classList.replace('bg-blue-600/20', 'bg-gray-800');
            badge.classList.replace('text-blue-400', 'text-gray-400');
        }
    }
};

// Buscador Inteligente en Tiempo Real (Usando Delegación de Eventos)
document.addEventListener('input', async (e) => {
    // Verificamos si el elemento que disparó el evento es exactamente nuestro buscador
    if (e.target && e.target.id === 'sub-search-input') {
        const term = e.target.value.trim();
        const resultsContainer = document.getElementById('sub-results');
        const currentProductId = document.getElementById('crud-id').value; 

        // Solo buscar si hay 3 caracteres o más para no saturar la base de datos
        if (term.length < 3) {
            resultsContainer.classList.add('hidden');
            return;
        }

        try {
            const token = localStorage.getItem('honda_token');
            // Usamos APP_API_URL desde tu configuración centralizada
            const response = await fetch(`${window.APP_API_URL}/spare-parts/search-smart/${term}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            resultsContainer.innerHTML = '';
            
            if (response.ok && data.status && data.data.length > 0) {
                data.data.forEach(part => {
                    // Prevenir que se agregue a sí mismo o que se muestre si ya está en la lista
                    if (part.id == currentProductId || selectedSubstitutes.find(s => s.id === part.id)) return;

                    const stockClass = part.current_stock > 0 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10';
                    
                    resultsContainer.innerHTML += `
                        <li class="p-3 hover:bg-slate-800 cursor-pointer transition-colors flex justify-between items-center border-b border-gray-800 last:border-0" 
                            onclick="addSubstitute(${part.id}, '${part.name.replace(/'/g, "\\'")}', '${part.sku}', ${part.current_stock})">
                            <div>
                                <p class="font-bold text-white text-sm truncate max-w-[250px]">${part.name}</p>
                                <p class="text-[10px] text-gray-500 font-mono tracking-widest mt-0.5">SKU: ${part.sku}</p>
                            </div>
                            <span class="text-[10px] px-2 py-1 rounded font-bold ${stockClass}">Stock: ${part.current_stock}</span>
                        </li>`;
                });
                
                if(resultsContainer.innerHTML !== '') resultsContainer.classList.remove('hidden');
                else { 
                    resultsContainer.innerHTML = '<li class="p-4 text-center text-gray-500 text-xs">Ya agregaste todas las coincidencias.</li>'; 
                    resultsContainer.classList.remove('hidden'); 
                }
            } else {
                resultsContainer.innerHTML = '<li class="p-4 text-center text-gray-500 text-xs">No se encontraron coincidencias.</li>';
                resultsContainer.classList.remove('hidden');
            }
        } catch (error) {
            console.error("Error en la búsqueda:", error);
            resultsContainer.innerHTML = '<li class="p-4 text-center text-red-500 text-xs">Error de conexión al buscar.</li>';
            resultsContainer.classList.remove('hidden');
        }
    }
});

window.addSubstitute = function(id, name, sku, stock) {
    selectedSubstitutes.push({ id, name, sku, stock });
    document.getElementById('sub-search-input').value = '';
    document.getElementById('sub-results').classList.add('hidden');
    renderSelectedSubstitutes();
};

window.removeSubstitute = function(id) {
    selectedSubstitutes = selectedSubstitutes.filter(s => s.id !== id);
    renderSelectedSubstitutes();
};

window.renderSelectedSubstitutes = function() {
    const list = document.getElementById('selected-substitutes-list');
    if (!list) return;

    if (selectedSubstitutes.length === 0) {
        list.innerHTML = `<div class="text-center p-6 bg-slate-950 border border-gray-800 rounded-xl text-gray-500 text-sm">Aún no has agregado sustitutos.</div>`;
        return;
    }

    list.innerHTML = selectedSubstitutes.map(s => {
        const stockBadge = s.stock > 0 
            ? `<span class="text-[10px] font-bold text-green-500"><i class="fas fa-box text-green-500/50 mr-1"></i> ${s.stock} pz</span>` 
            : `<span class="text-[10px] font-bold text-red-500"><i class="fas fa-times-circle text-red-500/50 mr-1"></i> Agotado</span>`;

        return `
        <div class="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-gray-800 animate-fade-up">
            <div class="w-[85%]">
                <p class="text-xs font-bold text-gray-200 truncate" title="${s.name}">${s.name}</p>
                <div class="flex gap-3 mt-1">
                    <span class="text-[10px] text-red-400 font-mono">${s.sku}</span>
                    ${stockBadge}
                </div>
            </div>
            <button type="button" onclick="removeSubstitute(${s.id})" class="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors flex items-center justify-center">
                <i class="fas fa-trash-alt text-xs"></i>
            </button>
        </div>`;
    }).join('');
};