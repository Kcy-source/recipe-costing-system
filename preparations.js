let preparationDraft=[];
let preparationSortKey=localStorage.getItem('preparationSortKey')||'name';
let preparationSortDirection=Number(localStorage.getItem('preparationSortDirection'))||1;
function preparationRecipeNames(id){
  const ids=new Set(state.recipeIngredients.filter(x=>x.preparation_id===id).map(x=>x.recipe_id));
  return state.recipes.filter(r=>ids.has(r.id)).map(r=>(r.code?r.code+' ':'')+r.name_cn);
}
function renderPreparations(){
  const q=$('preparationSearch').value.trim().toLowerCase();
  const items=state.preparations.filter(p=>[p.name,p.name_en,p.category].some(v=>String(v||'').toLowerCase().includes(q)));
  const sortValue=p=>{
    if(preparationSortKey==='total'||preparationSortKey==='per')return preparationCosting(p)[preparationSortKey];
    if(preparationSortKey==='uses')return preparationRecipeNames(p.id).length;
    if(preparationSortKey==='output')return String(p.output_quantity)+' '+p.output_unit;
    return p[preparationSortKey]||'';
  };
  items.sort((a,b)=>{
    const av=sortValue(a),bv=sortValue(b);if(av==null)return bv==null?0:1;if(bv==null)return -1;
    return preparationSortDirection*(typeof av==='number'?av-bv:String(av).localeCompare(String(bv),'zh-CN',{numeric:true}));
  });
  $('preparationRows').innerHTML=items.length?items.map(p=>{
    const c=preparationCosting(p),uses=preparationRecipeNames(p.id);
    return `<tr><td><button class="dashboard-recipe-link" onclick="editPreparation('${p.id}')"><strong>${esc(p.name)}</strong>${p.name_en?'<br><span class="muted">'+esc(p.name_en)+'</span>':''}</button></td>
      <td>${esc(p.category||'-')}</td><td>${Number(p.output_quantity)} ${esc(p.output_unit)}</td><td>${costAmount(c.total)}</td>
      <td>${costAmount(c.per,4)}${c.complete?' / '+esc(p.output_unit):''}</td><td title="${esc(uses.join('、'))}">${uses.length} 道菜</td>
      <td><div class="action-row"><button class="mini-btn" onclick="editPreparation('${p.id}')">编辑</button><button class="mini-btn danger-btn" onclick="deletePreparation('${p.id}')">删除</button></div></td></tr>`;
  }).join(''):q?'<tr><td colspan="7">找不到符合条件的配方</td></tr>':'';
}
function fillPreparationIngredients(){
  const old=$('preparationIngredient').value;
  $('preparationIngredient').innerHTML='<option value="">选择原材料</option>'+state.ingredients.map(i=>`<option value="${i.id}">${esc(recipeSourceLabel({...i,kind:'ingredient',unit:i.base_unit}))}</option>`).join('');
  if(state.ingredients.some(i=>i.id===old))$('preparationIngredient').value=old;
}
function openPreparationForm(p=null){
  const form=$('preparationForm');form.reset();form.dataset.updatedAt=p?.updated_at||'';
  $('preparationId').value=p?.id||'';$('preparationName').value=p?.name||'';$('preparationNameEn').value=p?.name_en||'';
  $('preparationCategory').value=p?.category||'';$('preparationOutput').value=p?.output_quantity||'';
  $('preparationUnit').value=p?.output_unit||'';$('preparationMethod').value=p?.method||'';$('preparationNotes').value=p?.notes||'';
  preparationDraft=p?state.preparationIngredients.filter(x=>x.preparation_id===p.id).map(x=>({...x})):[];
  $('preparationDialogTitle').textContent=p?'编辑配方 · '+p.name:'新增配方';
  const uses=p?preparationRecipeNames(p.id):[];
  $('preparationUsage').textContent=uses.length?'用于菜品：'+uses.join('、')+'。保存后相关菜品成本会自动更新。':'';
  fillPreparationIngredients();renderPreparationDraft();$('preparationDialog').showModal();
}
function editPreparation(id){const p=state.preparations.find(x=>x.id===id);if(p)openPreparationForm(p);}
async function deletePreparation(id){
  const uses=preparationRecipeNames(id);
  if(uses.length)return toast('此配方用于 '+uses.length+' 道菜，请先在菜品中移除对应配料');
  if(!confirm('确定删除这个配方？'))return;
  const {error}=await sb.from('preparations').delete().eq('id',id);
  if(error)return toast(error.code==='23503'?'此配方仍被菜品使用，不能删除':error.message);
  await loadAll();toast('配方已删除');
}
function preparationFormData(){
  return {name:$('preparationName').value.trim(),name_en:$('preparationNameEn').value.trim(),category:$('preparationCategory').value.trim(),output_quantity:Number($('preparationOutput').value),output_unit:$('preparationUnit').value.trim(),method:$('preparationMethod').value.trim(),notes:$('preparationNotes').value.trim()};
}
function renderPreparationDraft(){
  $('preparationIngredientRows').innerHTML=preparationDraft.length?preparationDraft.map((x,index)=>{
    const d=rawComponentDetails(x);
    return `<tr><td>${esc(d.name)}</td><td><div class="component-quantity"><input type="number" min="0.001" step="any" aria-label="配方配料用量" value="${Number(x.quantity)}" onchange="updatePreparationLine(${index},'quantity',this.value)"/><input aria-label="配方配料单位" value="${esc(x.unit)}" onchange="updatePreparationLine(${index},'unit',this.value)"/></div></td>
      <td>${costAmount(d.unitCost,4)} / ${esc(d.unit)}</td><td><input class="component-waste" aria-label="配方配料损耗百分比" type="number" min="0" max="99.9" step="0.1" value="${Number(x.waste_percent||0)}" onchange="updatePreparationLine(${index},'waste_percent',this.value)"/></td>
      <td>${d.issue?'<span class="warn">'+esc(d.issue)+'</span>':costAmount(d.cost)}</td><td><button type="button" class="mini-btn danger-btn" onclick="removePreparationLine(${index})">删除</button></td></tr>`;
  }).join(''):'<tr><td colspan="6" class="muted">加入制作这一批配方所需的原材料</td></tr>';
  const data=preparationFormData(),c=preparationCosting(data,preparationDraft);
  $('preparationTotal').textContent=costAmount(c.total);$('preparationUnitCost').textContent=c.complete?costAmount(c.per,4)+' / '+data.output_unit:'待完成';
}
function updatePreparationLine(index,field,value){preparationDraft[index][field]=field==='unit'?value.trim():Number(value);renderPreparationDraft();}
function removePreparationLine(index){preparationDraft.splice(index,1);renderPreparationDraft();}
$('addPreparationBtn').onclick=()=>openPreparationForm();
$('preparationSearch').addEventListener('input',renderPreparations);
$('preparationIngredient').addEventListener('change',()=>{
  const i=state.ingredients.find(x=>x.id===$('preparationIngredient').value);$('preparationIngredientUnit').value=i?.base_unit||'';
});
$('addPreparationIngredientBtn').onclick=()=>{
  const row={ingredient_id:$('preparationIngredient').value,quantity:Number($('preparationQuantity').value),unit:$('preparationIngredientUnit').value.trim(),waste_percent:Number($('preparationWaste').value||0)};
  if(!row.ingredient_id||!row.unit||!Number.isFinite(row.quantity)||row.quantity<=0)return toast('请选择原材料并填写用量和单位');
  const d=rawComponentDetails(row);if(d.issue)return toast(d.issue);
  preparationDraft.push(row);$('preparationQuantity').value='';$('preparationWaste').value=0;renderPreparationDraft();
};
['preparationOutput','preparationUnit'].forEach(id=>$(id).addEventListener('input',renderPreparationDraft));
$('preparationForm').addEventListener('submit',async e=>{
  e.preventDefault();const form=e.currentTarget,button=$('savePreparationBtn');if(button.disabled)return;
  const data=preparationFormData();
  if(!data.name||!data.output_unit||!Number.isFinite(data.output_quantity)||data.output_quantity<=0)return toast('请填写配方名称、实际产出量和单位');
  if(!preparationDraft.length)return toast('请至少加入一种原材料');
  const invalid=preparationDraft.map(rawComponentDetails).find(d=>d.issue);if(invalid)return toast(invalid.issue);
  button.disabled=true;button.textContent='保存中...';
  try{
    const items=preparationDraft.map(x=>({ingredient_id:x.ingredient_id,quantity:x.quantity,unit:x.unit,waste_percent:x.waste_percent}));
    const {error}=await sb.rpc('save_preparation',{p_id:$('preparationId').value||null,p_data:data,p_items:items,p_expected_updated_at:form.dataset.updatedAt||null});
    if(error)throw error;
    $('preparationDialog').close();await loadAll();toast('配方已保存，相关菜品成本已更新');
  }catch(error){toast(error.message||'配方保存失败，请重试');}finally{button.disabled=false;button.textContent='保存配方';}
});
const fillBaseSelectors=fillSelectors;
fillSelectors=function(){
  fillBaseSelectors();
  const options=kind=>recipeSources().filter(s=>s.kind===kind).map(s=>`<option value="${s.kind}:${s.id}">${esc(recipeSourceLabel(s))}</option>`).join('');
  $('costIngredient').innerHTML='<option value="">选择原材料 / 配方</option><optgroup label="原材料">'+options('ingredient')+'</optgroup><optgroup label="配方 / 半成品">'+options('preparation')+'</optgroup>';
  fillPreparationIngredients();$('recipeIngredientLibraryOptions').innerHTML=recipeSources().map(s=>`<option value="${esc(recipeSourceLabel(s))}"></option>`).join('');
};
$('costIngredient').onchange=()=>{
  const [kind,id]=$('costIngredient').value.split(':'),s=recipeSources().find(x=>x.kind===kind&&x.id===id);$('costUnit').value=s?.unit||'';
};
$('addRecipeIngredientBtn').onclick=async()=>{
  if(!state.currentRecipe)return;
  const [kind,id]=$('costIngredient').value.split(':'),s=recipeSources().find(x=>x.kind===kind&&x.id===id);
  const row={recipe_id:state.currentRecipe.id,chef_name:s?.name,ingredient_id:kind==='ingredient'?id:null,preparation_id:kind==='preparation'?id:null,quantity:Number($('costQuantity').value),unit:$('costUnit').value.trim(),waste_percent:Number($('costWaste').value||0),sort_order:state.recipeIngredients.filter(x=>x.recipe_id===state.currentRecipe.id).length};
  if(!s)return toast('请选择原材料或配方');const d=componentDetails(row);if(d.issue)return toast(d.issue);
  const button=$('addRecipeIngredientBtn');if(button.disabled)return;button.disabled=true;
  try{
    const {error}=await sb.from('recipe_ingredients').insert(row);if(error)throw error;
    const recipeId=state.currentRecipe.id;$('costQuantity').value='';await loadAll();state.currentRecipe=state.recipes.find(x=>x.id===recipeId);if(state.currentRecipe)renderCosting();
  }catch(error){toast(error.message);}finally{button.disabled=false;}
};
document.querySelectorAll('#preparationsView thead th').forEach((th,index)=>{
  const label=document.createElement('span');label.textContent=th.textContent;th.textContent='';th.appendChild(label);
  const key=th.dataset.prepSort;
  const updateLabel=()=>{label.textContent=label.textContent.replace(/ [↑↓↕]$/,'')+(key?(key===preparationSortKey?(preparationSortDirection===1?' ↑':' ↓'):' ↕'):'');};
  if(key){th.style.cursor='pointer';th.onclick=e=>{if(e.target.classList.contains('preparation-resizer'))return;preparationSortDirection=key===preparationSortKey?-preparationSortDirection:1;preparationSortKey=key;localStorage.setItem('preparationSortKey',key);localStorage.setItem('preparationSortDirection',preparationSortDirection);document.querySelectorAll('#preparationsView thead th').forEach(h=>h.dispatchEvent(new Event('sortlabel')));renderPreparations();};}
  th.addEventListener('sortlabel',updateLabel);updateLabel();
  const width=Number(localStorage.getItem('preparationWidth'+index));if(width>=80)th.style.width=width+'px';
  const handle=document.createElement('span');handle.className='preparation-resizer';handle.title='拖动调整列宽';th.appendChild(handle);
  handle.onpointerdown=e=>{
    e.preventDefault();e.stopPropagation();const x=e.clientX,w=th.getBoundingClientRect().width;
    const move=ev=>{th.style.width=Math.max(80,w+ev.clientX-x)+'px';};
    const up=()=>{localStorage.setItem('preparationWidth'+index,th.getBoundingClientRect().width);document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);};
    document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);
  };
});
