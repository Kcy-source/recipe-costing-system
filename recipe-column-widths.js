(function setupIngredientColumnWidths(){
  function setupTable(table,storageKey){
  if(!table||table.querySelector('colgroup'))return;
  const headers=[...table.querySelectorAll('thead th')];
  const defaults=[170,215,380,150,110,115,80];
  const minimums=[90,140,180,90,85,80,68];
  let saved;
  try{saved=JSON.parse(localStorage.getItem(storageKey));}catch(_){/* Use defaults if storage is unavailable. */}
  const widths=defaults.map((width,index)=>Array.isArray(saved)&&Number.isFinite(saved[index])&&saved[index]>=minimums[index]?saved[index]:width);
  const group=document.createElement('colgroup');
  const columns=headers.map(()=>{const col=document.createElement('col');group.appendChild(col);return col;});
  table.prepend(group);
  const handles=[];
  function applyWidths(){
    columns.forEach((col,index)=>{
      col.style.width=widths[index]+'px';
      handles[index]?.setAttribute('aria-valuenow',String(widths[index]));
    });
    // An explicit total keeps the other columns unchanged while one is resized.
    table.style.width=widths.reduce((sum,width)=>sum+width,0)+'px';
  }
  function saveWidths(){
    try{localStorage.setItem(storageKey,JSON.stringify(widths));}catch(_){/* Resizing still works without storage. */}
  }
  function setWidth(index,width){
    widths[index]=Math.max(minimums[index],Math.round(width));
    applyWidths();
  }
  headers.forEach((header,index)=>{
    const handle=document.createElement('span');
    handle.className='recipe-column-resizer';
    handle.tabIndex=0;
    handle.title='拖动调整列宽；双击恢复默认宽度';
    handle.setAttribute('role','separator');
    handle.setAttribute('aria-orientation','vertical');
    handle.setAttribute('aria-label',`调整${header.textContent.trim()||'操作'}列宽`);
    handle.setAttribute('aria-valuemin',String(minimums[index]));
    handles.push(handle);
    header.appendChild(handle);
    handle.addEventListener('click',event=>event.stopPropagation());
    handle.addEventListener('dblclick',event=>{
      event.preventDefault();event.stopPropagation();
      setWidth(index,defaults[index]);saveWidths();
    });
    handle.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;
      event.preventDefault();event.stopPropagation();
      const step=event.shiftKey?50:10;
      setWidth(index,event.key==='Home'?defaults[index]:widths[index]+(event.key==='ArrowRight'?step:-step));
      saveWidths();
    });
    handle.addEventListener('pointerdown',event=>{
      if(event.button!==0||event.isPrimary===false)return;
      event.preventDefault();event.stopPropagation();
      const startX=event.clientX,startWidth=widths[index],pointerId=event.pointerId;
      const dialog=table.closest('dialog');
      handle.classList.add('active');
      document.body.classList.add('recipe-column-resizing');
      handle.setPointerCapture?.(pointerId);
      const move=next=>{
        if(next.pointerId===pointerId)setWidth(index,startWidth+next.clientX-startX);
      };
      const finish=next=>{
        if(next?.pointerId!=null&&next.pointerId!==pointerId)return;
        document.removeEventListener('pointermove',move);
        document.removeEventListener('pointerup',finish);
        document.removeEventListener('pointercancel',finish);
        handle.removeEventListener('lostpointercapture',finish);
        window.removeEventListener('blur',finish);
        dialog.removeEventListener('close',finish);
        if(handle.hasPointerCapture?.(pointerId))handle.releasePointerCapture(pointerId);
        handle.classList.remove('active');
        document.body.classList.remove('recipe-column-resizing');
        saveWidths();
      };
      document.addEventListener('pointermove',move);
      document.addEventListener('pointerup',finish);
      document.addEventListener('pointercancel',finish);
      handle.addEventListener('lostpointercapture',finish);
      window.addEventListener('blur',finish);
      dialog.addEventListener('close',finish);
    });
  });
  applyWidths();
  }
  setupTable(document.querySelector('#recipeDialog .recipe-ingredient-map-table'),'recipeIngredientColumnWidths_v1');
  setupTable(document.querySelector('#preparationDialog .recipe-ingredient-map-table'),'preparationIngredientColumnWidths_v1');
})();
