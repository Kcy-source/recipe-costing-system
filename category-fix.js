(function fixRecipeCategoryRestore(){
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(typeof window.editRecipe==='function' && document.getElementById('recipeCategory')){
      clearInterval(timer);
      if(window.editRecipe.__categoryRestorePatched)return;
      const previous=window.editRecipe;
      const patched=function(id){
        const recipe=state.recipes.find(x=>String(x.id)===String(id));
        previous(id);
        const restore=()=>{
          const select=document.getElementById('recipeCategory');
          if(!select||!recipe)return;
          const wanted=recipe.category_id==null?'':String(recipe.category_id);
          const exists=[...select.options].some(o=>o.value===wanted);
          if(exists)select.value=wanted;
        };
        restore();
        requestAnimationFrame(restore);
        setTimeout(restore,0);
        setTimeout(restore,80);
      };
      patched.__categoryRestorePatched=true;
      window.editRecipe=patched;
    }else if(attempts>100){
      clearInterval(timer);
    }
  },30);
})();
