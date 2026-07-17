let flowChartInstance = null;
let stockChartInstance = null;

window.initDashboard = function() {
    Chart.defaults.color = '#94a3b8'; 
    Chart.defaults.font.family = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont';
    
    applyRoleSecurityToKPIs();
    loadDashboardData();
    fetchTopOutbounds(); 
};

// ==========================================
// SEGURIDAD: BLINDAJE DE KPIs PARA OPERADORES
// ==========================================
function applyRoleSecurityToKPIs() {
    const userRole = localStorage.getItem('user_role') || 'Operador';
    
    if (userRole === 'Operador') {
        const finCard = document.getElementById('kpi-financial-card');
        if (finCard) finCard.style.display = 'none';
        
        const kpiContainer = document.getElementById('kpis-container');
        if (kpiContainer) {
            kpiContainer.classList.remove('md:grid-cols-3');
            kpiContainer.classList.add('md:grid-cols-2');
        }

        const catCard = document.getElementById('kpi-catalog-card');
        const alertCard = document.getElementById('kpi-alerts-card');
        
        if (catCard) {
            catCard.removeAttribute('onclick');
            catCard.className = 'bg-slate-900 border border-gray-800 p-6 rounded-xl shadow-lg flex justify-between items-center';
            catCard.querySelector('p').innerHTML = 'Catálogo'; 
        }
        
        if (alertCard) {
            alertCard.removeAttribute('onclick');
            alertCard.className = 'bg-slate-900 border border-red-900/50 p-6 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.1)] flex justify-between items-center border-l-4 border-l-red-600';
            alertCard.querySelector('p').innerHTML = 'Alertas Stock';
        }
    }
}

async function loadDashboardData() {
    const token = localStorage.getItem('honda_token');
    try {
        const response = await fetch(`${window.APP_API_URL}/dashboard/metrics`, {
            method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        const result = await response.json();
        if (response.ok && result.status) {
            const data = result.data;
            document.getElementById('kpi-products').innerText = data.kpis.total_products.toLocaleString('es-MX');
            document.getElementById('kpi-alerts').innerText = data.kpis.low_stock_alerts.toLocaleString('es-MX');
            document.getElementById('kpi-value').innerText = `$${parseFloat(data.kpis.total_value).toLocaleString('es-MX', {minimumFractionDigits: 2})}`;

            renderFlowChart(data.charts.flow);
            renderStockChart(data.charts.stock);
            renderRecentActivity(data.recent_activity);
        }
    } catch (error) { console.error("Error crítico de red:", error); }
}

async function fetchTopOutbounds() {
    const token = localStorage.getItem('honda_token');
    try {
        const response = await fetch(`${window.APP_API_URL}/reports/financial`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        const json = await response.json();
        if (response.ok && json.status) renderTopOutbounds(json.data.top_outbounds);
    } catch(e) { console.error(e); }
}

function renderTopOutbounds(items) {
    const tbody = document.getElementById('top-5-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td class="text-center p-8 text-gray-500 text-xs">Sin salidas este mes.</td></tr>`;
        return;
    }
    
    items.forEach((item, index) => {
        const part = item.spare_part || { name: 'Refacción Eliminada', sku: 'N/A' };
        let badgeColor = index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-500'; 
        tbody.innerHTML += `
            <tr class="border-b border-gray-800 transition hover:bg-slate-800/50">
                <td class="p-4 text-center font-black text-lg ${badgeColor}">${index + 1}</td>
                <td class="p-4 w-full">
                    <div class="font-bold text-white text-sm truncate max-w-[200px]" title="${part.name}">${part.name}</div>
                    <div class="text-[10px] text-red-500 font-mono font-bold mt-0.5">${part.sku}</div>
                </td>
                <td class="p-4 text-right">
                    <span class="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-lg font-black text-xs">
                        -${item.total_quantity}
                    </span>
                </td>
            </tr>`;
    });
}

// ==========================================
// INTERACTIVIDAD ANALÍTICA (MODALES SWAL)
// ==========================================

// 1. Modal de Catálogo (Radiografía)
window.showCatalogDetails = async function() {
    Swal.fire({ title: 'Analizando Catálogo...', background: '#0f172a', color: '#f8fafc', didOpen: () => { Swal.showLoading(); }});

    try {
        const response = await fetch(`${window.APP_API_URL}/spare-parts`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('honda_token')}` }});
        const json = await response.json();
        
        if (response.ok && json.status) {
            const parts = json.data;
            const total = parts.length;
            const active = parts.filter(p => p.is_active).length;
            const inactive = total - active;

            // Agrupar por categoría
            const catCounts = {};
            parts.forEach(p => {
                const cat = p.category ? p.category.name : 'General';
                catCounts[cat] = (catCounts[cat] || 0) + 1;
            });

            // Ordenar de mayor a menor
            const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);

            let html = `
                <div class="flex gap-4 mb-6">
                    <div class="flex-1 bg-slate-950 border border-gray-700 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-green-500 font-bold uppercase tracking-widest">Activas</p>
                        <h4 class="text-xl font-black text-white">${active}</h4>
                    </div>
                    <div class="flex-1 bg-slate-950 border border-gray-700 p-3 rounded-xl text-center">
                        <p class="text-[10px] text-red-500 font-bold uppercase tracking-widest">Inhabilitadas</p>
                        <h4 class="text-xl font-black text-white">${inactive}</h4>
                    </div>
                </div>
                <div class="text-left">
                    <p class="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3 border-b border-gray-800 pb-2">Composición por Categoría</p>
                    <div class="space-y-3 overflow-y-auto max-h-48 custom-scrollbar pr-2">
            `;
            
            sortedCats.forEach(([cat, count]) => {
                const percentage = Math.round((count / total) * 100);
                html += `
                    <div>
                        <div class="flex justify-between text-xs mb-1">
                            <span class="font-bold text-gray-300">${cat}</span>
                            <span class="text-gray-500 font-mono">${count} pz (${percentage}%)</span>
                        </div>
                        <div class="w-full bg-slate-950 rounded-full h-2">
                            <div class="bg-blue-500 h-2 rounded-full" style="width: ${percentage}%"></div>
                        </div>
                    </div>`;
            });

            html += `</div></div>`;

            Swal.fire({
                title: '<i class="fas fa-cogs text-gray-400 mr-2"></i> Radiografía del Catálogo',
                html: html, background: '#0f172a', color: '#f8fafc', width: '500px',
                confirmButtonText: 'Entendido',
                customClass: { popup: 'border border-gray-800 rounded-2xl shadow-2xl', confirmButton: 'bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold px-8 py-3', title: 'text-xl font-black text-white' }
            });
        }
    } catch (error) { showAppAlert('Error', 'Fallo al procesar analíticas.', 'error'); }
}

// 2. Modal Financiero (Paginado: Flujo de Inversión y Distribución)
window.showFinancialDetails = async function() {
    Swal.fire({ title: 'Calculando Finanzas...', background: '#0f172a', color: '#f8fafc', didOpen: () => { Swal.showLoading(); }});

    try {
        const token = localStorage.getItem('honda_token');
        // Descargamos Refacciones y Movimientos simultáneamente para mayor velocidad
        const [partsRes, movsRes] = await Promise.all([
            fetch(`${window.APP_API_URL}/spare-parts`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${window.APP_API_URL}/movements`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const partsJson = await partsRes.json();
        const movsJson = await movsRes.json();
        
        if (partsRes.ok && partsJson.status && movsRes.ok) {
            const parts = partsJson.data.filter(p => p.is_active);
            const movs = movsJson;

            // ---- CÁLCULO PÁGINA 2: DISTRIBUCIÓN DE CAPITAL ----
            let totalInversion = 0;
            const catValues = {};
            parts.forEach(p => {
                const value = (parseFloat(p.purchase_price) || 0) * (parseInt(p.current_stock) || 0);
                totalInversion += value;
                if (value > 0) {
                    const cat = p.category ? p.category.name : 'General';
                    catValues[cat] = (catValues[cat] || 0) + value;
                }
            });
            const sortedCats = Object.entries(catValues).sort((a, b) => b[1] - a[1]).slice(0, 3);

            // ---- CÁLCULO PÁGINA 1: FLUJO DE CAPITAL (7D vs 30D) ----
            const now = new Date();
            const past7 = new Date(); past7.setDate(now.getDate() - 7);
            const past30 = new Date(); past30.setDate(now.getDate() - 30);

            let in7 = 0, out7 = 0, in30 = 0, out30 = 0;

            movs.forEach(m => {
                if (!m.spare_part || m.type === 'STATUS_LOG') return;
                
                const mDate = new Date(m.created_at);
                const cost = parseFloat(m.spare_part.purchase_price) || 0;
                const sale = parseFloat(m.spare_part.sale_price) || 0;
                const qty = parseInt(m.quantity) || 0;

                if (mDate >= past30) {
                    if (m.type === 'IN') in30 += (cost * qty);
                    if (m.type === 'OUT') out30 += (sale * qty);
                    
                    if (mDate >= past7) {
                        if (m.type === 'IN') in7 += (cost * qty);
                        if (m.type === 'OUT') out7 += (sale * qty);
                    }
                }
            });

            const fmt = (val) => `$${val.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;

            // ---- CONSTRUIR HTML DEL SLIDER ----
            let html = `
                <div id="fin-slider" class="relative overflow-hidden w-full h-[280px]">
                    
                    <!-- PÁGINA 1: FLUJO DE INVERSIÓN -->
                    <div id="fin-page-1" class="absolute w-full top-0 left-0 transition-transform duration-300 transform translate-x-0">
                        <p class="text-sm text-gray-400 mb-6 font-medium">Movimiento de capital reciente (Costo Compras vs Ingreso Salidas):</p>
                        
                        <div class="space-y-4">
                            <!-- 7 Días -->
                            <div class="bg-slate-950 border border-gray-800 p-4 rounded-xl">
                                <p class="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-3 border-b border-gray-800 pb-2"><i class="fas fa-calendar-week mr-1"></i> Últimos 7 Días</p>
                                <div class="flex justify-between items-center">
                                    <div class="text-left">
                                        <p class="text-[10px] text-gray-500 uppercase tracking-widest">Invertido (Entradas)</p>
                                        <p class="text-lg font-black text-red-400">${fmt(in7)}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-[10px] text-gray-500 uppercase tracking-widest">Retorno (Salidas)</p>
                                        <p class="text-lg font-black text-green-400">${fmt(out7)}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- 30 Días -->
                            <div class="bg-slate-950 border border-gray-800 p-4 rounded-xl">
                                <p class="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-3 border-b border-gray-800 pb-2"><i class="fas fa-calendar-alt mr-1"></i> Últimos 30 Días</p>
                                <div class="flex justify-between items-center">
                                    <div class="text-left">
                                        <p class="text-[10px] text-gray-500 uppercase tracking-widest">Invertido (Entradas)</p>
                                        <p class="text-lg font-black text-red-400">${fmt(in30)}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-[10px] text-gray-500 uppercase tracking-widest">Retorno (Salidas)</p>
                                        <p class="text-lg font-black text-green-400">${fmt(out30)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- PÁGINA 2: DISTRIBUCIÓN DE CAPITAL -->
                    <div id="fin-page-2" class="absolute w-full top-0 left-0 transition-transform duration-300 transform translate-x-[110%]">
                        <p class="text-sm text-gray-400 mb-6 font-medium">El capital está concentrado principalmente en estas áreas:</p>
                        <div class="space-y-4 text-left">
            `;
            
            const colores = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500'];
            sortedCats.forEach(([cat, value], index) => {
                const percentage = Math.round((value / totalInversion) * 100);
                html += `
                    <div class="bg-slate-950 border border-gray-800 p-4 rounded-xl relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-1 h-full ${colores[index]}"></div>
                        <div class="flex justify-between items-center mb-1 ml-2">
                            <span class="font-bold text-white text-sm">${cat}</span>
                            <span class="text-lg font-black text-${colores[index].split('-')[1]}-400">${fmt(value)}</span>
                        </div>
                        <p class="text-[10px] text-gray-500 uppercase tracking-widest ml-2">Representa el ${percentage}% del almacén</p>
                    </div>`;
            });

            html += `
                        </div>
                    </div>
                </div>
                
                <!-- CONTROLES MINIMALISTAS DEL CARRUSEL -->
                <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-800">
                    <div class="flex gap-2">
                        <button id="fin-prev" class="h-10 w-10 rounded-full bg-slate-900 border border-gray-700 text-gray-500 hover:text-white hover:bg-slate-800 transition-all flex items-center justify-center opacity-50 cursor-not-allowed focus:outline-none"><i class="fas fa-chevron-left text-sm"></i></button>
                        <button id="fin-next" class="h-10 w-10 rounded-full bg-slate-900 border border-gray-700 text-blue-500 hover:text-white hover:bg-blue-900 transition-all flex items-center justify-center focus:outline-none"><i class="fas fa-chevron-right text-sm"></i></button>
                    </div>
                    <span id="fin-indicator" class="text-[10px] text-gray-500 font-black tracking-widest">1 / 2</span>
                    <button id="fin-action-btn" class="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold px-8 py-2.5 shadow-lg shadow-blue-900/20 transition-all focus:outline-none">Continuar</button>
                </div>
            `;

            Swal.fire({
                title: '<span id="fin-title"><i class="fas fa-exchange-alt text-blue-500 mr-2"></i> Flujo de Inversión</span>',
                html: html, background: '#0f172a', color: '#f8fafc', width: '500px',
                showConfirmButton: false, // Apagamos el botón por defecto de Swal para usar el nuestro dinámico
                customClass: { popup: 'border border-gray-800 rounded-2xl shadow-2xl', title: 'text-xl font-black text-white' },
                didOpen: () => {
                    const page1 = document.getElementById('fin-page-1');
                    const page2 = document.getElementById('fin-page-2');
                    const btnPrev = document.getElementById('fin-prev');
                    const btnNext = document.getElementById('fin-next');
                    const btnAction = document.getElementById('fin-action-btn');
                    const indicator = document.getElementById('fin-indicator');
                    const title = document.getElementById('fin-title');
                    let currentPage = 1;

                    const updateView = () => {
                        if (currentPage === 1) {
                            page1.classList.remove('-translate-x-[110%]');
                            page1.classList.add('translate-x-0');
                            page2.classList.remove('translate-x-0');
                            page2.classList.add('translate-x-[110%]');
                            
                            btnPrev.classList.add('opacity-50', 'cursor-not-allowed');
                            btnNext.classList.remove('opacity-50', 'cursor-not-allowed', 'text-gray-500');
                            btnNext.classList.add('text-blue-500');
                            
                            indicator.innerText = '1 / 2';
                            btnAction.innerText = 'Continuar';
                            title.innerHTML = '<i class="fas fa-exchange-alt text-blue-500 mr-2"></i> Flujo de Inversión';
                        } else {
                            page1.classList.remove('translate-x-0');
                            page1.classList.add('-translate-x-[110%]');
                            page2.classList.remove('translate-x-[110%]');
                            page2.classList.add('translate-x-0');
                            
                            btnPrev.classList.remove('opacity-50', 'cursor-not-allowed');
                            btnNext.classList.add('opacity-50', 'cursor-not-allowed', 'text-gray-500');
                            btnNext.classList.remove('text-blue-500');
                            
                            indicator.innerText = '2 / 2';
                            btnAction.innerText = 'Cerrar';
                            title.innerHTML = '<i class="fas fa-chart-pie text-blue-500 mr-2"></i> Distribución de Capital';
                        }
                    };

                    btnNext.onclick = () => { if(currentPage < 2) { currentPage++; updateView(); } };
                    btnPrev.onclick = () => { if(currentPage > 1) { currentPage--; updateView(); } };
                    btnAction.onclick = () => {
                        if(currentPage === 1) { currentPage++; updateView(); }
                        else { Swal.close(); }
                    };
                }
            });
        }
    } catch (error) { showAppAlert('Error', 'Fallo al procesar finanzas.', 'error'); console.error(error); }
}

// 3. Modal Alertas de Stock
window.showLowStockAlerts = async function() {
    Swal.fire({ title: 'Analizando Almacén...', background: '#0f172a', color: '#f8fafc', didOpen: () => { Swal.showLoading(); }});

    try {
        const response = await fetch(`${window.APP_API_URL}/spare-parts`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('honda_token')}` }});
        const json = await response.json();
        
        if (response.ok && json.status) {
            const lowStock = json.data.filter(p => p.is_active && p.current_stock <= (p.min_stock || 5));
            
            if(lowStock.length === 0) { showAppAlert('Todo en orden', 'No hay refacciones con stock crítico.', 'success'); return; }

            let html = `<div class="max-h-72 overflow-y-auto custom-scrollbar text-left border border-gray-700 rounded-lg">
                            <table class="w-full text-sm text-gray-300">
                                <thead class="sticky top-0 bg-slate-900 border-b border-gray-700 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                                    <tr><th class="p-3">SKU</th><th class="p-3">Refacción</th><th class="p-3 text-center">Stock</th></tr>
                                </thead>
                                <tbody class="divide-y divide-gray-800">`;
            
            lowStock.forEach(part => {
                html += `<tr class="hover:bg-slate-800/80 transition-colors">
                            <td class="p-3 font-mono text-[10px] text-red-400 font-bold">${part.sku}</td>
                            <td class="p-3 font-medium text-white text-xs">${part.name}</td>
                            <td class="p-3 text-center text-red-500 font-black text-sm bg-red-950/20">${part.current_stock}</td>
                         </tr>`;
            });
            html += `</tbody></table></div>`;

            Swal.fire({
                title: '<i class="fas fa-exclamation-triangle text-red-500 mr-2"></i> Stock Crítico',
                html: html, background: '#0f172a', color: '#f8fafc', width: '600px',
                confirmButtonText: 'Entendido',
                customClass: { popup: 'border border-gray-800 rounded-2xl shadow-2xl', confirmButton: 'bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold px-8 py-3', title: 'text-xl font-black text-white' }
            });
        }
    } catch (error) { showAppAlert('Error', 'Fallo de conexión.', 'error'); }
}

// ==========================================
// RENDERIZADO DE GRÁFICAS
// ==========================================
function renderFlowChart(flowData) {
    const ctx = document.getElementById('flowChart');
    if (!ctx) return;
    if (flowChartInstance) flowChartInstance.destroy();
    
    flowChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: flowData.labels, 
            datasets: [
                { label: 'Entradas', data: flowData.entradas, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4, fill: true },
                { label: 'Salidas', data: flowData.salidas, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', tension: 0.4, fill: true }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.1)' } }, x: { grid: { display: false } } } }
    });
}

function renderStockChart(stockData) {
    const ctx = document.getElementById('stockChart');
    if (!ctx) return;
    if (stockChartInstance) stockChartInstance.destroy();

    stockChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Stock Óptimo', 'Stock Crítico'],
            datasets: [{ data: [stockData.optimal, stockData.low], backgroundColor: ['#3b82f6', '#ef4444'], borderWidth: 0, hoverOffset: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom' } } }
    });
}

function renderRecentActivity(activities) {
    const tbody = document.getElementById('recent-activity-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (!activities || activities.length === 0) {
        tbody.innerHTML = '<div class="p-6 text-center text-gray-500 font-medium">Sin movimientos recientes.</div>'; return;
    }

    activities.forEach(mov => {
        const isEntry = mov.type === 'IN';
        const typeClass = isEntry ? 'bg-blue-500/20 text-blue-500' : 'bg-orange-500/20 text-orange-500';
        const typeIcon = isEntry ? 'fa-arrow-down' : 'fa-arrow-up';
        const partName = mov.spare_part ? mov.spare_part.name : 'Pieza Eliminada';
        
        tbody.innerHTML += `
            <div class="flex items-center justify-between p-4 hover:bg-slate-800/50 transition border-b border-gray-800 last:border-0">
                <div class="flex items-center space-x-4 w-1/2">
                    <div class="p-2 rounded-lg ${typeClass} flex-shrink-0"><i class="fas ${typeIcon} w-4 text-center"></i></div>
                    <div class="truncate"><p class="text-sm font-bold text-gray-200 truncate" title="${partName}">${partName}</p></div>
                </div>
                <div class="w-1/4 text-center">
                    <span class="text-sm font-black ${isEntry ? 'text-blue-400' : 'text-orange-400'}">${isEntry ? '+' : '-'}${mov.quantity}</span>
                </div>
                <div class="w-1/4 text-right">
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">@${mov.user ? mov.user.name : 'Sis'}</p>
                </div>
            </div>`;
    });
}