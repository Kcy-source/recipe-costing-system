(function setupAccountAdmin(){
  const nav=document.getElementById('managementNavBtn');
  const form=document.getElementById('accountAddForm');
  const rows=document.getElementById('accountRows');
  if(!nav||!form||!rows)return;

  let currentEmail='';
  let isAdmin=false;

  const roleLabel=role=>role==='admin'?'管理员':'普通用户';

  async function getCurrentAccount(){
    const {data:{session}}=await sb.auth.getSession();
    if(!session?.user?.email)return null;
    currentEmail=String(session.user.email).trim().toLowerCase();

    const {data,error}=await sb.from('app_accounts')
      .select('id,email,role,is_active,created_at')
      .ilike('email',currentEmail)
      .maybeSingle();

    if(error){
      console.error('读取当前账号失败',error);
      return null;
    }
    return data;
  }

  async function loadAccounts(){
    if(!isAdmin)return;
    rows.innerHTML='<tr><td colspan="4" class="muted">正在读取账号...</td></tr>';

    const {data,error}=await sb.from('app_accounts')
      .select('id,email,role,is_active,created_at')
      .order('created_at',{ascending:true});

    if(error){
      console.error(error);
      rows.innerHTML='<tr><td colspan="4" class="warn">账号资料读取失败</td></tr>';
      toast(error.message);
      return;
    }

    const accounts=data||[];
    rows.innerHTML=accounts.length?accounts.map(a=>{
      const email=String(a.email||'');
      const own=email.toLowerCase()===currentEmail;
      const created=a.created_at?new Date(a.created_at).toLocaleString('zh-SG',{timeZone:'Asia/Singapore'}):'-';
      return `<tr>
        <td><strong>${esc(email)}</strong>${own?'<span class="account-current">当前账号</span>':''}</td>
        <td>
          <select class="account-role-select" onchange="updateManagedAccount('${a.id}','role',this.value)" ${own?'disabled':''}>
            <option value="user" ${a.role==='user'?'selected':''}>普通用户</option>
            <option value="admin" ${a.role==='admin'?'selected':''}>管理员</option>
          </select>
        </td>
        <td>
          <select class="account-status-select" onchange="updateManagedAccount('${a.id}','is_active',this.value)" ${own?'disabled':''}>
            <option value="true" ${a.is_active?'selected':''}>启用</option>
            <option value="false" ${!a.is_active?'selected':''}>停用</option>
          </select>
        </td>
        <td>${esc(created)}</td>
      </tr>`;
    }).join(''):'<tr><td colspan="4" class="muted">还没有账号</td></tr>';
  }

  window.updateManagedAccount=async(id,field,value)=>{
    if(!isAdmin)return;
    const patch={};
    patch[field]=field==='is_active'?value==='true':value;
    const {error}=await sb.from('app_accounts').update(patch).eq('id',id);
    if(error){toast(error.message);return loadAccounts();}
    toast('账号资料已更新');
    await loadAccounts();
  };

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!isAdmin)return;

    const email=document.getElementById('accountEmail').value.trim().toLowerCase();
    const role=document.getElementById('accountRole').value;
    if(!email)return toast('请输入邮箱');

    const {error}=await sb.from('app_accounts').upsert(
      {email,role,is_active:true},
      {onConflict:'email'}
    );

    if(error)return toast(error.message);

    document.getElementById('accountEmail').value='';
    document.getElementById('accountRole').value='user';
    toast('账号已加入，可以让对方注册了');
    await loadAccounts();
  });

  nav.addEventListener('click',()=>{ if(isAdmin)loadAccounts(); });
  document.getElementById('refreshBtn')?.addEventListener('click',()=>{ if(isAdmin)loadAccounts(); });

  async function init(){
    const account=await getCurrentAccount();
    isAdmin=!!(account&&account.is_active&&account.role==='admin');
    nav.classList.toggle('hidden',!isAdmin);
    if(isAdmin)await loadAccounts();
  }

  sb.auth.onAuthStateChange(()=>setTimeout(init,0));
  init();
})();