// Units remain free text. Only unambiguous mass/volume conversions are automatic.
function convertCostQuantity(quantity, fromUnit, toUnit) {
  const normalize = value => String(value || '').trim().toLowerCase();
  const from = normalize(fromUnit), to = normalize(toUnit), n = Number(quantity);
  if (!from || !to || !Number.isFinite(n) || n <= 0) return null;
  if (from === to) return n;
  const units = {
    g: ['mass', 1], '克': ['mass', 1], kg: ['mass', 1000], '公斤': ['mass', 1000], '千克': ['mass', 1000],
    ml: ['volume', 1], '毫升': ['volume', 1], l: ['volume', 1000], '升': ['volume', 1000]
  };
  const a = units[from], b = units[to];
  return a && b && a[0] === b[0] ? n * a[1] / b[1] : null;
}

function preparationCosting(preparation, rows = null) {
  const items = rows || state.preparationIngredients.filter(x => x.preparation_id === preparation.id);
  const details = items.map(rawComponentDetails);
  const output = Number(preparation.output_quantity);
  const complete = items.length > 0 && output > 0 && Number.isFinite(output)
    && !!String(preparation.output_unit || '').trim() && details.every(x => !x.issue);
  const total = complete ? details.reduce((sum, x) => sum + x.cost, 0) : null;
  return {complete, total, per: complete ? total / output : null};
}

function rawComponentDetails(row) {
  const ingredient = state.ingredients.find(x => x.id === row.ingredient_id);
  if (!ingredient) return {cost: null, issue: '待对应原材料', name: row.chef_name || '', type: '原材料'};
  return calculateComponent(row, ingredient.name, '原材料', unitCost(ingredient), ingredient.base_unit);
}

function componentDetails(row) {
  if (!row.preparation_id) return rawComponentDetails(row);
  const preparation = state.preparations.find(x => x.id === row.preparation_id);
  if (!preparation) return {cost: null, issue: '配方未找到，请重新对应', type: '配方', name: row.chef_name || ''};
  const c = preparationCosting(preparation);
  if (!c.complete) return {cost: null, issue: '配方成本待完成', name: preparation.name, type: '配方', unit: preparation.output_unit};
  return calculateComponent(row, preparation.name, '配方', c.per, preparation.output_unit);
}

function calculateComponent(row, name, type, price, unit) {
  const quantity = convertCostQuantity(row.quantity, row.unit, unit);
  const waste = Number(row.waste_percent || 0);
  let issue = '';
  if (quantity === null) issue = '请用 ' + unit + ' 或可换算的单位填写用量';
  else if (!Number.isFinite(waste) || waste < 0 || waste >= 100) issue = '损耗须为 0–99.9%';
  else if (!Number.isFinite(price) || price < 0) issue = '单位成本待完成';
  return {name, type, unit, unitCost: price, issue, cost: issue ? null : quantity * price / (1 - waste / 100)};
}

function recipeCostSummary(rows, output, sellingPrice) {
  const details = rows.map(componentDetails);
  const y = Number(output), sp = Number(sellingPrice || 0);
  const complete = rows.length > 0 && y > 0 && details.every(x => !x.issue);
  if (!complete) return {complete: false, total: null, per: null, fc: null, gp: null, margin: null};
  const total = details.reduce((sum, x) => sum + x.cost, 0), per = total / y, gp = sp - per;
  return {complete, total, per, fc: sp > 0 ? per / sp * 100 : 0, gp, margin: sp > 0 ? gp / sp * 100 : 0};
}

function costAmount(value, digits = 2) {
  return value == null || !Number.isFinite(value) ? '待完成' : Number(value).toFixed(digits);
}

function costPercent(value) {
  return value == null || !Number.isFinite(value) ? '待完成' : pct(value);
}

function updateCostSummary(prefix, c) {
  $(prefix + 'Total').textContent = costAmount(c.total);
  $(prefix + 'PerYield').textContent = costAmount(c.per);
  $(prefix + 'Percent').textContent = costPercent(c.fc);
  $(prefix === 'draftCost' ? 'draftGrossProfit' : 'grossProfit').textContent = c.complete
    ? costAmount(c.gp) + ' ｜ ' + costPercent(c.margin) : '待完成';
}

function recipeSources() {
  return state.ingredients.map(i => ({...i, kind: 'ingredient', unit: i.base_unit}))
    .concat(state.preparations.map(p => ({...p, kind: 'preparation', unit: p.output_unit})));
}
function recipeSourceLabel(s) {
  return '[' + (s.kind === 'preparation' ? '配方' : '原材料') + '] ' + s.name
    + (s.name_en ? ' / ' + s.name_en : '') + (s.supplier ? ' · ' + s.supplier : '')
    + (s.kind === 'preparation' && s.category ? ' · ' + s.category : '') + '（' + s.unit + '）';
}
