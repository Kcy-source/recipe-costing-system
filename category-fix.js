// Keep category edits separate from selector option rendering. Background data
// refreshes must never change the value that will be saved with the recipe.
function setRecipeCategoryDraft(value){
  const form=document.getElementById('recipeForm');
  const id=value==null?'':String(value);
  form.dataset.categoryValue=id;
  const category=state.categories.find(c=>String(c.id)===id);
  form.dataset.categoryLabel=category?.name||'';
  refreshRecipeCategoryOptions();
}

function refreshRecipeCategoryOptions(){
  const select=document.getElementById('recipeCategory');
  const form=document.getElementById('recipeForm');
  const selected=form.dataset.categoryValue??select.value;
  const previousLabel=form.dataset.categoryLabel||select.selectedOptions[0]?.textContent||'原分类';
  select.replaceChildren(new Option('未分类',''));
  for(const category of state.categories){
    select.add(new Option(category.name,String(category.id)));
  }
  // Keep a known category selected even while its option is temporarily absent.
  if(selected && ![...select.options].some(o=>o.value===selected)){
    select.add(new Option(previousLabel,selected));
  }
  select.value=selected;
}

function recipeCategoryForSave(){
  const value=document.getElementById('recipeForm').dataset.categoryValue;
  return value?Number(value):null;
}

(function trackRecipeCategoryChoice(){
  const select=document.getElementById('recipeCategory');
  select.addEventListener('change',()=>{
    const form=document.getElementById('recipeForm');
    form.dataset.categoryValue=select.value;
    form.dataset.categoryLabel=select.selectedOptions[0]?.textContent||'';
  });
})();
