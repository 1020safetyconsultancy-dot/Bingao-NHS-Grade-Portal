(function(){
  let staffCredential=null;

  function ensureStaffCredentialModal(){
    if(document.getElementById('staffCredentialModal')) return;
    const wrap=document.createElement('div');
    wrap.id='staffCredentialModal';
    wrap.className='modal';
    wrap.innerHTML=`<div class="modalCard" style="max-width:540px">
      <div class="modalHead"><strong>Adviser / Admin Login Details</strong><button class="btn outline" type="button" onclick="closeStaffCredentialModal()">✕</button></div>
      <div class="modalBody"><div id="staffCredentialBody"></div></div>
      <div class="modalFoot"><button class="btn outline" type="button" onclick="copyStaffCredential()">Copy Details</button><button class="btn primary" type="button" onclick="printStaffCredential()">Print Slip</button></div>
    </div>`;
    document.body.appendChild(wrap);
  }

  window.closeStaffCredentialModal=function(){document.getElementById('staffCredentialModal')?.classList.remove('show')};
  window.showStaffCredential=function(account,password){
    ensureStaffCredentialModal();
    staffCredential={account,password};
    document.getElementById('staffCredentialBody').innerHTML=`<div class="note"><strong>Login details ready.</strong><br>Supabase does not store passwords in readable form, so the password shown here is a newly generated temporary password.</div>
      <div class="field"><label>Name</label><input readonly value="${esc(account.full_name||'')}"></div>
      <div class="field"><label>Role</label><input readonly value="${esc(roleName(account.role))}"></div>
      <div class="field"><label>User ID</label><input readonly value="${esc(account.user_code||'')}"></div>
      <div class="field"><label>Temporary Password</label><input readonly value="${esc(password||'')}"></div>`;
    document.getElementById('staffCredentialModal').classList.add('show');
  };

  window.copyStaffCredential=async function(){
    if(!staffCredential)return;
    const a=staffCredential.account;
    const text=`Bingao NHS Grade Portal\nName: ${a.full_name}\nRole: ${roleName(a.role)}\nUser ID: ${a.user_code}\nTemporary Password: ${staffCredential.password}`;
    try{await navigator.clipboard.writeText(text);alert('Login details copied.');}catch(e){prompt('Copy login details:',text);}
  };

  window.printStaffCredential=function(){
    if(!staffCredential)return;
    const a=staffCredential.account;
    const w=window.open('','_blank','width=720,height=620');
    if(!w)return alert('Please allow pop-ups to print the login slip.');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Account Login Slip</title><style>body{font-family:Arial;padding:36px;color:#17324d}.slip{border:2px solid #0b4ea2;border-radius:14px;padding:26px;max-width:620px;margin:auto}h1{color:#0b4ea2;margin:0 0 5px}.box{background:#f4f8fd;border:1px solid #d7e4f2;border-radius:10px;padding:14px;margin-top:14px}.label{font-size:11px;text-transform:uppercase;color:#65758a;font-weight:700}.value{font-size:19px;font-weight:800;margin-top:4px}.note{margin-top:18px;font-size:11px;color:#65758a}</style></head><body><div class="slip"><h1>Bingao National High School</h1><div>Grade Portal Login Details</div><div class="box"><div class="label">Name</div><div class="value">${esc(a.full_name)}</div></div><div class="box"><div class="label">Role</div><div class="value">${esc(roleName(a.role))}</div></div><div class="box"><div class="label">User ID</div><div class="value">${esc(a.user_code)}</div></div><div class="box"><div class="label">Temporary Password</div><div class="value">${esc(staffCredential.password)}</div></div><div class="note">Keep this login slip private. This temporary password replaces the previous password.</div></div><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  };

  window.resetStaffPassword=async function(userId){
    if(me?.role!=='admin')return alert('Administrator access required.');
    if(!confirm('Generate a new temporary password for this account? The previous password will stop working.'))return;
    status('Generating temporary password…');
    const r=await sb.functions.invoke('bnhs-create-user',{body:{action:'reset_account_password',user_id:userId}});
    if(r.error||!r.data?.ok){status('Password reset failed',true);return alert(r.data?.error||r.error?.message||'Could not reset password.');}
    showStaffCredential({user_id:r.data.user_id,user_code:r.data.user_code,full_name:r.data.full_name,role:r.data.role},r.data.temporary_password);
    status('Login details ready');
  };

  window.loadAccounts=async function(){
    let q=await sb.from('bnhs_profiles').select('user_id,user_code,full_name,role,active,created_at').in('role',['admin','adviser']).order('created_at');
    let rows=(q.data||[]).map(a=>`<tr><td><strong>${esc(a.full_name)}</strong></td><td>${roleName(a.role)}</td><td><code>${esc(a.user_code)}</code></td><td><span class="pill ${a.active?'ok':'bad'}">${a.active?'Active':'Inactive'}</span></td><td><button class="btn outline" onclick="resetStaffPassword('${a.user_id}')">Reset & Show Password</button></td><td><small>${esc(a.user_id)}</small></td></tr>`).join('');
    document.getElementById('accountTable').innerHTML=`<div class="tableWrap"><table><thead><tr><th>Name</th><th>Role</th><th>User ID</th><th>Status</th><th>Login Details</th><th>Auth UUID</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="empty">No accounts yet.</td></tr>'}</tbody></table></div>`;
  };

  const oldCreateStaff=window.createStaff;
  window.createStaff=async function(role){
    let name=prompt(`Enter ${roleName(role)} full name:`);if(!name?.trim())return;
    status('Creating account…');
    let r=await sb.functions.invoke('bnhs-create-user',{body:{role,full_name:name.trim()}});
    if(r.error||!r.data?.ok){status('Account creation failed',true);return alert(r.data?.error||r.error?.message||'Could not create account.');}
    showStaffCredential({user_id:r.data.user_id,user_code:r.data.user_code,full_name:r.data.full_name,role:r.data.role},r.data.temporary_password);
    await loadAccounts();
    status('Account created');
  };

  ensureStaffCredentialModal();
})();