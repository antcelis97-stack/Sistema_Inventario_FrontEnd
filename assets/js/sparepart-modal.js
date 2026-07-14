// assets/js/sparepart-modal.js
const CRUD_API_BASE_URL = 'https://sistema-inventario-ltei.onrender.com/api';// http://127.0.0.1:8000/api para el local, https://sistema-inventario-ltei.onrender.com/api para el servidor en Render
let precioVentaOriginal = 0; // Guardará el precio histórico para comparaciones de riesgo

window.openCrudModal = function(identifier = null) {
    const form = document.getElementById('crud-form');
    if (form) form.reset(); 
    
    let productToEdit = null;

    // Buscar la refacción usando el SKU
    if (identifier) {
        const skuString = typeof identifier === 'object' ? (identifier.sku || identifier.id) : identifier;
        if (typeof allProducts !== 'undefined') {
            productToEdit = allProducts.find(p => p.sku === skuString || p.id == skuString);
        }
    }
    
    // 1. Configuración Financiera Avanzada (Solo Administradores)
    const userRole = localStorage.getItem('user_role') || 'Operador';
    const financeSection = document.getElementById('admin-finance-section');
    const financeContent = document.getElementById('finance-accordion-content');
    const financeIcon = document.getElementById('finance-accordion-icon');
    
    // Reiniciar acordeón cerrado
    if (financeContent) {
        financeContent.style.maxHeight = null;
        if(financeIcon) financeIcon.style.transform = 'rotate(0deg)';
    }

    if (financeSection) {
        if (userRole.toLowerCase() === 'administrador') {
            financeSection.classList.remove('hidden');
        } else {
            financeSection.classList.add('hidden');
        }
    }

    // 2. Llenar el selector de categorías dinámicamente
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
    }
    
    if (catSelect) {
        catSelect.onchange = () => window.updateSubcategories(catSelect.value);
    }

    const crudId = document.getElementById('crud-id');
    const crudSku = document.getElementById('crud-sku');
    const crudTitle = document.getElementById('crud-title');
    
    if (crudId) crudId.value = '';
    if (crudSku) crudSku.disabled = false; 

    // 3. LLENAR EL FORMULARIO SI EXISTE EL PRODUCTO
    if (productToEdit) {
        if (crudTitle) crudTitle.innerHTML = '<i class="fas fa-edit text-red-500 mr-2"></i> Editar Refacción';
        
        if (crudId) crudId.value = productToEdit.id; 
        if (crudSku) {
            crudSku.value = productToEdit.sku;
            crudSku.disabled = true; 
        }
        
        document.getElementById('crud-name').value = productToEdit.name || '';
        document.getElementById('crud-category').value = productToEdit.category_id || 1;
        
        window.updateSubcategories(productToEdit.category_id, productToEdit.subcategory_id);
        
        document.getElementById('crud-provider').value = productToEdit.proveedor_id || 1;
        document.getElementById('crud-stock').value = productToEdit.current_stock || 0;
        document.getElementById('crud-desc').value = productToEdit.description || '';
        
        // Lógica de precios
        document.getElementById('crud-purchase-price').value = productToEdit.purchase_price || '';
        precioVentaOriginal = parseFloat(productToEdit.sale_price || 0);
        
        // Si tu DB trae estos valores, se usan. Si no, usa los por defecto.
        document.getElementById('crud-utility').value = productToEdit.utility_percentage ?? 30;
        document.getElementById('crud-iva').value = productToEdit.iva_percentage ?? 16;
        document.getElementById('crud-discount').value = productToEdit.discount_percentage ?? 0;
        
        window.calcularPrecioVenta(); // Calcula inmediatamente el precio de venta

    } else {
        if (crudTitle) crudTitle.innerHTML = '<i class="fas fa-plus-circle text-red-500 mr-2"></i> Registrar Nueva Refacción';
        document.getElementById('crud-subcategory').innerHTML = '<option value="">Selecciona primero una categoría...</option>';
        
        // Reset de finanzas para nueva refacción
        precioVentaOriginal = 0;
        document.getElementById('crud-utility').value = 30;
        document.getElementById('crud-iva').value = 16;
        document.getElementById('crud-discount').value = 0;
        document.getElementById('crud-sale-price').value = '';
    }

    if (typeof initCustomSelects === 'function') initCustomSelects();

    // Mostrar Modal
    const modal = document.getElementById('crudModal');
    const content = document.getElementById('crudContent');
    if (modal && content) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            content.classList.remove('scale-95');
        }, 10);
    }
}

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
        const selected = (id == selectedSubId) ? 'selected' : '';
        subSelect.innerHTML += `<option value="${id}" ${selected}>${name}</option>`;
    });
    
    if (typeof initCustomSelects === 'function') initCustomSelects();
};

// ==========================================
// MOTOR FINANCIERO Y ACORDEÓN
// ==========================================
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

window.calcularPrecioVenta = function() {
    const purchasePrice = parseFloat(document.getElementById('crud-purchase-price').value) || 0;
    const utilityPercent = parseFloat(document.getElementById('crud-utility').value) || 0;
    const ivaPercent = parseFloat(document.getElementById('crud-iva').value) || 0;
    const discountPercent = parseFloat(document.getElementById('crud-discount').value) || 0;

    if (purchasePrice <= 0) {
        document.getElementById('crud-sale-price').value = '';
        return;
    }

    // 1. Añadir Margen de Utilidad sobre costo base
    const precioConUtilidad = purchasePrice * (1 + (utilityPercent / 100));
    // 2. Aplicar Impuesto (IVA)
    const precioConIva = precioConUtilidad * (1 + (ivaPercent / 100));
    // 3. Aplicar Descuento
    const precioFinal = precioConIva * (1 - (discountPercent / 100));

    document.getElementById('crud-sale-price').value = precioFinal.toFixed(2);
};

// ==========================================
// INTERCEPTOR Y ENVÍO A LARAVEL
// ==========================================
window.submitProductForm = async function(e) {
    e.preventDefault(); 
    
    const currentSalePrice = parseFloat(document.getElementById('crud-sale-price').value) || 0;
    const currentUtility = parseFloat(document.getElementById('crud-utility').value) || 0;
    const currentDiscount = parseFloat(document.getElementById('crud-discount').value) || 0;
    const crudId = document.getElementById('crud-id').value;

    // SISTEMA DE ALERTAS DE RIESGO FINANCIERO
    let alertasDeRiesgo = [];

    if (crudId && currentSalePrice < precioVentaOriginal) {
        alertasDeRiesgo.push(`⚠️ El precio final (<strong>$${currentSalePrice}</strong>) es menor al precio anterior ($${precioVentaOriginal}).`);
    }
    if (currentUtility < 25) {
        alertasDeRiesgo.push(`⚠️ El margen de utilidad (<strong>${currentUtility}%</strong>) es inferior al mínimo sugerido del 25%.`);
    }
    if (currentDiscount > 50) {
        alertasDeRiesgo.push(`⚠️ Estás aplicando un descuento crítico del <strong>${currentDiscount}%</strong>.`);
    }

    if (alertasDeRiesgo.length > 0) {
        const confirmacion = await Swal.fire({
            title: '¿Confirmar Operación de Riesgo?',
            html: `<div class="text-left space-y-3 text-xs text-gray-400 bg-slate-950 p-4 border border-gray-800 rounded-xl font-medium">
                    <p class="text-red-400 font-bold text-sm mb-2">Detectamos anomalías financieras:</p>
                    ${alertasDeRiesgo.map(al => `<p>${al}</p>`).join('')}
                   </div>`,
            icon: 'warning',
            showCancelButton: true,
            background: '#0f172a',
            color: '#f8fafc',
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#334155',
            confirmButtonText: 'Sí, aplicar cambios',
            cancelButtonText: 'Cancelar y revisar',
            customClass: {
                popup: 'border border-gray-800 rounded-2xl shadow-2xl',
                title: 'text-lg font-black text-white'
            }
        });

        if (!confirmacion.isConfirmed) return; // Se aborta el guardado
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

        // Variables adicionales por si el Backend las almacena
        formData.append('utility_percentage', currentUtility);
        formData.append('iva_percentage', parseFloat(document.getElementById('crud-iva').value) || 0);
        formData.append('discount_percentage', currentDiscount);

        const img1 = document.getElementById('crud-image-1')?.files[0];
        const img2 = document.getElementById('crud-image-2')?.files[0];
        const img3 = document.getElementById('crud-image-3')?.files[0];
        const img4 = document.getElementById('crud-image-4')?.files[0];

        const compressionOptions = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true, fileType: 'image/webp', initialQuality: 0.8 };

        if (img1) formData.append('images', await imageCompression(img1, compressionOptions));
        if (img2) formData.append('img_2', await imageCompression(img2, compressionOptions));
        if (img3) formData.append('img_3', await imageCompression(img3, compressionOptions));
        if (img4) formData.append('img_4', await imageCompression(img4, compressionOptions));

        if (crudId !== '') formData.append('_method', 'PUT'); 

        const url = crudId !== '' ? `${CRUD_API_BASE_URL}/spare-parts/${crudId}` : `${CRUD_API_BASE_URL}/spare-parts`;
        const token = localStorage.getItem('honda_token');
        
        const response = await fetch(url, {
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
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