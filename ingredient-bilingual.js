(function setupIngredientBilingual(){
  const form=document.getElementById('ingredientForm');
  if(!form)return;

  const nameInput=document.getElementById('ingredientName');
  if(nameInput){
    const nameLabel=nameInput.closest('label');
    if(nameLabel) nameLabel.childNodes[0].textContent='中文名称';
    if(!document.getElementById('ingredientNameEn')){
      const enLabel=document.createElement('label');
      enLabel.innerHTML='英文名称<input id="ingredientNameEn" placeholder="English name" />';
      const firstGrid=form.querySelector('.grid2');
      if(firstGrid) firstGrid.insertBefore(enLabel, firstGrid.children[1] || null);
    }
  }

  const oldEditIngredient=window.editIngredient;
  window.editIngredient=id=>{
    const i=state.ingredients.find(x=>x.id===id);
    oldEditIngredient(id);
    if(i && document.getElementById('ingredientNameEn')){
      document.getElementById('ingredientNameEn').value=i.name_en||'';
    }
  };

  const oldReset=resetIngredientForm;
  resetIngredientForm=function(){
    oldReset();
    if(document.getElementById('ingredientNameEn'))document.getElementById('ingredientNameEn').value='';
  };

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    e.stopImmediatePropagation();
    const id=document.getElementById('ingredientId').value;
    const row={
      name:document.getElementById('ingredientName').value.trim(),
      name_en:document.getElementById('ingredientNameEn').value.trim(),
      category:document.getElementById('ingredientCategory').value.trim()||'其他',
      purchase_quantity:Number(document.getElementById('purchaseQuantity').value),
      purchase_unit:document.getElementById('purchaseUnit').value,
      purchase_price:Number(document.getElementById('purchasePrice').value),
      base_unit:document.getElementById('baseUnit').value,
      base_quantity:Number(document.getElementById('baseQuantity').value),
      yield_percent:Number(document.getElementById('yieldPercent').value),
      supplier:document.getElementById('supplier').value.trim(),
      notes:document.getElementById('ingredientNotes').value.trim(),
      updated_at:new Date().toISOString()
    };
    const q=id?sb.from('ingredients').update(row).eq('id',id):sb.from('ingredients').insert(row);
    const {error}=await q;
    if(error)return toast(error.message);
    document.getElementById('ingredientDialog').close();
    toast('原材料已保存');
    await loadAll();
  },true);

  renderIngredients=function(){
    const q=(document.getElementById('ingredientSearchInput')?.value||'').trim().toLowerCase();
    const matches=state.ingredients.filter(i=>{
      if(!q)return true;
      return String(i.name||'').toLowerCase().includes(q)
        || String(i.name_en||'').toLowerCase().includes(q)
        || String(i.supplier||'').toLowerCase().includes(q)
        || String(i.category||'').toLowerCase().includes(q);
    });
    document.getElementById('ingredientRows').innerHTML=matches.length
      ? matches.map(i=>`<tr><td><strong>${esc(i.name)}</strong>${i.name_en?`<br><span class="muted">${esc(i.name_en)}</span>`:''}</td><td>${esc(i.category||'-')}</td><td>${esc(i.supplier||'-')}</td><td>${Number(i.purchase_quantity)} ${esc(i.purchase_unit)}</td><td>${money(i.purchase_price)}</td><td>${pct(i.yield_percent)}</td><td>${money(unitCost(i))}/${esc(i.base_unit)}</td><td><div class="action-row"><button class="mini-btn" onclick="editIngredient('${i.id}')">编辑</button><button class="mini-btn danger-btn" onclick="deleteIngredient('${i.id}')">删除</button></div></td></tr>`).join('')
      : `<tr><td colspan="8" class="muted">找不到符合“${esc(q)}”的原材料、供应商或分类</td></tr>`;
  };

  const search=document.getElementById('ingredientSearchInput');
  if(search){
    search.placeholder='搜索中英文原材料名、供应商或分类';
    search.oninput=renderIngredients;
  }

  renderIngredients();
})();