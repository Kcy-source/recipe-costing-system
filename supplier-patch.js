function renderIngredients(){
  $('ingredientRows').innerHTML=state.ingredients.length
    ? state.ingredients.map(i=>`<tr><td><strong>${esc(i.name)}</strong></td><td>${esc(i.category)}</td><td>${esc(i.supplier||'-')}</td><td>${Number(i.purchase_quantity)} ${esc(i.purchase_unit)}</td><td>${money(i.purchase_price)}</td><td>${pct(i.yield_percent)}</td><td>${money(unitCost(i))}/${esc(i.base_unit)}</td><td><div class="action-row"><button class="mini-btn" onclick="editIngredient('${i.id}')">编辑</button><button class="mini-btn danger-btn" onclick="deleteIngredient('${i.id}')">删除</button></div></td></tr>`).join('')
    : '<tr><td colspan="8">还没有原材料</td></tr>';
}
renderIngredients();
