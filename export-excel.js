(function setupExcelExport(){
  const btn=document.getElementById('exportExcelBtn');
  if(!btn)return;

  const round=(n,d=2)=>Number(Number(n||0).toFixed(d));
  const categoryName=r=>state.categories.find(x=>x.id===r.category_id)?.name||'';
  const hasCosting=r=>state.recipeIngredients.some(x=>x.recipe_id===r.id);

  function recipePriceText(r){
    if(typeof sellingPriceLabel==='function')return sellingPriceLabel(r.selling_price,r);
    return Number(r.selling_price||0)>0?'$'+Number(r.selling_price).toFixed(2):'时价';
  }

  function ingredientNetPrice(i){
    const gross=Number(i.purchase_price||0);
    const gst=Number(i.gst_percent||0);
    return gst>0?gross/(1+gst/100):gross;
  }

  function buildRecipeRows(){
    return [...state.recipes]
      .sort((a,b)=>String(a.code||'').localeCompare(String(b.code||''),'zh-CN',{numeric:true,sensitivity:'base'}))
      .map(r=>{
        const c=costingFor(r);
        const done=hasCosting(r);
        return {
          '代号':r.code||'',
          '分类':categoryName(r),
          '中文菜名':r.name_cn||'',
          '英文菜名':r.name_en||'',
          '售价':recipePriceText(r),
          '售价数值':Number(r.selling_price||0)>0?round(r.selling_price,2):'',
          '出品数量':Number(r.recipe_yield||1),
          '出品单位':r.yield_unit||'份',
          '总配料成本':done?round(c.total,2):'',
          '成本/份':done?round(c.per,2):'',
          'Food Cost %':done?round(c.fc,1):'',
          '毛利额':done?round(c.gp,2):'',
          '毛利率 %':done?round(c.margin,1):'',
          'Costing状态':done?'已计算':'未计算'
        };
      });
  }

  function buildIngredientRows(){
    return [...state.ingredients]
      .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'zh-CN'))
      .map(i=>({
        '中文名称':i.name||'',
        '英文名称':i.name_en||'',
        '供应商':i.supplier||'',
        '采购数量':Number(i.purchase_quantity||0),
        '采购单位':i.purchase_unit||'',
        '净采购价':round(ingredientNetPrice(i),2),
        'GST %':round(i.gst_percent||0,1),
        '含GST采购价':round(i.purchase_price||0,2),
        'Costing基础单位':i.base_unit||'',
        '采购规格折算数量':Number(i.base_quantity||0),
        '净料率 %':round(i.yield_percent||100,1),
        '实际单位成本':round(unitCost(i),3),
        '备注':i.notes||''
      }));
  }

  function buildDetailRows(){
    const result=[];
    const recipes=[...state.recipes].sort((a,b)=>String(a.code||'').localeCompare(String(b.code||''),'zh-CN',{numeric:true,sensitivity:'base'}));
    recipes.forEach(r=>{
      const items=state.recipeIngredients
        .filter(x=>x.recipe_id===r.id)
        .sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
      items.forEach(x=>{
        const i=state.ingredients.find(y=>y.id===x.ingredient_id);
        result.push({
          '菜品代号':r.code||'',
          '中文菜名':r.name_cn||'',
          '英文菜名':r.name_en||'',
          '分类':categoryName(r),
          '原材料':i?.name||'',
          '原材料英文名':i?.name_en||'',
          '用量':Number(x.quantity||0),
          '单位':x.unit||'',
          '损耗 %':round(x.waste_percent||0,1),
          '原材料单位成本':i?round(unitCost(i),3):0,
          '配料成本':round(ingredientCost(x),2)
        });
      });
    });
    return result;
  }

  async function buildPriceHistoryRows(){
    const {data,error}=await sb
      .from('ingredient_price_history')
      .select('id,ingredient_id,purchase_quantity,purchase_unit,supplier,created_at,old_purchase_price,new_purchase_price,old_gst_percent,new_gst_percent,changed_by,base_unit,base_quantity,yield_percent,ingredients(name,name_en)')
      .order('created_at',{ascending:false})
      .limit(5000);

    if(error)throw error;

    const net=(gross,gst)=>{
      const g=Number(gross||0);
      const rate=Number(gst||0);
      return rate>0?g/(1+rate/100):g;
    };

    return (data||[]).map(h=>{
      const oldNet=net(h.old_purchase_price,h.old_gst_percent);
      const newNet=net(h.new_purchase_price,h.new_gst_percent);
      const diff=newNet-oldNet;
      const pctChange=oldNet!==0?diff/oldNet*100:'';
      const qty=Number(h.base_quantity||0);
      const y=Number(h.yield_percent||100)/100;
      const oldUnit=qty>0&&y>0?oldNet/(qty*y):'';
      const newUnit=qty>0&&y>0?newNet/(qty*y):'';

      return {
        '修改时间':h.created_at?new Date(h.created_at).toLocaleString('zh-SG',{timeZone:'Asia/Singapore'}):'',
        '原材料':h.ingredients?.name||'',
        '英文名称':h.ingredients?.name_en||'',
        '供应商':h.supplier||'',
        '采购规格':`${Number(h.purchase_quantity||0)} ${h.purchase_unit||''}`,
        '原价格':round(oldNet,2),
        '新价格':round(newNet,2),
        '变动金额':round(diff,2),
        '变动百分比 %':pctChange===''?'':round(pctChange,1),
        '原单价':oldUnit===''?'':round(oldUnit,3),
        '新单价':newUnit===''?'':round(newUnit,3),
        '单价单位':h.base_unit||'',
        '修改人':h.changed_by||''
      };
    });
  }

  function setWidths(ws,widths){
    ws['!cols']=widths.map(w=>({wch:w}));
  }

  btn.addEventListener('click',async()=>{
    if(typeof XLSX==='undefined')return toast('Excel 导出组件加载失败，请刷新页面再试');

    const old=btn.textContent;
    btn.disabled=true;
    btn.textContent='导出中...';

    try{
      const wb=XLSX.utils.book_new();

      const recipeRows=buildRecipeRows();
      const ingredientRows=buildIngredientRows();
      const detailRows=buildDetailRows();
      const priceHistoryRows=await buildPriceHistoryRows();

      const wsRecipes=XLSX.utils.json_to_sheet(recipeRows);
      setWidths(wsRecipes,[10,28,24,38,18,12,10,10,14,12,12,12,12,12]);

      const wsIngredients=XLSX.utils.json_to_sheet(ingredientRows);
      setWidths(wsIngredients,[24,32,28,12,12,12,10,14,18,16,12,14,32]);

      const wsDetails=XLSX.utils.json_to_sheet(detailRows.length?detailRows:[{
        '菜品代号':'','中文菜名':'','英文菜名':'','分类':'','原材料':'','原材料英文名':'',
        '用量':'','单位':'','损耗 %':'','原材料单位成本':'','配料成本':''
      }]);
      setWidths(wsDetails,[12,24,36,28,24,32,10,10,10,16,12]);

      XLSX.utils.book_append_sheet(wb,wsRecipes,'食谱');
      XLSX.utils.book_append_sheet(wb,wsIngredients,'原材料');
      const wsPriceHistory=XLSX.utils.json_to_sheet(priceHistoryRows.length?priceHistoryRows:[{
        '修改时间':'','原材料':'','英文名称':'','供应商':'','采购规格':'','原价格':'','新价格':'',
        '变动金额':'','变动百分比 %':'','原单价':'','新单价':'','单价单位':'','修改人':''
      }]);
      setWidths(wsPriceHistory,[20,24,30,28,14,12,12,12,14,12,12,12,28]);

      XLSX.utils.book_append_sheet(wb,wsDetails,'食谱配料明细');
      XLSX.utils.book_append_sheet(wb,wsPriceHistory,'价格变动记录');

      const now=new Date();
      const y=now.getFullYear();
      const m=String(now.getMonth()+1).padStart(2,'0');
      const d=String(now.getDate()).padStart(2,'0');
      XLSX.writeFile(wb,`品珍宫_食谱成本_${y}-${m}-${d}.xlsx`);
      toast('Excel 已导出');
    }catch(err){
      console.error(err);
      toast('导出失败，请再试一次');
    }finally{
      btn.disabled=false;
      btn.textContent=old;
    }
  });
})();