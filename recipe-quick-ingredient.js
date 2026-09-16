(function setupQuickRecipeIngredient(){
  const oldSelect=document.getElementById('draftIngredient');
  if(!oldSelect)return;

  const list=document.createElement('datalist');
  list.id='draftIngredientOptions';
  oldSelect.replaceWith(Object.assign(document.createElement('input'),{
    id:'draftIngredient',
    placeholder:'输入原材料名称，例如：皮蛋、姜末、蒜蓉'
  }));
  document.getElementById('draftIngredient').setAttribute('list','draftIngredientOptions');
  document.getElementById('draftIngredient').after(list);

  const qtyInput=document.getElementById('draftQuantity');
  if(qtyInput && !document.getElementById('draftDisplayQuantity')){
    const display=document.createElement('input');
    display.id='draftDisplayQuantity';
    display.placeholder='厨房用量，例如：两粒 / 少许 / 1叶';
    qtyInput.parentNode.insertBefore(display,qtyInput);
    qtyInput.placeholder='Costing 数量（可留空）';
    qtyInput.min='0';
  }

  function refreshDraftIngredientOptions(){
    const dl=document.getElementById('draftIngredientOptions');
    if(!dl)return;
    dl.innerHTML=state.ingredients.map(i=>`<option value="${esc(i.name)}">${esc(i.supplier||i.category||'')}</option>`).join('');
  }

  const previousRenderIngredients=renderIngredients;
  renderIngredients=function(){
    previousRenderIngredients();
    refreshDraftIngredientOptions();
  };

  const materialTable=document.querySelector('#recipeDialog .recipe-material-section table');
  const head=materialTable?.querySelector('thead tr');
  if(head){
    const headers=[...head.children];
    if(headers.length===6 && !head.querySelector('[data-display-qty-head]')){
      const th=document.createElement('th');
      th.textContent='厨房用量';
      th.setAttribute('data-display-qty-head','1');
      head.insertBefore(th,headers[1]);
      headers[1].textContent='Costing 用量';
    }
  }

  renderDraftIngredients=function(){
    const c=draftCosting();
    const body=document.getElementById('draftIngredientRows');
    body.innerHTML=state.draftIngredients.length?state.draftIngredients.map((x,index)=>{
      const i=state.ingredients.find(y=>y.id===x.ingredient_id);
      const costingQty=Number(x.quantity||0)>0?`${Number(x.quantity)} ${esc(x.unit)}`:'<span class="muted">待估算</span>';
      const displayQty=esc(x.display_quantity||'')||costingQty;
      return `<tr><td>${esc(i?.name||'')}</td><td>${displayQty}</td><td>${costingQty}</td><td>${money(i?unitCost(i):0)}/${esc(i?.base_unit||'')}</td><td>${pct(x.waste_percent)}</td><td>${money(ingredientCost(x))}</td><td><button type="button" class="mini-btn danger-btn" onclick="removeDraftIngredient(${index})">删除</button></td></tr>`;
    }).join(''):'<tr><td colspan="7">请输入或选择原材料加入食谱</td></tr>';
    document.getElementById('draftCostTotal').textContent=money(c.total);
    document.getElementById('draftCostPerYield').textContent=money(c.per);
    document.getElementById('draftCostPercent').textContent=pct(c.fc);
    document.getElementById('draftGrossProfit').textContent=`${money(c.gp)} ｜ ${pct(c.margin)}`;
  };

  document.getElementById('addDraftIngredientBtn').onclick=async()=>{
    const input=document.getElementById('draftIngredient');
    const name=(input.value||'').trim();
    const display_quantity=(document.getElementById('draftDisplayQuantity')?.value||'').trim();
    const rawQty=document.getElementById('draftQuantity').value;
    const quantity=rawQty===''?0:Number(rawQty);
    const unit=document.getElementById('draftUnit').value;
    const waste_percent=Number(document.getElementById('draftWaste').value||0);
    if(!name)return toast('请输入原材料名称');
    if(!display_quantity && quantity<=0)return toast('请填写厨房用量，或填写 Costing 数量');

    let ingredient=state.ingredients.find(i=>String(i.name||'').trim().toLowerCase()===name.toLowerCase());
    if(!ingredient){
      const row={
        name,
        category:'待完善',
        purchase_quantity:1,
        purchase_unit:unit,
        purchase_price:0,
        base_unit:unit,
        base_quantity:1,
        yield_percent:100,
        supplier:'',
        notes:'食谱快速新增，待完善采购资料',
        updated_at:new Date().toISOString()
      };
      let res=await sb.from('ingredients').insert(row).select().single();
      if(res.error){
        const retry=await sb.from('ingredients').select('*').ilike('name',name).limit(1).maybeSingle();
        if(retry.error||!retry.data)return toast(res.error.message);
        ingredient=retry.data;
      }else ingredient=res.data;
      if(!state.ingredients.some(i=>i.id===ingredient.id))state.ingredients.push(ingredient);
      refreshDraftIngredientOptions();
      toast(`已建立临时原材料：${name}，之后可到原材料页面补采购资料`);
    }

    state.draftIngredients.push({ingredient_id:ingredient.id,display_quantity,quantity,unit,waste_percent,sort_order:state.draftIngredients.length});
    input.value='';
    document.getElementById('draftDisplayQuantity').value='';
    document.getElementById('draftQuantity').value='';
    document.getElementById('draftWaste').value=0;
    renderDraftIngredients();
  };

  refreshDraftIngredientOptions();
})();