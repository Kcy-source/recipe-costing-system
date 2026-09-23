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

  function ensureResizeStyle(){
    if(document.getElementById('recipeResizeStyle'))return;
    const style=document.createElement('style');
    style.id='recipeResizeStyle';
    style.textContent=`
      #recipesView table{table-layout:fixed;width:100%;min-width:1130px}
      #recipesView .table-wrap{max-height:calc(100vh - 180px);overflow:auto}#recipesView thead th{position:sticky;top:0;z-index:20;overflow:visible;white-space:nowrap;background:#fafbfc;box-shadow:0 1px 0 #e5e7eb}
      #recipesView .recipe-col-resizer{position:absolute;top:0;right:-4px;width:8px;height:100%;cursor:col-resize;z-index:5;touch-action:none}
      #recipesView .recipe-col-resizer::after{content:'';position:absolute;right:3px;top:20%;width:1px;height:60%;background:#d6dbe3;opacity:0}
      #recipesView thead th:hover .recipe-col-resizer::after,#recipesView .recipe-col-resizer.active::after{opacity:1}
      body.recipe-resizing{cursor:col-resize!important;user-select:none!important}
    `;
    document.head.appendChild(style);
  }

  const recipeMinWidths=[80,260,180,100,110,120,110,170];

  function applySavedWidths(){
    if(!recipeHead)return;
    const ths=[...recipeHead.querySelectorAll('th')];
    ths.forEach((th,i)=>{
      const min=recipeMinWidths[i]||80;
      const saved=Number(localStorage.getItem(`recipeColWidth_${i}`));
      const width=saved>=min?saved:min;
      th.style.width=`${width}px`;
      th.style.minWidth=`${min}px`;
      th.style.maxWidth=`${width}px`;
      if(saved>0 && saved<min)localStorage.setItem(`recipeColWidth_${i}`,String(min));
    });
  }

  function ensureResizers(){
    if(!recipeHead)return;
    ensureResizeStyle();
    const ths=[...recipeHead.querySelectorAll('th')];
    ths.forEach((th,index)=>{
      if(th.querySelector('.recipe-col-resizer'))return;
      const handle=document.createElement('span');
      handle.className='recipe-col-resizer';
      handle.title='拖动调整列宽';
      handle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
      handle.addEventListener('mousedown',e=>{
        e.preventDefault();e.stopPropagation();
        const startX=e.clientX,startWidth=th.getBoundingClientRect().width;
        handle.classList.add('active');document.body.classList.add('recipe-resizing');
        const onMove=ev=>{const min=recipeMinWidths[index]||80;const width=Math.max(min,Math.round(startWidth+(ev.clientX-startX)));th.style.width=`${width}px`;th.style.minWidth=`${min}px`;th.style.maxWidth=`${width}px`;};
        const onUp=()=>{handle.classList.remove('active');document.body.classList.remove('recipe-resizing');localStorage.setItem(`recipeColWidth_${index}`,String(Math.round(th.getBoundingClientRect().width)));document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);};
        document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
      });
      th.appendChild(handle);
    });
    applySavedWidths();
  }

  function setupHeaders(){
    if(!recipeHead)return;
    const ths=[...recipeHead.querySelectorAll('th')];
    sortable.forEach((cfg,i)=>{
      const th=ths[i];if(!th)return;
      th.dataset.sortKey=cfg.key;th.style.cursor='pointer';th.style.userSelect='none';
      th.onclick=e=>{if(e.target.closest('.recipe-col-resizer'))return;if(sortKey===cfg.key)sortDir=sortDir==='asc'?'desc':'asc';else{sortKey=cfg.key;sortDir='asc';}localStorage.setItem('recipeSortKey',sortKey);localStorage.setItem('recipeSortDir',sortDir);updateHeaderLabels();renderRecipes();};
    });
    updateHeaderLabels();
  }

  function updateHeaderLabels(){
    if(!recipeHead)return;
    sortable.forEach(cfg=>{const th=recipeHead.querySelector(`th[data-sort-key="${cfg.key}"]`);if(!th)return;const arrow=sortKey===cfg.key?(sortDir==='asc'?' ↑':' ↓'):' ↕';th.textContent=cfg.label+arrow;th.style.fontWeight=sortKey===cfg.key?'700':'';});
    ensureResizers();
  }

  function sortedRecipes(){
    const list=[...state.recipes],text=(a,b)=>String(a||'').localeCompare(String(b||''),'zh-CN',{numeric:true,sensitivity:'base'}),num=(a,b)=>Number(a||0)-Number(b||0),dir=sortDir==='desc'?-1:1;
    list.sort((a,b)=>{let result=0;if(sortKey==='code'){const ac=String(a.code||'').trim(),bc=String(b.code||'').trim();if(!ac&&bc)return 1;if(ac&&!bc)return -1;result=text(ac,bc);}else if(sortKey==='name')result=text(a.name_cn,b.name_cn);else if(sortKey==='category'){const ac=state.categories.find(x=>x.id===a.category_id)?.name||'',bc=state.categories.find(x=>x.id===b.category_id)?.name||'';result=text(ac,bc)||text(a.name_cn,b.name_cn);}else if(sortKey==='price')result=num(a.selling_price,b.selling_price);else{const ca=costingFor(a),cb=costingFor(b);if(sortKey==='cost')result=num(ca.per,cb.per);else if(sortKey==='foodcost')result=num(ca.fc,cb.fc);else if(sortKey==='margin')result=num(ca.margin,cb.margin);}return result*dir;});
    return list;
  }


  (function setupRecipeSearch(){
    const view=document.getElementById('recipesView');
    if(!view || document.getElementById('recipeSearchInput'))return;
    const panel=view.querySelector('.panel');
    const tableWrap=panel?.querySelector('.table-wrap');
    if(!panel||!tableWrap)return;
    const wrap=document.createElement('div');
    wrap.style.padding='16px 20px 8px';
    wrap.style.display='grid';
    wrap.style.gridTemplateColumns='160px 1fr';
    wrap.style.gap='10px';
    wrap.innerHTML='<select id="recipeSearchMode" style="font-size:15px;padding:13px 12px"><option value="all">全部</option><option value="name">菜名</option><option value="code">代号</option><option value="category">分类</option></select><input id="recipeSearchInput" type="search" placeholder="输入搜索内容" style="width:100%;font-size:16px;padding:13px 14px" />';
    panel.insertBefore(wrap,tableWrap);
    document.getElementById('recipeSearchInput').addEventListener('input',()=>renderRecipes());
    document.getElementById('recipeSearchMode').addEventListener('change',()=>renderRecipes());
  })();

  const oldRenderRecipes=renderRecipes;
  renderRecipes=function(){
    const rows=document.getElementById('recipeRows');if(!rows)return oldRenderRecipes();
    const q=(document.getElementById('recipeSearchInput')?.value||'').trim().toLowerCase();
    const mode=document.getElementById('recipeSearchMode')?.value||'all';
    const recipes=sortedRecipes().filter(r=>{
      if(!q)return true;
      const code=String(r.code||'').toLowerCase();
      const nameCn=String(r.name_cn||'').toLowerCase();
      const nameEn=String(r.name_en||'').toLowerCase();
      const categoryName=String(state.categories.find(x=>x.id===r.category_id)?.name||'').toLowerCase();

      if(mode==='name')return nameCn.includes(q)||nameEn.includes(q);
      if(mode==='code')return code.includes(q);
      if(mode==='category')return categoryName.includes(q);
      return code.includes(q)||nameCn.includes(q)||nameEn.includes(q)||categoryName.includes(q);
    });
    rows.innerHTML=recipes.length?recipes.map(r=>{const c=costingFor(r),cat=state.categories.find(x=>x.id===r.category_id)?.name||'';return `<tr><td><strong>${esc(r.code||'-')}</strong></td><td><strong>${esc(r.name_cn)}</strong><br><span class="muted">${esc(r.name_en)}</span></td><td>${esc(cat)}</td><td>${sellingPriceLabel(r.selling_price,r)}</td><td>${costAmount(c.per)}</td><td class="${c.complete&&c.fc<=Number(r.target_food_cost_percent||30)?'good':'warn'}">${costPercent(c.fc)}</td><td>${costAmount(c.gp)}<br><span class="muted">${costPercent(c.margin)}</span></td><td><div class="action-row"><button class="mini-btn" onclick="editRecipe('${r.id}')">添加配料</button><button class="mini-btn danger-btn" onclick="deleteRecipe('${r.id}')">删除</button></div></td></tr>`;}).join(''):'<tr><td colspan="8">还没有食谱</td></tr>';
    ensureResizers();
  };

  const oldResetRecipeForm=resetRecipeForm;
  resetRecipeForm=function(){oldResetRecipeForm();if(document.getElementById('recipeCode'))document.getElementById('recipeCode').value='';};

  const oldEditRecipe=window.editRecipe;
  window.editRecipe=id=>{
    const r=state.recipes.find(x=>x.id===id);
    oldEditRecipe(id);
    if(r&&document.getElementById('recipeCode'))document.getElementById('recipeCode').value=r.code||'';
    if(r&&document.getElementById('recipeDialogTitle'))document.getElementById('recipeDialogTitle').textContent='添加配料 · '+r.name_cn;
  };

  form.addEventListener('submit',async e=>{
    e.preventDefault();e.stopImmediatePropagation();
    const id=document.getElementById('recipeId').value,code=(document.getElementById('recipeCode').value||'').trim().toUpperCase();
    if(code){const duplicate=state.recipes.find(r=>String(r.code||'').trim().toUpperCase()===code&&String(r.id)!==String(id));if(duplicate)return toast(`代号 ${code} 已经被“${duplicate.name_cn}”使用`);}
    const row={code:code||null,name_cn:document.getElementById('recipeNameCn').value.trim(),name_en:document.getElementById('recipeNameEn').value.trim(),category_id:recipeCategoryForSave(),recipe_yield:Number(document.getElementById('recipeYield').value),yield_unit:document.getElementById('yieldUnit').value.trim()||'份',selling_price:Number(document.getElementById('sellingPrice').value),target_food_cost_percent:Number(document.getElementById('targetFoodCost').value||30),notes:document.getElementById('recipeNotes').value.trim(),method:document.getElementById('method').value.trim(),updated_at:new Date().toISOString()};
    const payload=state.draftIngredients.map((x,index)=>({
      chef_name:String(x.chef_name||'').trim()||null, ingredient_id:x.ingredient_id||null,
      preparation_id:x.preparation_id||null, quantity:Number(x.quantity), unit:String(x.unit||'').trim(),
      waste_percent:Number(x.waste_percent||0),sort_order:index
    }));
    if(payload.some(x=>!Number.isFinite(x.quantity)||x.quantity<=0||!x.unit||!Number.isFinite(x.waste_percent)||x.waste_percent<0||x.waste_percent>=100))return toast('请检查配料用量、单位和损耗');
    const button=form.querySelector('.dialog-actions .primary');
    if(button.disabled)return;
    button.disabled=true;button.textContent='保存中...';
    try{
      const {error}=await sb.rpc('save_recipe_with_components',{p_id:id||null,p_data:row,p_items:payload,p_expected_updated_at:form.dataset.updatedAt||null});
      if(error)throw error;
      document.getElementById('recipeDialog').close();await loadAll();toast('食谱和配料已保存');
    }catch(error){toast(error.message||'保存失败，请重试');}
    finally{button.disabled=false;button.textContent='保存食谱';}

  },true);

  setupHeaders();ensureResizers();renderRecipes();
})();
