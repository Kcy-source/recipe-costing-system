function renderIngredients(){
  $('ingredientRows').innerHTML=state.ingredients.length
    ? state.ingredients.map(i=>`<tr><td><strong>${esc(i.name)}</strong></td><td>${esc(i.category)}</td><td>${esc(i.supplier||'-')}</td><td>${Number(i.purchase_quantity)} ${esc(i.purchase_unit)}</td><td>${money(i.purchase_price)}</td><td>${pct(i.yield_percent)}</td><td>${money(unitCost(i))}/${esc(i.base_unit)}</td><td><div class="action-row"><button class="mini-btn" onclick="editIngredient('${i.id}')">编辑</button><button class="mini-btn danger-btn" onclick="deleteIngredient('${i.id}')">删除</button></div></td></tr>`).join('')
    : '<tr><td colspan="8">还没有原材料</td></tr>';
  renderSupplierSearch();
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
    section.innerHTML=`<div class="panel">
      <div class="panel-head"><div><h3>供应商 / 原材料搜索</h3><p class="muted">输入原材料名称或供应商名称即可查找</p></div></div>
      <div style="padding:18px 20px 10px"><input id="supplierSearchInput" type="search" placeholder="搜索原材料或供应商，例如：味精 / Yummy" style="font-size:16px;padding:13px 14px" /></div>
      <div class="table-wrap"><table><thead><tr><th>原材料</th><th>供应商</th><th>分类</th><th>采购规格</th><th>采购价</th><th>实际单位成本</th></tr></thead><tbody id="supplierSearchRows"></tbody></table></div>
    </div>`;
    main.appendChild(section);
    $('supplierSearchInput').addEventListener('input',renderSupplierSearch);
  }
  const oldSwitch=switchView;
  switchView=function(name){
    if(name==='suppliers'){
      document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.view===name));
      document.querySelectorAll('.view').forEach(x=>x.classList.add('hidden'));
      $('suppliersView').classList.remove('hidden');
      $('pageTitle').textContent='供应商';
      $('pageSubtitle').textContent='按原材料名称或供应商名称搜索';
      renderSupplierSearch();
      return;
    }
    oldSwitch(name);
  };
  document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
})();

function renderSupplierSearch(){
  const rows=$('supplierSearchRows');
  if(!rows)return;
  const q=($('supplierSearchInput')?.value||'').trim().toLowerCase();
  const matches=state.ingredients.filter(i=>{
    if(!q)return true;
    return String(i.name||'').toLowerCase().includes(q) || String(i.supplier||'').toLowerCase().includes(q);
  });
  rows.innerHTML=matches.length
    ? matches.map(i=>`<tr><td><strong>${esc(i.name)}</strong></td><td>${esc(i.supplier||'-')}</td><td>${esc(i.category||'-')}</td><td>${Number(i.purchase_quantity)} ${esc(i.purchase_unit)}</td><td>${money(i.purchase_price)}</td><td>${money(unitCost(i))}/${esc(i.base_unit)}</td></tr>`).join('')
    : `<tr><td colspan="6" class="muted">找不到符合“${esc(q)}”的原材料或供应商</td></tr>`;
}

renderIngredients();
renderSupplierSearch();
