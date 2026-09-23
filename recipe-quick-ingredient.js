(function setupChefRecipeIngredients(){
  const input=$('draftIngredient'),list=document.createElement('datalist');
  list.id='recipeIngredientLibraryOptions';document.body.appendChild(list);
  input.setAttribute('list',list.id);input.placeholder='输入主厨配料名称，或选择原材料 / 配方';
  function refreshOptions(){list.innerHTML=recipeSources().map(s=>`<option value="${esc(recipeSourceLabel(s))}"></option>`).join('');}
  function findSource(query){
    const q=String(query||'').trim().toLowerCase();if(!q)return [];
    const sources=recipeSources(),exact=sources.filter(s=>recipeSourceLabel(s).toLowerCase()===q);
    return exact.length?exact:sources.filter(s=>[s.name,s.name_en,s.supplier,s.category,recipeSourceLabel(s)].some(v=>String(v||'').toLowerCase().includes(q)));
  }
  function assignSource(row,s){
    row.ingredient_id=s.kind==='ingredient'?s.id:null;row.preparation_id=s.kind==='preparation'?s.id:null;row._mapping_search=recipeSourceLabel(s);
  }
  $('addDraftIngredientBtn').onclick=()=>{
    const name=input.value.trim(),quantity=Number($('draftQuantity').value),unit=$('draftUnit').value.trim(),waste_percent=Number($('draftWaste').value||0);
    if(!name||!Number.isFinite(quantity)||quantity<=0||!unit)return toast('请输入配料名称、用量和单位');
    if(!Number.isFinite(waste_percent)||waste_percent<0||waste_percent>=100)return toast('请检查损耗百分比');
    const row={chef_name:name,ingredient_id:null,preparation_id:null,quantity,unit,waste_percent,sort_order:state.draftIngredients.length};
    const exact=recipeSources().filter(s=>recipeSourceLabel(s)===name);
    if(exact.length===1){assignSource(row,exact[0]);row.chef_name=exact[0].name;}
    state.draftIngredients.push(row);input.value='';$('draftQuantity').value='';$('draftWaste').value=0;renderDraftIngredients();
  };
  window.mapDraftIngredient=index=>{
    const row=state.draftIngredients[index];if(!row)return;
    const matches=findSource($('ingredientMap_'+index)?.value);
    if(matches.length>1)return toast('找到多个原材料或配方，请选择完整的一项');
    if(!matches.length)return toast('找不到对应原材料或配方，请换名称搜索');
    assignSource(row,matches[0]);renderDraftIngredients();
  };
  window.clearDraftIngredientMapping=index=>{
    const row=state.draftIngredients[index];if(!row)return;
    row.ingredient_id=null;row.preparation_id=null;row._mapping_search='';renderDraftIngredients();
  };
  window.updateDraftComponent=(index,field,value)=>{
    const row=state.draftIngredients[index];if(!row)return;
    row[field]=field==='unit'?value.trim():Number(value);renderDraftIngredients();
  };
  renderDraftIngredients=function(){
    refreshOptions();
    $('draftIngredientRows').innerHTML=state.draftIngredients.length?state.draftIngredients.map((x,index)=>{
      const source=recipeSources().find(s=>s.kind==='preparation'?s.id===x.preparation_id:s.id===x.ingredient_id);
      const d=componentDetails(x),label=source?recipeSourceLabel(source):'';
      return `<tr><td><strong>${esc(x.chef_name||source?.name||'')}</strong></td>
        <td><div class="component-quantity"><input type="number" min="0.001" step="any" aria-label="配料用量" value="${Number(x.quantity)}" onchange="updateDraftComponent(${index},'quantity',this.value)"/><input aria-label="配料单位" value="${esc(x.unit)}" placeholder="单位" onchange="updateDraftComponent(${index},'unit',this.value)"/></div></td>
        <td><div class="ingredient-map-control"><input id="ingredientMap_${index}" list="recipeIngredientLibraryOptions" value="${esc(x._mapping_search||label)}" placeholder="搜索原材料 / 配方 / 供应商" oninput="state.draftIngredients[${index}]._mapping_search=this.value"/><button type="button" class="mini-btn map-btn" onclick="mapDraftIngredient(${index})">对应</button>${source?`<button type="button" class="mini-btn" onclick="clearDraftIngredientMapping(${index})">取消</button>`:''}</div>
          <div class="mapping-status ${source?'mapped':'pending'}">${source?'已对应：'+esc(label):'待对应原材料或配方'}</div></td>
        <td>${d.unitCost==null?'待完成':costAmount(d.unitCost,4)+' / '+esc(d.unit)}</td>
        <td><input class="component-waste" type="number" min="0" max="99.9" step="0.1" aria-label="配料损耗百分比" value="${Number(x.waste_percent||0)}" onchange="updateDraftComponent(${index},'waste_percent',this.value)"/></td>
        <td>${d.issue?'<span class="warn">'+esc(d.issue)+'</span>':costAmount(d.cost)}</td>
        <td><button type="button" class="mini-btn danger-btn" onclick="removeDraftIngredient(${index})">删除</button></td></tr>`;
    }).join(''):'<tr><td colspan="7">输入主厨配料，或选择已建立的原材料 / 配方</td></tr>';
    updateCostSummary('draftCost',draftCosting());
  };
  refreshOptions();
})();
