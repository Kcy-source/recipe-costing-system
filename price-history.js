(function setupPriceHistory(){
  const nav=document.querySelector('[data-view="priceHistory"]');
  const rows=document.getElementById('priceHistoryRows');
  const searchInput=document.getElementById('priceHistorySearchInput');
  const searchMode=document.getElementById('priceHistorySearchMode');
  if(!nav||!rows||!searchInput||!searchMode)return;

  let history=[];

  const net=(gross,gst)=>{
    const g=Number(gross||0);
    const rate=Number(gst||0);
    return rate>0?g/(1+rate/100):g;
  };

  const priceText=(gross,gst)=>{
    const n=net(gross,gst);
    return '$'+n.toFixed(2);
  };

  const timeText=value=>{
    if(!value)return '-';
    try{
      return new Date(value).toLocaleString('zh-SG',{
        timeZone:'Asia/Singapore',
        year:'numeric',month:'2-digit',day:'2-digit',
        hour:'2-digit',minute:'2-digit',hour12:false
      });
    }catch{return String(value);}
  };

  function render(){
    const q=(searchInput.value||'').trim().toLowerCase();
    const mode=searchMode.value||'all';

    const filtered=history.filter(h=>{
      if(!q)return true;
      const ingredient=String(h.ingredients?.name||'').toLowerCase();
      const ingredientEn=String(h.ingredients?.name_en||'').toLowerCase();
      const supplier=String(h.supplier||'').toLowerCase();
      const user=String(h.changed_by||'').toLowerCase();

      if(mode==='ingredient')return ingredient.includes(q)||ingredientEn.includes(q);
      if(mode==='supplier')return supplier.includes(q);
      if(mode==='user')return user.includes(q);
      return ingredient.includes(q)||ingredientEn.includes(q)||supplier.includes(q)||user.includes(q);
    });

    rows.innerHTML=filtered.length?filtered.map(h=>{
      const oldNet=net(h.old_purchase_price,h.old_gst_percent);
      const newNet=net(h.new_purchase_price,h.new_gst_percent);
      const diff=newNet-oldNet;
      const pctChange=oldNet!==0?(diff/oldNet*100):0;
      const cls=diff>0?'price-change-up':diff<0?'price-change-down':'price-change-flat';
      const sign=diff>0?'+':'';
      const ingredient=h.ingredients||{};
      const spec=`${Number(h.purchase_quantity||0)} ${esc(h.purchase_unit||'')}`;
      return `<tr>
        <td>${esc(timeText(h.created_at))}</td>
        <td><strong>${esc(ingredient.name||'')}</strong>${ingredient.name_en?`<br><span class="muted">${esc(ingredient.name_en)}</span>`:''}</td>
        <td>${esc(h.supplier||'-')}</td>
        <td>${spec}</td>
        <td>${priceText(h.old_purchase_price,h.old_gst_percent)}</td>
        <td><strong>${priceText(h.new_purchase_price,h.new_gst_percent)}</strong></td>
        <td class="${cls}">${sign}$${diff.toFixed(2)}${oldNet!==0?` (${sign}${pctChange.toFixed(1)}%)`:''}</td>
        <td>${esc(h.changed_by||'-')}</td>
      </tr>`;
    }).join(''):'<tr><td colspan="8" class="muted">找不到符合条件的价格变动记录</td></tr>';
  }

  async function loadPriceHistory(){
    rows.innerHTML='<tr><td colspan="8" class="muted">正在读取价格变动记录...</td></tr>';
    const {data,error}=await sb
      .from('ingredient_price_history')
      .select('id,ingredient_id,purchase_price,purchase_quantity,purchase_unit,supplier,effective_date,created_at,old_purchase_price,new_purchase_price,old_gst_percent,new_gst_percent,changed_by,change_type,ingredients(name,name_en)')
      .order('created_at',{ascending:false})
      .limit(1000);

    if(error){
      console.error(error);
      rows.innerHTML='<tr><td colspan="8" class="warn">价格变动记录读取失败</td></tr>';
      toast(error.message);
      return;
    }

    history=data||[];
    render();
  }

  searchInput.addEventListener('input',render);
  searchMode.addEventListener('change',render);
  nav.addEventListener('click',loadPriceHistory);
  document.getElementById('refreshBtn')?.addEventListener('click',()=>{
    if(!document.getElementById('priceHistoryView')?.classList.contains('hidden'))loadPriceHistory();
  });

  window.loadPriceHistory=loadPriceHistory;
})();