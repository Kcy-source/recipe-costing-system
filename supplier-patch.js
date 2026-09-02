function renderIngredients(){
  const q=($('ingredientSearchInput')?.value||'').trim().toLowerCase();
  const matches=state.ingredients.filter(i=>{
    if(!q)return true;
    return String(i.name||'').toLowerCase().includes(q)
      || String(i.supplier||'').toLowerCase().includes(q)
      || String(i.category||'').toLowerCase().includes(q);
  });
  $('ingredientRows').innerHTML=matches.length
    ? matches.map(i=>`<tr><td><strong>${esc(i.name)}</strong></td><td>${esc(i.category||'-')}</td><td>${esc(i.supplier||'-')}</td><td>${Number(i.purchase_quantity)} ${esc(i.purchase_unit)}</td><td>${money(i.purchase_price)}</td><td>${pct(i.yield_percent)}</td><td>${money(unitCost(i))}/${esc(i.base_unit)}</td><td><div class="action-row"><button class="mini-btn" onclick="editIngredient('${i.id}')">编辑</button><button class="mini-btn danger-btn" onclick="deleteIngredient('${i.id}')">删除</button></div></td></tr>`).join('')
    : `<tr><td colspan="8" class="muted">找不到符合“${esc(q)}”的原材料、供应商或分类</td></tr>`;
}

(function setupIngredientSearch(){
  const oldSupplierNav=document.querySelector('[data-view="suppliers"]');
  if(oldSupplierNav)oldSupplierNav.remove();
  const oldSupplierView=$('suppliersView');
  if(oldSupplierView)oldSupplierView.remove();

  const view=$('ingredientsView');
  if(view&&!$('ingredientSearchInput')){
    const panel=view.querySelector('.panel');
    const tableWrap=panel?.querySelector('.table-wrap');
    if(panel&&tableWrap){
      const wrap=document.createElement('div');
      wrap.style.padding='16px 20px 8px';
      wrap.innerHTML='<input id="ingredientSearchInput" type="search" placeholder="搜索原材料、供应商或分类，例如：味精 / Yummy / 调味料" style="width:100%;font-size:16px;padding:13px 14px" />';
      panel.insertBefore(wrap,tableWrap);
      $('ingredientSearchInput').addEventListener('input',renderIngredients);
    }
  }
})();

renderIngredients();
