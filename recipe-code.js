(function setupRecipeCode(){
  const form=document.getElementById('recipeForm');
  if(!form)return;

  const firstRow=form.querySelector('.grid2');
  if(firstRow && !document.getElementById('recipeCode')){
    firstRow.className='grid3';
    const label=document.createElement('label');
    label.innerHTML='菜品代号<input id="recipeCode" placeholder="例如：A01" maxlength="20" style="text-transform:uppercase" />';
    firstRow.insertBefore(label,firstRow.firstChild);
  }

  const recipeTable=document.querySelector('#recipesView table');
  const recipeHead=recipeTable?.querySelector('thead tr');
  if(recipeHead && !recipeHead.querySelector('[data-recipe-code-head]')){
    const th=document.createElement('th');
    th.setAttribute('data-recipe-code-head','1');
    recipeHead.insertBefore(th,recipeHead.firstChild);
  }

  const sortable=[
    {key:'code',label:'代号'},
    {key:'name',label:'菜品'},
    {key:'category',label:'分类'},
    {key:'price',label:'售价'},
    {key:'cost',label:'成本/份'},
    {key:'foodcost',label:'Food Cost'},
    {key:'margin',label:'毛利'}
  ];
  let sortKey=localStorage.getItem('recipeSortKey')||'code';
  let sortDir=localStorage.getItem('recipeSortDir')||'asc';

  function setupHeaders(){
    if(!recipeHead)return;
    const ths=[...recipeHead.querySelectorAll('th')];
    sortable.forEach((cfg,i)=>{
      const th=ths[i];
      if(!th)return;
      th.dataset.sortKey=cfg.key;
      th.style.cursor='pointer';
      th.style.userSelect='none';
      th.onclick=()=>{
        if(sortKey===cfg.key) sortDir=sortDir==='asc'?'desc':'asc';
        else { sortKey=cfg.key; sortDir='asc'; }
        localStorage.setItem('recipeSortKey',sortKey);
        localStorage.setItem('recipeSortDir',sortDir);
        updateHeaderLabels();
        renderRecipes();
      };
    });
    updateHeaderLabels();
  }

  function updateHeaderLabels(){
    if(!recipeHead)return;
    sortable.forEach(cfg=>{
      const th=recipeHead.querySelector(`th[data-sort-key="${cfg.key}"]`);
      if(!th)return;
      const arrow=sortKey===cfg.key?(sortDir==='asc'?' ↑':' ↓'):' ↕';
      th.textContent=cfg.label+arrow;
      th.style.fontWeight=sortKey===cfg.key?'700':'';
    });
  }

  function sortedRecipes(){
    const list=[...state.recipes];
    const text=(a,b)=>String(a||'').localeCompare(String(b||''),'zh-CN',{numeric:true,sensitivity:'base'});
    const num=(a,b)=>Number(a||0)-Number(b||0);
    const dir=sortDir==='desc'?-1:1;
    list.sort((a,b)=>{
      let result=0;
      if(sortKey==='code'){
        const ac=String(a.code||'').trim(),bc=String(b.code||'').trim();
        if(!ac&&bc)return 1;
        if(ac&&!bc)return -1;
        result=text(ac,bc);
      }else if(sortKey==='name') result=text(a.name_cn,b.name_cn);
      else if(sortKey==='category'){
        const ac=state.categories.find(x=>x.id===a.category_id)?.name||'';
        const bc=state.categories.find(x=>x.id===b.category_id)?.name||'';
        result=text(ac,bc)||text(a.name_cn,b.name_cn);
      }else if(sortKey==='price') result=num(a.selling_price,b.selling_price);
      else {
        const ca=costingFor(a),cb=costingFor(b);
        if(sortKey==='cost') result=num(ca.per,cb.per);
        else if(sortKey==='foodcost') result=num(ca.fc,cb.fc);
        else if(sortKey==='margin') result=num(ca.margin,cb.margin);
      }
      return result*dir;
    });
    return list;
  }

  const oldRenderRecipes=renderRecipes;
  renderRecipes=function(){
    const rows=document.getElementById('recipeRows');
    if(!rows)return oldRenderRecipes();
    const recipes=sortedRecipes();
    rows.innerHTML=recipes.length?recipes.map(r=>{
      const c=costingFor(r),cat=state.categories.find(x=>x.id===r.category_id)?.name||'';
      return `<tr><td><strong>${esc(r.code||'-')}</strong></td><td><strong>${esc(r.name_cn)}</strong><br><span class="muted">${esc(r.name_en)}</span></td><td>${esc(cat)}</td><td>${money(r.selling_price)}</td><td>${money(c.per)}</td><td class="${c.fc<=Number(r.target_food_cost_percent||30)?'good':'warn'}">${pct(c.fc)}</td><td>${money(c.gp)}<br><span class="muted">${pct(c.margin)}</span></td><td><div class="action-row"><button class="mini-btn" onclick="openCosting('${r.id}')">配料</button><button class="mini-btn" onclick="editRecipe('${r.id}')">编辑</button><button class="mini-btn danger-btn" onclick="deleteRecipe('${r.id}')">删除</button></div></td></tr>`;
    }).join(''):'<tr><td colspan="8">还没有食谱</td></tr>';
  };

  const oldResetRecipeForm=resetRecipeForm;
  resetRecipeForm=function(){
    oldResetRecipeForm();
    if(document.getElementById('recipeCode'))document.getElementById('recipeCode').value='';
  };

  const oldEditRecipe=window.editRecipe;
  window.editRecipe=id=>{
    const r=state.recipes.find(x=>x.id===id);
    oldEditRecipe(id);
    if(r && document.getElementById('recipeCode'))document.getElementById('recipeCode').value=r.code||'';
  };

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    e.stopImmediatePropagation();
    const id=document.getElementById('recipeId').value;
    const code=(document.getElementById('recipeCode').value||'').trim().toUpperCase();
    if(code){
      const duplicate=state.recipes.find(r=>String(r.code||'').trim().toUpperCase()===code && String(r.id)!==String(id));
      if(duplicate)return toast(`代号 ${code} 已经被“${duplicate.name_cn}”使用`);
    }
    const row={
      code:code||null,
      name_cn:document.getElementById('recipeNameCn').value.trim(),
      name_en:document.getElementById('recipeNameEn').value.trim(),
      category_id:document.getElementById('recipeCategory').value?Number(document.getElementById('recipeCategory').value):null,
      recipe_yield:Number(document.getElementById('recipeYield').value),
      yield_unit:document.getElementById('yieldUnit').value.trim()||'份',
      selling_price:Number(document.getElementById('sellingPrice').value),
      target_food_cost_percent:Number(document.getElementById('targetFoodCost').value||30),
      notes:document.getElementById('recipeNotes').value.trim(),
      method:document.getElementById('method').value.trim(),
      updated_at:new Date().toISOString()
    };
    let res=id?await sb.from('recipes').update(row).eq('id',id).select().single():await sb.from('recipes').insert(row).select().single();
    if(res.error){
      if(String(res.error.message||'').toLowerCase().includes('recipes_code_unique_idx'))return toast(`代号 ${code} 已存在`);
      return toast(res.error.message);
    }
    const recipeId=res.data.id;
    if(id){
      const del=await sb.from('recipe_ingredients').delete().eq('recipe_id',recipeId);
      if(del.error)return toast(del.error.message);
    }
    if(state.draftIngredients.length){
      const payload=state.draftIngredients.map((x,index)=>({recipe_id:recipeId,ingredient_id:x.ingredient_id,quantity:Number(x.quantity),unit:x.unit,waste_percent:Number(x.waste_percent||0),sort_order:index}));
      const ins=await sb.from('recipe_ingredients').insert(payload);
      if(ins.error)return toast(ins.error.message);
    }
    document.getElementById('recipeDialog').close();
    await loadAll();
    toast('食谱和原材料已保存');
  },true);

  setupHeaders();
  renderRecipes();
})();
