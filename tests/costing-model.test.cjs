const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const ctx=vm.createContext({
  state:{ingredients:[{id:'i',name:'原料',base_unit:'g',purchase_price:20,base_quantity:1000,yield_percent:100}],preparations:[{id:'p',name:'味水',output_quantity:5000,output_unit:'ml'}],preparationIngredients:[{preparation_id:'p',ingredient_id:'i',quantity:1,unit:'kg',waste_percent:0}]},
  unitCost:i=>i.purchase_price/(i.base_quantity*i.yield_percent/100)
});
vm.runInContext(readFileSync(__dirname+'/../costing-model.js','utf8'),ctx);
const evaluate=code=>vm.runInContext(code,ctx);
assert.equal(evaluate("preparationCosting(state.preparations[0]).total"),20);
assert.equal(evaluate("preparationCosting(state.preparations[0]).per"),0.004);
assert.equal(evaluate("componentDetails({preparation_id:'p',quantity:100,unit:'ml'}).cost"),0.4);
assert.equal(evaluate("componentDetails({preparation_id:'p',quantity:0.1,unit:'L'}).cost"),0.4);
assert.equal(evaluate("componentDetails({preparation_id:'p',quantity:100,unit:'ml',waste_percent:20}).cost"),0.5);
evaluate('state.ingredients[0].purchase_price=40');
assert.equal(evaluate("componentDetails({preparation_id:'p',quantity:100,unit:'ml'}).cost"),0.8);
assert.equal(evaluate("componentDetails({preparation_id:'p',quantity:100,unit:'g'}).cost"),null);
assert.equal(evaluate("recipeCostSummary([{chef_name:'未对应',quantity:1,unit:'份'}],1,10).complete"),false);
assert.equal(evaluate("convertCostQuantity(2,'包','包')"),2);
assert.equal(evaluate("convertCostQuantity(2,'包','g')"),null);
assert.equal(evaluate("convertCostQuantity(1,'kg','克')"),1000);
assert.equal(evaluate("convertCostQuantity(1,'g','ml')"),null);
evaluate('state.preparations[0].output_quantity=0');
assert.equal(evaluate("componentDetails({preparation_id:'p',quantity:100,unit:'ml'}).cost"),null);
console.log('PASS: batch yield, dish usage, mass/volume conversions, loss, live price cascade, custom units, incomplete-cost handling');
