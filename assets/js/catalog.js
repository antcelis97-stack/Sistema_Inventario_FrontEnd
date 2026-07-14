let allProducts = []; 
let realDatabase = [];
let modalImages = [];
let currentImageIndex = 0;
let carouselInterval;
const API_BASE_URL = 'https://sistema-inventario-ltei.onrender.com/api';// http://127.0.0.1:8000/api para el local, https://sistema-inventario-ltei.onrender.com/api para el servidor en Render

document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
    fetchCatalog();
    initCustomSelects();

    const searchInput = document.getElementById('search-catalog');
    const categoryFilter = document.getElementById('categoryFilter');
    
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
});

async function fetchCatalog() {
    const token = localStorage.getItem('honda_token');
    const catalogContainer = document.getElementById('catalog-container');

    if (catalogContainer) {
        catalogContainer.innerHTML = '<p class="text-white text-center w-full"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando inventario...</p>';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/spare-parts`, { 
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });

        const json = await response.json();

        if (response.ok && json.status) {
            allProducts = json.data; 
            realDatabase = json.data; 
            populateCategoryDropdown(allProducts);
            renderCatalog(allProducts);
        } else {
            if (catalogContainer) catalogContainer.innerHTML = '<p class="text-red-500 text-center">Error al cargar refacciones.</p>';
        }
    } catch (error) {
        if (catalogContainer) catalogContainer.innerHTML = '<p class="text-red-500 text-center">Error de conexión con el servidor.</p>';
    }
}

function populateCategoryDropdown(products) {
    const filterSelect = document.getElementById('categoryFilter');
    const uniqueCategories = new Set();
    
    products.forEach(part => { if (part.category) uniqueCategories.add(part.category.name); });

    const sortedCategories = Array.from(uniqueCategories).sort((a, b) => {
        const aGeneral = a.toLowerCase().includes('general');
        const bGeneral = b.toLowerCase().includes('general');
        if (aGeneral && !bGeneral) return -1;
        if (!aGeneral && bGeneral) return 1;
        return a.localeCompare(b);
    });

    if (filterSelect) {
        filterSelect.innerHTML = `<option value="all">Todas las Categorías</option>`;
        sortedCategories.forEach(cat => { filterSelect.innerHTML += `<option value="${cat}">${cat}</option>`; });
    }
    if (typeof initCustomSelects === 'function') initCustomSelects();
}

function applyFilters() {
    const searchInput = document.getElementById('search-catalog');
    const categoryFilter = document.getElementById('categoryFilter');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedCategory = categoryFilter ? categoryFilter.value : 'all';

    const filteredProducts = allProducts.filter(part => {
        const matchesSearch = part.name.toLowerCase().includes(searchTerm) || part.sku.toLowerCase().includes(searchTerm) || (part.secondary_sku && part.secondary_sku.toLowerCase().includes(searchTerm));
        const catName = part.category ? part.category.name : 'Refacciones Generales';
        const matchesCategory = selectedCategory === 'all' || catName === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    renderCatalog(filteredProducts);
}

function renderCatalog(products) {
    let container = document.getElementById('catalog-container'); 
    if (!container) return;
    container.innerHTML = '';

    if (!products || products.length === 0) {
        container.innerHTML = `<div class="w-full p-12 text-center text-gray-500 bg-slate-900 border border-gray-800 rounded-xl">No se encontraron refacciones.</div>`;
        return;
    }

    const groupedProducts = {};
    products.forEach(part => {
        const catName = part.category ? part.category.name : 'Refacciones Generales';
        if (!groupedProducts[catName]) groupedProducts[catName] = [];
        groupedProducts[catName].push(part);
    });

    for (const [category, parts] of Object.entries(groupedProducts)) {
        let sectionHtml = `<div class="catalog-section"><div class="flex items-center gap-3 mb-6 border-b border-gray-800 pb-2"><h3 class="text-2xl font-black text-white uppercase tracking-wide">${category}</h3><span class="bg-slate-800 text-gray-400 text-xs font-bold px-2 py-1 rounded-md">${parts.length}</span></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">`;

        parts.forEach(part => {
            const formattedPrice = parseFloat(part.sale_price).toLocaleString('es-MX', { minimumFractionDigits: 2 });
            const stockClass = part.current_stock > 5 ? 'bg-green-900/80 text-green-400 border-green-700' : 'bg-red-900/80 text-red-400 border-red-700';
            const subName = part.subcategory ? part.subcategory.name : '';
            const subcategoryBadge = subName ? `<span class="inline-block mt-2 bg-slate-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">${subName}</span>` : '';

            sectionHtml += `
                <div onclick="openProductModal('${part.sku}')" class="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-gray-800 cursor-pointer hover:border-red-500 transition-all duration-300 group hover:-translate-y-1 flex flex-col">
                    <div class="relative h-48 bg-white rounded-t-xl border-b border-gray-200 flex items-center justify-center overflow-hidden">
                        ${part.images ? `<img src="${part.images}" class="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110">` : `<i class="fas fa-image text-5xl text-gray-200"></i>`}
                        <span class="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded border backdrop-blur-sm ${stockClass}">STOCK: ${part.current_stock || 0}</span>
                    </div>
                    <div class="p-5 flex flex-col flex-1">
                        <p class="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 truncate">${part.sku}</p>
                        <h3 class="text-lg font-bold text-white mb-1 group-hover:text-red-400 transition-colors truncate" title="${part.name}">${part.name}</h3>
                        <div>${subcategoryBadge}</div>
                        <div class="flex justify-between items-end mt-4 border-t border-gray-800 pt-4 flex-1">
                            <div class="w-1/2">
                                <p class="text-[10px] text-gray-500 uppercase tracking-wider">Proveedor</p>
                                <p class="text-sm font-medium text-gray-300 truncate">${part.proveedor ? part.proveedor.nombre_empresa : 'Honda OEM'}</p>
                            </div>
                            <h4 class="text-xl font-black text-white">$${formattedPrice}</h4>
                        </div>
                    </div>
                </div>`;
        });
        sectionHtml += `</div></div>`;
        container.innerHTML += sectionHtml;
    }
}

function checkAdminAccess() {
    const userRole = localStorage.getItem('user_role') || 'Operador'; 
    const adminBtn = document.getElementById('btn-admin-add');
    if (adminBtn) adminBtn.classList.toggle('hidden', !['Administrador', 'Supervisor'].includes(userRole));
}

function openProductModal(identifier) {
    const product = realDatabase.find(p => p.sku === identifier || p.id == identifier); 
    if (!product) return;

    try {
        const catName = product.category ? product.category.name : 'Sin Categoría';
        document.getElementById('modal-category').textContent = catName;
        document.getElementById('modal-title').textContent = product.name || 'Sin nombre';
        document.getElementById('modal-sku').textContent = `SKU: ${product.sku || 'N/A'}`;
        document.getElementById('modal-provider').textContent = product.proveedor ? product.proveedor.nombre_empresa : 'Honda OEM';
        
        const stockElement = document.getElementById('modal-stock');
        stockElement.textContent = `${product.current_stock || 0} unidades`;
        stockElement.className = (product.current_stock > 0) ? 'text-sm font-bold text-green-400' : 'text-sm font-bold text-red-500';
        document.getElementById('modal-desc').textContent = product.description || 'Importado del POS';

       const userRole = localStorage.getItem('user_role') || 'Operador';
        const btnEdit = document.getElementById('btn-edit-modal');
        if (btnEdit) {
            if (userRole.toLowerCase() === 'administrador') {
                btnEdit.classList.remove('hidden');
                // CORRECCIÓN AQUÍ: Mandamos únicamente el SKU
                btnEdit.onclick = () => { closeProductModal(); window.openCrudModal(product.sku); };
            } else {
                btnEdit.classList.add('hidden');
            }
        }

        modalImages = [product.images || null, product.img_2 || null, product.img_3 || null, product.img_4 || null];
        
        for(let i = 0; i < 3; i++) {
            const thumbImg = document.getElementById(`thumb-img-${i}`);
            const thumbIcon = document.getElementById(`thumb-icon-${i}`);
            if (thumbImg && thumbIcon) {
                if (modalImages[i]) {
                    thumbImg.src = modalImages[i];
                    thumbImg.classList.remove('hidden');
                    thumbIcon.classList.add('hidden');
                } else {
                    thumbImg.classList.add('hidden');
                    thumbIcon.classList.remove('hidden');
                }
            }
        }

        setMainImage(0); 
        iniciarCarrusel(); 
        animateModal('productModal', 'modalContent', true);
    } catch (error) {
        console.error("Fallo al inyectar datos:", error);
    }
}

function setMainImage(index) {
    if(!modalImages[index] && index !== 0) return; 
    currentImageIndex = index;
    const mainImg = document.getElementById('main-modal-image');
    const mainIcon = document.getElementById('main-modal-icon');

    if (mainImg && mainIcon) {
        if (modalImages[index]) {
            mainImg.src = modalImages[index];
            mainImg.classList.remove('hidden');
            mainIcon.classList.add('hidden');
        } else {
            mainImg.classList.add('hidden');
            mainIcon.classList.remove('hidden');
        }
    }

    document.querySelectorAll('.thumb-item').forEach((el, i) => {
        el.classList.remove('border-red-500', 'border-transparent');
        if(i === index && modalImages[i]) el.classList.add('border-red-500');
        else el.classList.add('border-transparent');
    });
}

function iniciarCarrusel() {
    clearInterval(carouselInterval);
    if (modalImages.filter(Boolean).length > 1) {
        carouselInterval = setInterval(() => {
            let nextIndex = currentImageIndex + 1;
            if(nextIndex > 2 || !modalImages[nextIndex]) nextIndex = 0;
            setMainImage(nextIndex);
        }, 3000);
    }
}

function detenerCarrusel() { clearInterval(carouselInterval); }
function nextImage() { detenerCarrusel(); let nextIndex = currentImageIndex + 1; if (nextIndex > 2 || !modalImages[nextIndex]) nextIndex = 0; setMainImage(nextIndex); }
function prevImage() { detenerCarrusel(); let prevIndex = currentImageIndex - 1; if (prevIndex < 0) prevIndex = Math.min(2, modalImages.filter(Boolean).length - 1); setMainImage(prevIndex); }
function closeProductModal() { detenerCarrusel(); animateModal('productModal', 'modalContent', false); }

function animateModal(modalId, contentId, show) {
    const modal = document.getElementById(modalId);
    const content = document.getElementById(contentId);
    if (!modal || !content) return;
    if (show) {
        modal.classList.remove('hidden');
        setTimeout(() => { modal.classList.remove('opacity-0'); content.classList.remove('scale-95'); }, 10);
    } else {
        modal.classList.add('opacity-0'); content.classList.add('scale-95');
        setTimeout(() => { modal.classList.add('hidden'); }, 300);
    }
}

const productModal = document.getElementById('productModal');
if (productModal) {
    productModal.addEventListener('click', function(e) { if (e.target === this) closeProductModal(); });
}