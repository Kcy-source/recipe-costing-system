const SUPABASE_URL='https://peqemkbppanvdwzlsndl.supabase.co';
const SUPABASE_KEY='sb_publishable_FuUBZ72tcaCA9xPEcHSZBg_Cmr3muVJ';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let state={ingredients:[],recipes:[],categories:[],recipeIngredients:[],preparations:[],preparationIngredients:[],currentRecipe:null,draftIngredients:[]};
const $=id=>document.getElementById(id);
const money=n=>`${Number(n||0).toFixed(2)}`;
const sellingPriceLabel=(n,recipe=null)=>{
  const price=Number(n||0);
  if(price<=0)return '时价';
  const code=String(recipe?.code||'').toUpperCase();
  if(['P01','P02','P03','P08'].includes(code))return money(price)+' / 100g';
  if(/^C\d{2}$/.test(code))return money(price)+' / 100g';
  if(['F04','F05','F06','F08','F09','F10','F11'].includes(code))return money(price)+' / 100g';
  return money(price);
};
const pct=n=>`${Number(n||0).toFixed(1)}%`;
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function toast(msg){const d=document.createElement('div');d.className='toast-item';d.textContent=msg;$('toast').appendChild(d);setTimeout(()=>d.remove(),2600)}
function unitCost(i){return Number(i.purchase_price||0)/(Number(i.base_quantity||1)*(Number(i.yield_percent||100)/100));}
function ingredientCost(ri){return componentDetails(ri).cost;}
function costingFor(recipe){return recipeCostSummary(state.recipeIngredients.filter(x=>x.recipe_id===recipe.id),recipe.recipe_yield,recipe.selling_price);}
function draftCosting(){return recipeCostSummary(state.draftIngredients,$('recipeYield').value,$('sellingPrice').value);}

async function boot(){const{data:{session}}=await sb.auth.getSession();if(session)showApp(session.user);else showAuth();sb.auth.onAuthStateChange((_,s)=>s?showApp(s.user):showAuth())}
function showAuth(){$('authView').classList.remove('hidden');$('appView').classList.add('hidden')}
async function showApp(user){$('authView').classList.add('hidden');$('appView').classList.remove('hidden');$('userEmail').textContent=user.email||'';await loadAll()}

$('authForm').addEventListener('submit',async e=>{e.preventDefault();const email=$('email').value.trim(),password=$('password').value;const{error}=await sb.auth.signInWithPassword({email,password});if(error)toast(error.message);});

$('logoutBtn').onclick=()=>sb.auth.signOut();
$('refreshBtn').onclick=async()=>{
  const btn=$('refreshBtn');
  if(btn.disabled)return;
  const oldText=btn.textContent;
  btn.disabled=true;
  btn.textContent='刷新中...';
  try{
    await loadAll();
    toast('资料已刷新');
  }catch(err){
    console.error(err);
    toast('刷新失败，请再试一次');
  }finally{
    btn.disabled=false;
    btn.textContent=oldText;
  }
};
$('dashboardSearchInput')?.addEventListener('input',renderDashboard);$('dashboardSearchMode')?.addEventListener('change',renderDashboard);

document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
function switchView(name){document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.view===name));document.querySelectorAll('.view').forEach(x=>x.classList.add('hidden'));$(name+'View').classList.remove('hidden');const map={dashboard:['总览','查看食谱与成本概况'],ingredients:['原材料','管理采购价、规格与净料率'],preparations:['配方 / 半成品','管理自制配方、实际产出与单位成本'],recipes:['食谱 / Costing','建立菜品食谱并自动计算成本'],priceHistory:['价格变动记录','查看原材料历史价格变动'],management:['管理设置','管理系统登录账号']};$('pageTitle').textContent=map[name][0];$('pageSubtitle').textContent=map[name][1];}

async function loadAll(){
  const tables=['ingredients','recipes','recipe_categories','recipe_ingredients','preparations','preparation_ingredients'];
  const orders=['name','name_cn','sort_order','sort_order','name','sort_order'];
  const results=await Promise.all(tables.map((table,i)=>sb.from(table).select('*').order(orders[i])));
  const error=results.find(x=>x.error)?.error;
  if(error){toast(error.message);throw error;}
  [state.ingredients,state.recipes,state.categories,state.recipeIngredients,state.preparations,state.preparationIngredients]=results.map(x=>x.data||[]);
  renderAll();
}
function renderAll(){renderIngredients();renderRecipes();renderDashboard();fillSelectors();if(typeof renderPreparations==='function')renderPreparations();}

function renderIngredients(){$('ingredientRows').innerHTML=state.ingredients.length?state.ingredients.map(i=>`<tr><td><strong>${esc(i.name)}</strong></td><td>${esc(i.category)}</td><td>${Number(i.purchase_quantity)} ${esc(i.purchase_unit)}</td><td>${money(i.purchase_price)}</td><td>${pct(i.yield_percent)}</td><td>${money(unitCost(i))}/${esc(i.base_unit)}</td><td><div class="action-row"><button class="mini-btn" onclick="editIngredient('${i.id}')">编辑</button><button class="mini-btn danger-btn" onclick="deleteIngredient('${i.id}')">删除</button></div></td></tr>`).join(''):'<tr><td colspan="7">还没有原材料</td></tr>';}
function renderRecipes(){$('recipeRows').innerHTML=state.recipes.length?state.recipes.map(r=>{const c=costingFor(r),cat=state.categories.find(x=>x.id===r.category_id)?.name||'';return`<tr><td><strong>${esc(r.name_cn)}</strong><br><span class="muted">${esc(r.name_en)}</span></td><td>${esc(cat)}</td><td>${sellingPriceLabel(r.selling_price,r)}</td><td>${costAmount(c.per)}</td><td class="${c.complete&&c.fc<=Number(r.target_food_cost_percent||30)?'good':'warn'}">${costPercent(c.fc)}</td><td>${costAmount(c.gp)}<br><span class="muted">${costPercent(c.margin)}</span></td><td><div class="action-row"><button class="mini-btn" onclick="editRecipe('${r.id}')">添加配料</button><button class="mini-btn danger-btn" onclick="deleteRecipe('${r.id}')">删除</button></div></td></tr>`}).join(''):'<tr><td colspan="7">还没有食谱</td></tr>';}
let dashboardSortKey=localStorage.getItem('dashboardSortKey')||'code';
let dashboardSortDir=localStorage.getItem('dashboardSortDir')||'asc';

function sortDashboardRecipes(list){
  const dir=dashboardSortDir==='desc'?-1:1;
  const textCompare=(a,b)=>String(a||'').localeCompare(String(b||''),'zh-CN',{numeric:true,sensitivity:'base'});
  return [...list].sort((a,b)=>{
    let result=0;
    if(dashboardSortKey==='code'){
      const ac=String(a.code||'').trim(),bc=String(b.code||'').trim();
      if(!ac&&bc)return 1;
      if(ac&&!bc)return -1;
      result=textCompare(ac,bc);
    }else if(dashboardSortKey==='name'){
      result=textCompare(a.name_cn,b.name_cn);
    }else if(dashboardSortKey==='category'){
      const ac=state.categories.find(x=>x.id===a.category_id)?.name||'';
      const bc=state.categories.find(x=>x.id===b.category_id)?.name||'';
      result=textCompare(ac,bc)||textCompare(a.name_cn,b.name_cn);
    }else if(dashboardSortKey==='price'){
      result=Number(a.selling_price||0)-Number(b.selling_price||0);
    }else{
      const ca=costingFor(a),cb=costingFor(b);
      if(dashboardSortKey==='cost')result=ca.per-cb.per;
      else if(dashboardSortKey==='foodcost')result=ca.fc-cb.fc;
      else if(dashboardSortKey==='margin')result=ca.margin-cb.margin;
    }
    return result*dir;
  });
}

function updateDashboardSortHeaders(){
  const head=document.querySelector('#dashboardView thead tr');
  if(!head)return;
  const configs=[
    {key:'code',label:'代号',index:0},
    {key:'name',label:'菜品',index:1},
    {key:'category',label:'分类',index:2},
    {key:'price',label:'售价',index:3},
    {key:'cost',label:'成本/份',index:4},
    {key:'foodcost',label:'Food Cost',index:5},
    {key:'margin',label:'毛利',index:6}
  ];
  const ths=[...head.querySelectorAll('th')];
  configs.forEach(cfg=>{
    const th=ths[cfg.index];
    if(!th)return;
    const handle=th.querySelector('.dashboard-col-resizer');
    const arrow=dashboardSortKey===cfg.key?(dashboardSortDir==='asc'?' ↑':' ↓'):' ↕';
    th.textContent=cfg.label+arrow;
    if(handle)th.appendChild(handle);
    th.style.cursor='pointer';
    th.style.userSelect='none';
    th.dataset.dashboardSortKey=cfg.key;
  });
}

function setupDashboardSorting(){
  const head=document.querySelector('#dashboardView thead tr');
  if(!head)return;
  const ths=[...head.querySelectorAll('th')];
  const configs=[
    {key:'code',index:0},
    {key:'name',index:1},
    {key:'category',index:2},
    {key:'price',index:3},
    {key:'cost',index:4},
    {key:'foodcost',index:5},
    {key:'margin',index:6}
  ];
  configs.forEach(cfg=>{
    const th=ths[cfg.index];
    if(!th)return;
    th.onclick=e=>{
      if(e.target.closest('.dashboard-col-resizer'))return;
      if(dashboardSortKey===cfg.key) dashboardSortDir=dashboardSortDir==='asc'?'desc':'asc';
      else { dashboardSortKey=cfg.key; dashboardSortDir='asc'; }
      localStorage.setItem('dashboardSortKey',dashboardSortKey);
      localStorage.setItem('dashboardSortDir',dashboardSortDir);
      updateDashboardSortHeaders();
      renderDashboard();
    };
  });
  updateDashboardSortHeaders();
}

function renderDashboard(){
  let fc=[],m=[];
  const q=($('dashboardSearchInput')?.value||'').trim().toLowerCase();
  const mode=$('dashboardSearchMode')?.value||'all';
  const filtered=sortDashboardRecipes(state.recipes.filter(r=>{
    if(!q)return true;
    const code=String(r.code||'').toLowerCase();
    const nameCn=String(r.name_cn||'').toLowerCase();
    const nameEn=String(r.name_en||'').toLowerCase();
    const categoryName=String(state.categories.find(x=>x.id===r.category_id)?.name||'').toLowerCase();
    if(mode==='name')return nameCn.includes(q)||nameEn.includes(q);
    if(mode==='code')return code.includes(q);
    if(mode==='category')return categoryName.includes(q);
    return code.includes(q)||nameCn.includes(q)||nameEn.includes(q)||categoryName.includes(q);
  }));
  $('dashboardRows').innerHTML=filtered.length?filtered.map(r=>{
    const c=costingFor(r);
    const cat=state.categories.find(x=>x.id===r.category_id)?.name||'';
    const hasIngredients=c.complete;
    if(hasIngredients){
      fc.push(c.fc);
      m.push(c.margin);
    }
    return `<tr>
      <td><strong>${esc(r.code||'-')}</strong></td>
      <td><button type="button" class="dashboard-recipe-link" onclick="openCostingView(\'${r.id}\')"><strong>${esc(r.name_cn)}</strong>${r.name_en?`<br><span class="muted">${esc(r.name_en)}</span>`:''}</button></td>
      <td>${esc(cat||'-')}</td>
      <td>${sellingPriceLabel(r.selling_price,r)}</td>
      <td>${costAmount(c.per)}</td>
      <td>${costPercent(c.fc)}</td>
      <td>${costAmount(c.gp)} / ${costPercent(c.margin)}</td>
    </tr>`;
  }).join(''):(q
    ?`<tr><td colspan="7" class="muted">找不到符合“${esc(q)}”的菜品</td></tr>`
    :'<tr><td colspan="7">还没有食谱资料</td></tr>');
  $('statIngredients').textContent=state.ingredients.length;
  $('statRecipes').textContent=state.recipes.length;
  $('statFoodCost').textContent=fc.length?pct(fc.reduce((a,b)=>a+b,0)/fc.length):'未计算';
  $('statMargin').textContent=m.length?pct(m.reduce((a,b)=>a+b,0)/m.length):'未计算';
}

function setupDashboardResizers(){
  const head=document.querySelector('#dashboardView thead tr');
  if(!head)return;

  const ths=[...head.querySelectorAll('th')];

  ths.forEach((th,index)=>{
    const saved=Number(localStorage.getItem('dashboardColWidth_'+index));
    if(saved>=60){
      th.style.width=saved+'px';
      th.style.minWidth=saved+'px';
      th.style.maxWidth=saved+'px';
    }

    if(th.querySelector('.dashboard-col-resizer'))return;

    const handle=document.createElement('span');
    handle.className='dashboard-col-resizer';
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
      document.body.classList.add('dashboard-resizing');

      const onMove=ev=>{
        const width=Math.max(60,Math.round(startWidth+(ev.clientX-startX)));
        th.style.width=width+'px';
        th.style.minWidth=width+'px';
        th.style.maxWidth=width+'px';
      };

      const onUp=()=>{
        handle.classList.remove('active');
        document.body.classList.remove('dashboard-resizing');
        localStorage.setItem('dashboardColWidth_'+index,String(Math.round(th.getBoundingClientRect().width)));
        document.removeEventListener('mousemove',onMove);
        document.removeEventListener('mouseup',onUp);
      };

      document.addEventListener('mousemove',onMove);
      document.addEventListener('mouseup',onUp);
    });

    th.appendChild(handle);
  });
}
setupDashboardResizers();
setupDashboardSorting();

function fillSelectors(){const ingredientOptions=state.ingredients.map(i=>`<option value="${i.id}">${esc(i.name)}</option>`).join('');refreshRecipeCategoryOptions();$('costIngredient').innerHTML=ingredientOptions;}

document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('addIngredientBtn').onclick=()=>{resetIngredientForm();$('ingredientDialog').showModal();};
function resetIngredientForm(){$('ingredientForm').reset();$('ingredientId').value='';$('ingredientDialogTitle').textContent='新增原材料';$('purchaseQuantity').value='';$('purchaseUnit').value='';$('baseUnit').value='';$('baseQuantity').value='';$('yieldPercent').value=100;}
window.editIngredient=id=>{const i=state.ingredients.find(x=>x.id===id);if(!i)return;$('ingredientId').value=i.id;$('ingredientName').value=i.name;$('ingredientCategory').value=i.category;$('purchaseQuantity').value=i.purchase_quantity;$('purchaseUnit').value=i.purchase_unit;$('purchasePrice').value=i.purchase_price;$('baseUnit').value=i.base_unit;$('baseQuantity').value=i.base_quantity;$('yieldPercent').value=i.yield_percent;$('supplier').value=i.supplier||'';$('ingredientNotes').value=i.notes||'';$('ingredientDialogTitle').textContent='编辑原材料';$('ingredientDialog').showModal();};
$('ingredientForm').addEventListener('submit',async e=>{e.preventDefault();const id=$('ingredientId').value;const row={name:$('ingredientName').value.trim(),category:$('ingredientCategory').value.trim()||'其他',purchase_quantity:Number($('purchaseQuantity').value),purchase_unit:$('purchaseUnit').value,purchase_price:Number($('purchasePrice').value),base_unit:$('baseUnit').value,base_quantity:Number($('baseQuantity').value),yield_percent:Number($('yieldPercent').value),supplier:$('supplier').value.trim(),notes:$('ingredientNotes').value.trim(),updated_at:new Date().toISOString()};const q=id?sb.from('ingredients').update(row).eq('id',id):sb.from('ingredients').insert(row);const{error}=await q;if(error)return toast(error.message);$('ingredientDialog').close();toast('原材料已保存');await loadAll();});
window.deleteIngredient=async id=>{if(!confirm('确定删除这个原材料？已被食谱使用时将无法删除。'))return;const{error}=await sb.from('ingredients').delete().eq('id',id);if(error)return toast(error.message);await loadAll();};

$('addRecipeBtn').onclick=()=>{resetRecipeForm();$('recipeDialog').showModal();};
function resetRecipeForm(){$('recipeForm').reset();$('recipeId').value='';$('recipeForm').dataset.updatedAt='';setRecipeCategoryDraft(null);$('recipeDialogTitle').textContent='新增食谱';$('recipeYield').value=1;$('yieldUnit').value='份';$('sellingPrice').value=0;$('targetFoodCost').value=30;state.draftIngredients=[];renderDraftIngredients();}
window.editRecipe=id=>{const r=state.recipes.find(x=>x.id===id);if(!r)return;$('recipeId').value=r.id;$('recipeForm').dataset.updatedAt=r.updated_at;$('recipeNameCn').value=r.name_cn;$('recipeNameEn').value=r.name_en||'';setRecipeCategoryDraft(r.category_id);$('recipeYield').value=r.recipe_yield;$('yieldUnit').value=r.yield_unit;$('sellingPrice').value=r.selling_price;$('targetFoodCost').value=r.target_food_cost_percent||30;$('recipeNotes').value=r.notes||'';$('method').value=r.method||'';state.draftIngredients=state.recipeIngredients.filter(x=>x.recipe_id===id).map(x=>({...x}));$('recipeDialogTitle').textContent='编辑食谱';renderDraftIngredients();$('recipeDialog').showModal();};

$('addDraftIngredientBtn').onclick=()=>{const ingredient_id=$('draftIngredient').value,quantity=Number($('draftQuantity').value),unit=$('draftUnit').value,waste_percent=Number($('draftWaste').value||0);if(!ingredient_id||quantity<=0)return toast('请选择原材料并输入用量');state.draftIngredients.push({ingredient_id,quantity,unit,waste_percent,sort_order:state.draftIngredients.length});$('draftQuantity').value='';$('draftWaste').value=0;renderDraftIngredients();};
window.removeDraftIngredient=index=>{state.draftIngredients.splice(index,1);state.draftIngredients.forEach((x,i)=>x.sort_order=i);renderDraftIngredients();};
function renderDraftIngredients(){const c=draftCosting();$('draftIngredientRows').innerHTML=state.draftIngredients.length?state.draftIngredients.map((x,index)=>{const i=state.ingredients.find(y=>y.id===x.ingredient_id);return`<tr><td>${esc(i?.name||'')}</td><td>${Number(x.quantity)} ${esc(x.unit)}</td><td>${money(i?unitCost(i):0)}/${esc(i?.base_unit||'')}</td><td>${pct(x.waste_percent)}</td><td>${money(ingredientCost(x))}</td><td><button type="button" class="mini-btn danger-btn" onclick="removeDraftIngredient(${index})">删除</button></td></tr>`}).join(''):'<tr><td colspan="6">请选择上方原材料加入食谱</td></tr>';$('draftCostTotal').textContent=money(c.total);$('draftCostPerYield').textContent=costAmount(c.per);$('draftCostPercent').textContent=costPercent(c.fc);$('draftGrossProfit').textContent=`${costAmount(c.gp)} ｜ ${costPercent(c.margin)}`;}
['recipeYield','sellingPrice'].forEach(id=>$(id).addEventListener('input',()=>renderDraftIngredients()));


window.deleteRecipe=async id=>{if(!confirm('确定删除这个食谱？'))return;const{error}=await sb.from('recipes').delete().eq('id',id);if(error)return toast(error.message);await loadAll();};

window.openCosting=id=>{const r=state.recipes.find(x=>x.id===id);if(!r)return;state.currentRecipe=r;const addRow=$('costingDialog').querySelector('.ingredient-add-row');if(addRow)addRow.style.display='';$('costingTitle').textContent=r.name_cn;$('costingMeta').textContent=`售价 ${sellingPriceLabel(r.selling_price,r)} · 出品 ${r.recipe_yield} ${r.yield_unit}`;renderCosting();$('costingDialog').showModal();};
window.openCostingView=id=>{openCosting(id);const addRow=$('costingDialog').querySelector('.ingredient-add-row');if(addRow)addRow.style.display='none';$('costingRows').querySelectorAll('.danger-btn').forEach(b=>b.style.display='none');};
function renderCosting(){
  const r=state.currentRecipe,c=costingFor(r),rows=state.recipeIngredients.filter(x=>x.recipe_id===r.id);
  const notes=String(r.notes||'').trim();
  $('costingNotesText').textContent=notes;
  $('costingNotes').classList.toggle('hidden',!notes);
  updateCostSummary('cost',c);
  $('costingRows').innerHTML=rows.length?rows.map(x=>{
    const d=componentDetails(x);
    return `<tr><td><strong>${esc(x.chef_name||d.name||'')}</strong><br><span class="muted">${esc(d.type)}：${esc(d.name||'待对应')}</span></td>
      <td>${Number(x.quantity)} ${esc(x.unit)}</td><td>${d.unitCost==null?'待完成':costAmount(d.unitCost,4)+' / '+esc(d.unit)}</td>
      <td>${pct(x.waste_percent)}</td><td>${d.issue?'<span class="warn">'+esc(d.issue)+'</span>':costAmount(d.cost)}</td>
      <td><button class="mini-btn danger-btn" onclick="removeRecipeIngredient('${x.id}')">删除</button></td></tr>`;
  }).join(''):'<tr><td colspan="6">还没有配料</td></tr>';
}

$('addRecipeIngredientBtn').onclick=async()=>{if(!state.currentRecipe)return;const ingredient_id=$('costIngredient').value,quantity=Number($('costQuantity').value),unit=$('costUnit').value,waste_percent=Number($('costWaste').value||0);if(!ingredient_id||quantity<=0)return toast('请选择配料并输入用量');const{error}=await sb.from('recipe_ingredients').insert({recipe_id:state.currentRecipe.id,ingredient_id,quantity,unit,waste_percent,sort_order:state.recipeIngredients.filter(x=>x.recipe_id===state.currentRecipe.id).length});if(error)return toast(error.message);$('costQuantity').value='';await loadAll();state.currentRecipe=state.recipes.find(x=>x.id===state.currentRecipe.id);renderCosting();};
window.removeRecipeIngredient=async id=>{const currentId=state.currentRecipe?.id;const{error}=await sb.from('recipe_ingredients').delete().eq('id',id);if(error)return toast(error.message);await loadAll();state.currentRecipe=state.recipes.find(x=>x.id===currentId);if(state.currentRecipe)renderCosting();};
