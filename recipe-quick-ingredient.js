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

  document.getElementById('addDraftIngredientBtn').onclick=async()=>{
    const input=document.getElementById('draftIngredient');
    const name=(input.value||'').trim();
    const quantity=Number(document.getElementById('draftQuantity').value);
    const unit=document.getElementById('draftUnit').value;
    const waste_percent=Number(document.getElementById('draftWaste').value||0);
    if(!name||quantity<=0)return toast('请输入原材料名称和用量');

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
      }else{
        ingredient=res.data;
      }
      if(!state.ingredients.some(i=>i.id===ingredient.id))state.ingredients.push(ingredient);
      refreshDraftIngredientOptions();
      toast(`已建立临时原材料：${name}，之后可到原材料页面补采购资料`);
    }

    state.draftIngredients.push({
      ingredient_id:ingredient.id,
      quantity,
      unit,
      waste_percent,
      sort_order:state.draftIngredients.length
    });
    input.value='';
    document.getElementById('draftQuantity').value='';
    document.getElementById('draftWaste').value=0;
    renderDraftIngredients();
  };

  refreshDraftIngredientOptions();
})();
