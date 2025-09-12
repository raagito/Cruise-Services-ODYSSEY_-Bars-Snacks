(function(){
	let __lastStockData = { bajo: [], ideal: [] };
	let __stockPage = { bajo: 0, ideal: 0 };
	function escapeHtml(str){
		if(str==null) return '';
		return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
	}

	function renderMasVendidos(data){
		const host = document.getElementById('mas-vendidos-contenedor');
		if(!host) return;
		host.innerHTML = '';
		const categorias = (data && data.categorias) || [];
		if(!categorias.length){
			host.innerHTML = '<div class="analisis-empty">Sin ventas completadas aún.</div>';
			return;
		}
		const frag = document.createDocumentFragment();
		categorias.forEach(cat=>{
			const box = document.createElement('div');
			box.className = 'mv-categoria';
			const items = (cat.items||[]).map((it,idx)=>{
				const rank = idx+1;
				return `<li class="mv-item">
					<span class="mv-rank">#${rank}</span>
					<span class="mv-name">${escapeHtml(it.nombre)}</span>
					<span class="mv-total">x${it.total}</span>
				</li>`;
			}).join('');
			box.innerHTML = `
				<h4 class="mv-title">${escapeHtml(cat.categoria||'Sin categoría')}</h4>
				<ul class="mv-list">${items||'<li class="mv-item empty">Sin datos</li>'}</ul>`;
			frag.appendChild(box);
		});
		host.appendChild(frag);
	}

	function renderStock(data){
		const bajoUl = document.getElementById('stock-bajo-list');
		const idealUl = document.getElementById('stock-ideal-list');
		if(!bajoUl || !idealUl) return;
		const bajo = (data && data.bajo) || [];
		const ideal = (data && data.ideal) || [];
		__lastStockData = { bajo: bajo.slice(), ideal: ideal.slice() };
		__lastStockData = { bajo: bajo.slice(), ideal: ideal.slice() };
		// Mostrar solo los primeros 5, con opción de ver más/reducir
	let mostrarBajo = bajoUl.getAttribute('data-ver-mas') === 'true' ? bajo : bajo.slice(0,10);
	let mostrarIdeal = idealUl.getAttribute('data-ver-mas') === 'true' ? ideal : ideal.slice(0,10);

		bajoUl.innerHTML = mostrarBajo.length ? mostrarBajo.map(it=>{
			return `<li class="st-item st-low" data-prod-id="${it.id}" data-prod-nombre="${escapeHtml(it.nombre)}" style="padding:4px 8px;min-height:unset;">
				<span class="st-name" style="font-size:.92rem;">${escapeHtml(it.nombre)}</span>
				<span class="st-badge">${it.cantidad}/${it.cantidad_ideal}</span>
			</li>`;
		}).join('') : '<li class="st-item empty">Sin alertas</li>';
		if(bajo.length > 5){
			bajoUl.innerHTML += `<li class="st-item st-toggle"><button id="btn-ver-mas-bajo" class="st-toggle-btn btn-ver-mas">${bajoUl.getAttribute('data-ver-mas') === 'true' ? 'Ver menos' : 'Ver más'}</button></li>`;
		}

		idealUl.innerHTML = mostrarIdeal.length ? mostrarIdeal.map(it=>{
			return `<li class="st-item st-ideal" style="padding:4px 8px;min-height:unset;">
				<span class="st-name" style="font-size:.92rem;">${escapeHtml(it.nombre)}</span>
				<span class="st-badge good">${it.cantidad}/${it.cantidad_ideal}</span>
			</li>`;
		}).join('') : '<li class="st-item empty">Sin coincidencias</li>';
		if(ideal.length > 5){
			idealUl.innerHTML += `<li class="st-item st-toggle"><button id="btn-ver-mas-ideal" class="st-toggle-btn btn-ver-mas">${idealUl.getAttribute('data-ver-mas') === 'true' ? 'Ver menos' : 'Ver más'}</button></li>`;
		}


	}

	// Modal Restock helpers
	function abrirModalRestock(preset){
		const modal = document.getElementById('modal-restock');
		if(!modal) return;
		const selWrap = document.getElementById('restock-producto-selector');
		const fijoWrap = document.getElementById('restock-producto-fijo');
		const sel = document.getElementById('restock-producto-select');
		const fijoNombre = document.getElementById('restock-producto-nombre');
		const fijoId = document.getElementById('restock-producto-id');
		const cantidad = document.getElementById('restock-cantidad');
		const comentario = document.getElementById('restock-comentario');
		if(preset && preset.producto_id){
			if(selWrap) selWrap.style.display='none';
			if(fijoWrap) fijoWrap.style.display='';
			if(fijoNombre) fijoNombre.value = preset.nombre || '';
			if(fijoId) fijoId.value = preset.producto_id;
		}else{
			if(selWrap) selWrap.style.display='';
			if(fijoWrap) fijoWrap.style.display='none';
			if(fijoId) fijoId.value = '';
		}
		if(cantidad) cantidad.value = '';
		if(comentario) comentario.value = '';
		modal.setAttribute('aria-hidden','false');
		modal.style.display = 'block';
	}
	function cerrarModalRestock(){
		const modal = document.getElementById('modal-restock');
		if(!modal) return;
		modal.setAttribute('aria-hidden','true');
		modal.style.display = 'none';
	}

	function cargarProductosAlmacenParaRestock(){
		const sel = document.getElementById('restock-producto-select');
		if(!sel) return;
		const items = (__lastStockData && Array.isArray(__lastStockData.bajo)) ? __lastStockData.bajo : [];
		const opts = items.map(p=>`<option value="${p.id}">${escapeHtml(p.nombre)} (${p.cantidad}/${p.cantidad_ideal})</option>`).join('');
		sel.innerHTML = '<option value="">Selecciona...</option>' + opts;
	}

	function bindModalRestockUI(){
		const openBtn = document.getElementById('btn-abrir-restock');
		const closeBtn = document.getElementById('close-modal-restock');
		const cancelBtn = document.getElementById('cancelar-restock');
		const form = document.getElementById('form-restock');
		if(openBtn){ openBtn.addEventListener('click', ()=>{ abrirModalRestock(null); }); }
		if(closeBtn){ closeBtn.addEventListener('click', cerrarModalRestock); }
		if(cancelBtn){ cancelBtn.addEventListener('click', cerrarModalRestock); }
		if(form){
			form.addEventListener('submit', async (ev)=>{
				ev.preventDefault();
				const fijoId = document.getElementById('restock-producto-id');
				const sel = document.getElementById('restock-producto-select');
				const cantidad = document.getElementById('restock-cantidad');
				const comentario = document.getElementById('restock-comentario');
				const pid = (fijoId && fijoId.value) ? parseInt(fijoId.value,10) : parseInt((sel && sel.value)||'0',10);
				const cant = parseInt((cantidad && cantidad.value)||'0',10);
				if(!pid || !cant || cant<=0){ return; }
				try{
					const payload = { producto_id: pid, cantidad: cant, comentario: (comentario && comentario.value)||'' };
					const res = await fetch('/bar/analisis/restock/', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
					const data = await res.json();
					if(data && data.success){
						cerrarModalRestock();
						// refrescar stock para feedback
						try{ const st = await fetch('/bar/analisis/stock/?limit_ideal=10').then(r=>r.json()); if(st && st.success) renderStock(st); }catch(_e){}
					}
				}catch(_e){/* noop */}
			});
		}
	}

	async function cargarAnalisis(){
		try{
			const [mv, st] = await Promise.all([
				fetch('/bar/analisis/mas-vendidos/?limit=5').then(r=>r.json()).catch(()=>null),
				fetch('/bar/analisis/stock/?limit_ideal=10').then(r=>r.json()).catch(()=>null),
			]);
			if(mv && mv.success) renderMasVendidos(mv); else renderMasVendidos({categorias:[]});
			if(st && st.success) renderStock(st); else renderStock({bajo:[], ideal:[]});
		}catch(_e){
			renderMasVendidos({categorias:[]});
			renderStock({bajo:[], ideal:[]});
		}
	}

	document.addEventListener('DOMContentLoaded', async ()=>{
		await cargarAnalisis();
		bindModalRestockUI();
		cargarProductosAlmacenParaRestock();

		// Listeners para ver más/ver menos
		document.getElementById('stock-bajo-list').addEventListener('click', function(e){
			if(e.target && e.target.id === 'btn-ver-mas-bajo'){
				const ul = document.getElementById('stock-bajo-list');
				ul.setAttribute('data-ver-mas', ul.getAttribute('data-ver-mas') === 'true' ? 'false' : 'true');
				renderStock(__lastStockData);
			}
		});
		document.getElementById('stock-ideal-list').addEventListener('click', function(e){
			if(e.target && e.target.id === 'btn-ver-mas-ideal'){
				const ul = document.getElementById('stock-ideal-list');
				ul.setAttribute('data-ver-mas', ul.getAttribute('data-ver-mas') === 'true' ? 'false' : 'true');
				renderStock(__lastStockData);
			}
		});
	});
})();
