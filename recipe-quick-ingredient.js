(function setupChefRecipeIngredients(){
  let input=document.getElementById('draftIngredient');
  if(!input)return;

  if(input.tagName==='SELECT'){
    const replacement=document.createElement('input');
    replacement.id='draftIngredient';
    replacement.placeholder='主厨配料名称，例如：大虾、姜末、上汤';
    input.replaceWith(replacement);
    input=replacement;
  }

  let list=document.getElementById('recipeIngredientLibraryOptions');
  if(!list){
    list=document.createElement('datalist');
    list.id='recipeIngredientLibraryOptions';
    document.body.appendChild(list);
  }

  function ingredientLabel(i){
    const parts=[String(i.name||'').trim()];
    if(i.name_en)parts.push(String(i.name_en).trim());
    let label=parts.filter(Boolean).join(' / ');
    if(i.supplier)label+=' · '+String(i.supplier).trim();
    return label;
  }

  function refreshIngredientLibraryOptions(){
    list.innerHTML=state.ingredients.map(i =>
      `<option value="${esc(ingredientLabel(i))}"></option>`
    ).join('');
  }

  function findIngredient(query){
    const q=String(query||'').trim().toLowerCase();
    if(!q)return {ingredient:null,multiple:false};

    const exact=state.ingredients.find(i=>ingredientLabel(i).toLowerCase()===q);
    if(exact)return {ingredient:exact,multiple:false};

    const matches=state.ingredients.filter(i=>{
      const hay=[
        i.name,
        i.name_en,
        i.supplier,
        ingredientLabel(i)
      ].map(v=>String(v||'').toLowerCase());
      return hay.some(v=>v.includes(q));
    });

    return {
      ingredient:matches.length===1?matches[0]:null,
      multiple:matches.length>1
    };
  }

  document.getElementById('addDraftIngredientBtn').onclick=()=>{
    const name=(input.value||'').trim();
    const quantity=Number(document.getElementById('draftQuantity').value);
    const unit=document.getElementById('draftUnit').value;
    const waste_percent=Number(document.getElementById('draftWaste').value||0);

    if(!name||quantity<=0)return toast('请输入主厨配料名称和用量');

    state.draftIngredients.push({
      chef_name:name,
      ingredient_id:null,
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

  window.mapDraftIngredient=index=>{
    const row=state.draftIngredients[index];
    if(!row)return;

    const field=document.getElementById('ingredientMap_'+index);
    const result=findIngredient(field?.value||'');

    if(result.multiple)return toast('找到多个原材料，请从下拉建议中选择完整的一项');
    if(!result.ingredient)return toast('找不到对应原材料，请换名称、英文名或供应商搜索');

    row.ingredient_id=result.ingredient.id;
    row._mapping_search=ingredientLabel(result.ingredient);
    renderDraftIngredients();
    toast('已对应原材料：'+result.ingredient.name);
  };

  window.clearDraftIngredientMapping=index=>{
    const row=state.draftIngredients[index];
    if(!row)return;
    row.ingredient_id=null;
    row._mapping_search='';
    renderDraftIngredients();
  };

  renderDraftIngredients=function(){
    refreshIngredientLibraryOptions();

    const c=draftCosting();
    const rows=document.getElementById('draftIngredientRows');

    rows.innerHTML=state.draftIngredients.length
      ?state.draftIngredients.map((x,index)=>{
        const mapped=state.ingredients.find(y=>y.id===x.ingredient_id);
        const chefName=String(x.chef_name||mapped?.name||'').trim();
        const mappedLabel=mapped?ingredientLabel(mapped):'';
        const inputValue=String(x._mapping_search||mappedLabel||'');
        const unitCostText=mapped?`${money(unitCost(mapped))}/${esc(mapped.base_unit||'')}`:'待对应';
        const costText=mapped?money(ingredientCost(x)):'0.00';
        const supplier=mapped?.supplier? `<div class="mapping-supplier">供应商：${esc(mapped.supplier)}</div>` : '';
        const status=mapped
          ?`<div class="mapping-status mapped">已对应：${esc(mapped.name||'')}${supplier}</div>`
          :'<div class="mapping-status pending">待对应原材料</div>';

        return `<tr>
          <td><strong>${esc(chefName)}</strong></td>
          <td>${Number(x.quantity)} ${esc(x.unit)}</td>
          <td>
            <div class="ingredient-map-control">
              <input id="ingredientMap_${index}" list="recipeIngredientLibraryOptions" value="${esc(inputValue)}" placeholder="搜索原材料 / 英文名 / 供应商"/>
              <button type="button" class="mini-btn map-btn" onclick="mapDraftIngredient(${index})">对应</button>
              ${mapped?`<button type="button" class="mini-btn" onclick="clearDraftIngredientMapping(${index})">取消</button>`:''}
            </div>
            ${status}
          </td>
          <td>${unitCostText}</td>
          <td>${pct(x.waste_percent)}</td>
          <td>${costText}</td>
          <td><button type="button" class="mini-btn danger-btn" onclick="removeDraftIngredient(${index})">删除</button></td>
        </tr>`;
      }).join('')
      :'<tr><td colspan="7">请先输入主厨食谱里的配料名称</td></tr>';

    document.getElementById('draftCostTotal').textContent=money(c.total);
    document.getElementById('draftCostPerYield').textContent=money(c.per);
    document.getElementById('draftCostPercent').textContent=pct(c.fc);
    document.getElementById('draftGrossProfit').textContent=`${money(c.gp)} ｜ ${pct(c.margin)}`;
  };

  refreshIngredientLibraryOptions();
})();