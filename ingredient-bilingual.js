(function setupIngredientEnhancements(){
  const form=document.getElementById('ingredientForm');
  if(!form)return;

  function unitMoney(n){
    const v=Number(n||0);
    return '$'+v.toFixed(Math.abs(v)<1?3:2);
  }

  function netPrice(i){
    const gross=Number(i.purchase_price||0);
    const gst=Number(i.gst_percent||0);
    return gst>0?gross/(1+gst/100):gross;
  }

  unitCost=function(i){
    return netPrice(i)/(Number(i.base_quantity||1)*(Number(i.yield_percent||100)/100));
  };

  function currentNetPurchasePrice(){
    const gross=Number(document.getElementById('purchasePrice')?.value||0);
    const gst=Number(document.getElementById('gstPercent')?.value||0);
    return gst>0?gross/(1+gst/100):gross;
  }

  const nameInput=document.getElementById('ingredientName');
  if(nameInput){
    const nameLabel=nameInput.closest('label');
    if(nameLabel)nameLabel.childNodes[0].textContent='中文名称';
    if(!document.getElementById('ingredientNameEn')){
      const enLabel=document.createElement('label');
      enLabel.innerHTML='英文名称<input id="ingredientNameEn" placeholder="English name" />';
      const firstGrid=form.querySelector('.grid2');
      if(firstGrid)firstGrid.appendChild(enLabel);
    }
  }

  const purchasePriceInput=document.getElementById('purchasePrice');
  if(purchasePriceInput){
    const label=purchasePriceInput.closest('label');
    if(label)label.childNodes[0].textContent='采购价（含 GST）$ ';
    const row=purchasePriceInput.closest('.grid3');
    if(row&&!document.getElementById('gstPercent')){
      row.className='grid4';
      const gstLabel=document.createElement('label');
      gstLabel.innerHTML='GST %<input id="gstPercent" type="number" step="0.1" min="0" max="100" value="9" />';
      row.appendChild(gstLabel);
      const netBox=document.createElement('div');
      netBox.id='netPurchasePriceBox';
      netBox.className='hint';
      netBox.style.marginTop='-6px';
      row.after(netBox);
    }
  }

  function updateNetPurchasePrice(){
    const box=document.getElementById('netPurchasePriceBox');
    if(box)box.textContent='未含 GST 净采购价：'+money(currentNetPurchasePrice());
  }

  document.getElementById('purchasePrice')?.addEventListener('input',updateNetPurchasePrice);
  document.getElementById('gstPercent')?.addEventListener('input',updateNetPurchasePrice);

  const previousEditIngredient=window.editIngredient;
  window.editIngredient=id=>{
    const item=state.ingredients.find(x=>String(x.id)===String(id));
    previousEditIngredient(id);
    if(!item)return;
    if(document.getElementById('ingredientNameEn')){
      document.getElementById('ingredientNameEn').value=item.name_en||'';
    }
    if(document.getElementById('gstPercent')){
      document.getElementById('gstPercent').value=Number(item.gst_percent||0);
    }
    updateNetPurchasePrice();
  };

  const previousResetIngredientForm=resetIngredientForm;
  resetIngredientForm=function(){
    previousResetIngredientForm();
    if(document.getElementById('ingredientNameEn')){
      document.getElementById('ingredientNameEn').value='';
    }
    if(document.getElementById('gstPercent')){
      document.getElementById('gstPercent').value=9;
    }
    updateNetPurchasePrice();
  };

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    e.stopImmediatePropagation();

    const id=document.getElementById('ingredientId').value;
    const row={
      name:document.getElementById('ingredientName').value.trim(),
      name_en:document.getElementById('ingredientNameEn')?.value.trim()||'',
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

    let result;
    if(id){
      result=await sb.from('ingredients').update(row).eq('id',id);
    }else{
      const existing=state.ingredients.find(i=>String(i.name||'').trim().toLowerCase()===row.name.toLowerCase());
      if(existing){
        result=await sb.from('ingredients').update(row).eq('id',existing.id);
      }else{
        result=await sb.from('ingredients').insert(row);
      }
    }

    if(result.error)return toast(result.error.message);

    document.getElementById('ingredientDialog').close();
    toast(id?'原材料已保存':'原材料已保存；同名资料会自动更新');
    await loadAll();
  },true);

  function ingredientMatches(i,q){
    if(!q)return true;
    return String(i.name||'').toLowerCase().includes(q)
      ||String(i.name_en||'').toLowerCase().includes(q)
      ||String(i.supplier||'').toLowerCase().includes(q);
  }

  const ingredientSortable=[
    {key:'name',label:'名称'},
    {key:'supplier',label:'供应商'},
    {key:'spec',label:'采购规格'},
    {key:'price',label:'采购价'},
    {key:'yield',label:'净料率'},
    {key:'unitcost',label:'实际单位成本'}
  ];
  let ingredientSortKey=localStorage.getItem('ingredientSortKey')||'name';
  let ingredientSortDir=localStorage.getItem('ingredientSortDir')||'asc';

  function sortedIngredients(list){
    const dir=ingredientSortDir==='desc'?-1:1;
    const text=(a,b)=>String(a||'').localeCompare(String(b||''),'zh-CN',{numeric:true,sensitivity:'base'});
    const num=(a,b)=>Number(a||0)-Number(b||0);
    return [...list].sort((a,b)=>{
      let result=0;
      if(ingredientSortKey==='name')result=text(a.name,b.name);
      else if(ingredientSortKey==='supplier')result=text(a.supplier,b.supplier);
      else if(ingredientSortKey==='spec')result=text(String(a.purchase_quantity||'')+' '+String(a.purchase_unit||''),String(b.purchase_quantity||'')+' '+String(b.purchase_unit||''));
      else if(ingredientSortKey==='price')result=num(netPrice(a),netPrice(b));
      else if(ingredientSortKey==='yield')result=num(a.yield_percent,b.yield_percent);
      else if(ingredientSortKey==='unitcost')result=num(unitCost(a),unitCost(b));
      return result*dir;
    });
  }

  function setupIngredientSortHeaders(){
    const head=document.querySelector('#ingredientsView thead tr');
    if(!head)return;
    const ths=[...head.querySelectorAll('th')];
    ingredientSortable.forEach((cfg,i)=>{
      const th=ths[i];
      if(!th)return;
      th.dataset.sortKey=cfg.key;
      th.style.cursor='pointer';
      th.style.userSelect='none';
      th.onclick=e=>{
        if(e.target.closest('.ingredient-col-resizer'))return;
        if(ingredientSortKey===cfg.key)ingredientSortDir=ingredientSortDir==='asc'?'desc':'asc';
        else{ingredientSortKey=cfg.key;ingredientSortDir='asc';}
        localStorage.setItem('ingredientSortKey',ingredientSortKey);
        localStorage.setItem('ingredientSortDir',ingredientSortDir);
        updateIngredientSortLabels();
        renderIngredients();
      };
    });
    updateIngredientSortLabels();
  }

  function updateIngredientSortLabels(){
    const head=document.querySelector('#ingredientsView thead tr');
    if(!head)return;
    ingredientSortable.forEach(cfg=>{
      const th=head.querySelector('th[data-sort-key="'+cfg.key+'"]');
      if(!th)return;
      const arrow=ingredientSortKey===cfg.key?(ingredientSortDir==='asc'?' ↑':' ↓'):' ↕';
      const handle=th.querySelector('.ingredient-col-resizer');
      th.textContent=cfg.label+arrow;
      if(handle)th.appendChild(handle);
      th.style.fontWeight=ingredientSortKey===cfg.key?'700':'';
    });
  }

  renderIngredients=function(){
    const q=(document.getElementById('ingredientSearchInput')?.value||'').trim().toLowerCase();
    const matches=sortedIngredients(state.ingredients.filter(i=>ingredientMatches(i,q)));
    const body=document.getElementById('ingredientRows');
    if(!body)return;

    body.innerHTML=matches.length
      ? matches.map(i=>{
          const gst=Number(i.gst_percent||0);
          const gross=Number(i.purchase_price||0);
          const net=netPrice(i);
          return '<tr>'
            +'<td><strong>'+esc(i.name)+'</strong>'
            +(i.name_en?'<br><span class="muted">'+esc(i.name_en)+'</span>':'')
            +'</td>'
            +'<td>'+esc(i.supplier||'-')+'</td>'
            +'<td>'+Number(i.purchase_quantity)+' '+esc(i.purchase_unit)+'</td>'
            +'<td><strong>'+money(net)+'</strong><br><span class="muted">GST '+pct(gst)+' · 含 GST '+money(gross)+'</span></td>'
            +'<td>'+pct(i.yield_percent)+'</td>'
            +'<td>'+unitMoney(unitCost(i))+'/'+esc(i.base_unit)+'</td>'
            +'<td><div class="action-row">'
            +'<button class="mini-btn" onclick="editIngredient(\''+i.id+'\')">编辑</button>'
            +'<button class="mini-btn danger-btn" onclick="deleteIngredient(\''+i.id+'\')">删除</button>'
            +'</div></td>'
            +'</tr>';
        }).join('')
      : '<tr><td colspan="7" class="muted">找不到符合“'+esc(q)+'”的原材料或供应商</td></tr>';
  };

  function ensureResizeStyle(){
    if(document.getElementById('ingredientResizeStyle'))return;
    const style=document.createElement('style');
    style.id='ingredientResizeStyle';
    style.textContent=
      '#ingredientsView table{table-layout:fixed;width:100%;min-width:980px}'
      +'#ingredientsView thead th{position:relative;overflow:visible;white-space:nowrap}'
      +'#ingredientsView .ingredient-col-resizer{position:absolute;top:0;right:-4px;width:8px;height:100%;cursor:col-resize;z-index:5;touch-action:none}'
      +'#ingredientsView .ingredient-col-resizer::after{content:"";position:absolute;right:3px;top:20%;width:1px;height:60%;background:#d6dbe3;opacity:0}'
      +'#ingredientsView thead th:hover .ingredient-col-resizer::after,#ingredientsView .ingredient-col-resizer.active::after{opacity:1}'
      +'body.ingredient-resizing{cursor:col-resize!important;user-select:none!important}';
    document.head.appendChild(style);
  }

  function applySavedWidths(){
    const head=document.querySelector('#ingredientsView thead tr');
    if(!head)return;
    [...head.querySelectorAll('th')].forEach((th,i)=>{
      const saved=Number(localStorage.getItem('ingredientColWidth_'+i));
      if(saved>=60){
        th.style.width=saved+'px';
        th.style.minWidth=saved+'px';
        th.style.maxWidth=saved+'px';
      }
    });
  }

  function ensureResizers(){
    const head=document.querySelector('#ingredientsView thead tr');
    if(!head)return;
    ensureResizeStyle();

    [...head.querySelectorAll('th')].forEach((th,index)=>{
      if(th.querySelector('.ingredient-col-resizer'))return;
      const handle=document.createElement('span');
      handle.className='ingredient-col-resizer';
      handle.title='拖动调整列宽';

      handle.addEventListener('click',e=>{
        e.preventDefault();
        e.stopPropagation();
      });

      handle.addEventListener('mousedown',e=>{
        e.preventDefault();
        e.stopPropagation();
        const startX=e.clientX;
        const startWidth=th.getBoundingClientRect().width;
        handle.classList.add('active');
        document.body.classList.add('ingredient-resizing');

        const onMove=ev=>{
          const width=Math.max(60,Math.round(startWidth+(ev.clientX-startX)));
          th.style.width=width+'px';
          th.style.minWidth=width+'px';
          th.style.maxWidth=width+'px';
        };

        const onUp=()=>{
          handle.classList.remove('active');
          document.body.classList.remove('ingredient-resizing');
          localStorage.setItem('ingredientColWidth_'+index,String(Math.round(th.getBoundingClientRect().width)));
          document.removeEventListener('mousemove',onMove);
          document.removeEventListener('mouseup',onUp);
        };

        document.addEventListener('mousemove',onMove);
        document.addEventListener('mouseup',onUp);
      });

      th.appendChild(handle);
    });

    applySavedWidths();
  }

  const search=document.getElementById('ingredientSearchInput');
  if(search){
    search.placeholder='搜索中英文原材料名或供应商';
    search.oninput=renderIngredients;
  }

  updateNetPurchasePrice();
  setupIngredientSortHeaders();
  renderIngredients();
  ensureResizers();

  if(typeof renderRecipes==='function')renderRecipes();
  if(typeof renderDashboard==='function')renderDashboard();
})();