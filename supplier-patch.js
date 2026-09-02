function renderIngredients(){
  $('ingredientRows').innerHTML=state.ingredients.length
    ? state.ingredients.map(i=>`<tr><td><strong>${esc(i.name)}</strong></td><td>${esc(i.category)}</td><td>${esc(i.supplier||'-')}</td><td>${Number(i.purchase_quantity)} ${esc(i.purchase_unit)}</td><td>${money(i.purchase_price)}</td><td>${pct(i.yield_percent)}</td><td>${money(unitCost(i))}/${esc(i.base_unit)}</td><td><div class="action-row"><button class="mini-btn" onclick="editIngredient('${i.id}')">编辑</button><button class="mini-btn danger-btn" onclick="deleteIngredient('${i.id}')">删除</button></div></td></tr>`).join('')
    : '<tr><td colspan="8">还没有原材料</td></tr>';
  renderSuppliers();
}

(function setupSupplierView(){
  const nav=document.querySelector('.sidebar nav');
  if(nav&&!document.querySelector('[data-view="suppliers"]')){
    const b=document.createElement('button');
    b.className='nav-btn';
    b.dataset.view='suppliers';
    b.textContent='供应商';
    nav.insertBefore(b,nav.querySelector('[data-view="recipes"]'));
  }
  const main=document.querySelector('.main');
  if(main&&!$('suppliersView')){
    const section=document.createElement('section');
    section.id='suppliersView';
    section.className='view hidden';
    section.innerHTML=`<div class="panel"><div class="panel-head"><div><h3>供应商</h3><p class="muted">按供应商查看采购的原材料、规格和价格</p></div></div><div id="supplierGroups" style="padding:18px 20px"></div></div>`;
    main.appendChild(section);
  }
  const oldSwitch=switchView;
  switchView=function(name){
    if(name==='suppliers'){
      document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.view===name));
      document.querySelectorAll('.view').forEach(x=>x.classList.add('hidden'));
      $('suppliersView').classList.remove('hidden');
      $('pageTitle').textContent='供应商';
      $('pageSubtitle').textContent='查看每个供应商提供的原材料';
      renderSuppliers();
      return;
    }
    oldSwitch(name);
  };
  document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
})();

function renderSuppliers(){
  const box=$('supplierGroups');
  if(!box)return;
  const groups={};
  state.ingredients.forEach(i=>{
    const s=(i.supplier||'').trim()||'未填写供应商';
    (groups[s]||(groups[s]=[])).push(i);
  });
  const names=Object.keys(groups).sort((a,b)=>a.localeCompare(b,'zh-CN'));
  box.innerHTML=names.length?names.map(name=>{
    const rows=groups[name].map(i=>`<tr><td><strong>${esc(i.name)}</strong></td><td>${esc(i.category)}</td><td>${Number(i.purchase_quantity)} ${esc(i.purchase_unit)}</td><td>${money(i.purchase_price)}</td><td>${money(unitCost(i))}/${esc(i.base_unit)}</td></tr>`).join('');
    return `<div style="margin-bottom:18px;border:1px solid #eceff3;border-radius:14px;overflow:hidden"><div style="padding:14px 16px;background:#fafbfc;display:flex;justify-content:space-between;align-items:center"><strong>${esc(name)}</strong><span class="muted">${groups[name].length} 项原材料</span></div><div class="table-wrap"><table><thead><tr><th>原材料</th><th>分类</th><th>采购规格</th><th>采购价</th><th>实际单位成本</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }).join(''):'<p class="muted">还没有供应商资料。请先在原材料里填写供应商。</p>';
}

renderIngredients();
renderSuppliers();
