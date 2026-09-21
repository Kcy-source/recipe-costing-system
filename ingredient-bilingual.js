(function setupIngredientBilingual(){
  const form=document.getElementById('ingredientForm');
  if(!form)return;

  unitCost=function(i){
    const gross=Number(i.purchase_price||0);
    const gst=Number(i.gst_percent||0);
    const net=gst>0?gross/(1+gst/100):gross;
    return net/(Number(i.base_quantity||1)*(Number(i.yield_percent||100)/100));
  };

  function netPurchasePrice(){
    const gross=Number(document.getElementById('purchasePrice')?.value||0);
    const gst=Number(document.getElementById('gstPercent')?.value||0);
    return gst>0?gross/(1+gst/100):gross;
  }

  const purchasePriceInput=document.getElementById('purchasePrice');
  if(purchasePriceInput){
    const priceLabel=purchasePriceInput.closest('label');
    if(priceLabel) priceLabel.childNodes[0].textContent='采购价（含 GST）$ ';
    const priceRow=purchasePriceInput.closest('.grid3');
    if(priceRow && !document.getElementById('gstPercent')){
      priceRow.className='grid4';
      const gstLabel=document.createElement('label');
      gstLabel.innerHTML='GST %<input id="gstPercent" type="number" step="0.1" min="0" max="100" value="9" />';
      priceRow.appendChild(gstLabel);
      const netBox=document.createElement('div');
      netBox.id='netPurchasePriceBox';
      netBox.className='hint';
      netBox.style.marginTop='-6px';
      priceRow.after(netBox);
    }
  }

  function updateNetPurchasePrice(){
    const box=document.getElementById('netPurchasePriceBox');
    if(box) box.textContent='未含 GST 净采购价：'+money(netPurchasePrice());
  }
  document.getElementById('purchasePrice')?.addEventListener('input',updateNetPurchasePrice);
  document.getElementById('gstPercent')?.addEventListener('input',updateNetPurchasePrice);

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
    if(i){
      if(document.getElementById('ingredientNameEn'))document.getElementById('ingredientNameEn').value=i.name_en||'';
      if(document.getElementById('gstPercent'))document.getElementById('gstPercent').value=Number(i.gst_percent||0);
      updateNetPurchasePrice();
    }
  };

  const oldReset=resetIngredientForm;
  resetIngredientForm=function(){
    oldReset();
    if(document.getElementById('ingredientNameEn'))document.getElementById('ingredientNameEn').value='';
    if(document.getElementById('gstPercent'))document.getElementById('gstPercent').value=9;
    updateNetPurchasePrice();
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
      purchase_unit:document.getElementById('purchaseUnit').value.trim(),
      purchase_price:Number(document.getElementById('purchasePrice').value),
      gst_percent:Number(document.getElementById('gstPercent')?.value||0),
      base_unit:document.getElementById('baseUnit').value.trim(),
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
      ? matches.map(i=>{
          const gst=Number(i.gst_percent||0);
          const gross=Number(i.purchase_price||0);
          const net=gst>0?gross/(1+gst/100):gross;
          return '<tr><td><strong>'+esc(i.name)+'</strong>'
            +(i.name_en?'<br><span class="muted">'+esc(i.name_en)+'</span>':'')
            +'</td><td>'+esc(i.category||'-')+'</td><td>'+esc(i.supplier||'-')+'</td><td>'
            +Number(i.purchase_quantity)+' '+esc(i.purchase_unit)+'</td><td>'
            +money(gross)+'<br><span class="muted">GST '+pct(gst)+' · 净 '+money(net)+'</span></td><td>'
            +pct(i.yield_percent)+'</td><td>'+money(unitCost(i))+'/'+esc(i.base_unit)
            +'</td><td><div class="action-row"><button class="mini-btn" onclick="editIngredient(\''+i.id+'\')">编辑</button><button class="mini-btn danger-btn" onclick="deleteIngredient(\''+i.id+'\')">删除</button></div></td></tr>';
        }).join('')
      : '<tr><td colspan="8" class="muted">找不到符合“'+esc(q)+'”的原材料、供应商或分类</td></tr>';
  };

  const search=document.getElementById('ingredientSearchInput');
  if(search){
    search.placeholder='搜索中英文原材料名、供应商或分类';
    search.oninput=renderIngredients;
  }

  updateNetPurchasePrice();
  renderIngredients();
  if(typeof renderRecipes==='function')renderRecipes();
  if(typeof renderDashboard==='function')renderDashboard();
})();