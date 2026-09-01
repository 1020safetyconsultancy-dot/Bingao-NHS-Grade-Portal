(function(){
  const oldRenderDashboard = window.renderDashboard;
  const oldRenderStudents = window.renderStudents;
  const oldCreateStudentLogin = window.createStudentLogin;

  function ensureCredentialModal(){
    if(document.getElementById('credentialModal')) return;
    const wrap=document.createElement('div');
    wrap.id='credentialModal';
    wrap.className='modal';
    wrap.innerHTML=`<div class="modalCard" style="max-width:520px">
      <div class="modalHead"><strong>Student Login Details</strong><button class="btn outline" type="button" onclick="closeCredentialModal()">✕</button></div>
      <div class="modalBody"><div id="credentialBody"></div></div>
      <div class="modalFoot"><button class="btn outline" type="button" onclick="copyCredentialDetails()">Copy Details</button><button class="btn primary" type="button" onclick="printCredentialDetails()">Print Slip</button></div>
    </div>`;
    document.body.appendChild(wrap);
  }

  window.closeCredentialModal=function(){ const m=document.getElementById('credentialModal'); if(m)m.classList.remove('show'); };
  window.currentCredential=null;

  window.showStudentCredential=function(student,userCode,password){
    ensureCredentialModal();
    window.currentCredential={student,userCode,password};
    document.getElementById('credentialBody').innerHTML=`
      <div class="note" style="margin-top:0"><strong>Give these details directly to the learner.</strong><br>For security, the temporary password is shown only when it is created or reset.</div>
      <div style="margin-top:16px;display:grid;gap:12px">
        <div><div class="muted">Student Name</div><div style="font-size:18px;font-weight:800">${esc(student.full_name||'')}</div></div>
        <div><div class="muted">LRN</div><div style="font-weight:700">${esc(student.lrn||'—')}</div></div>
        <div class="field"><label>User ID</label><input id="credUserId" readonly value="${esc(userCode||'')}"></div>
        <div class="field"><label>Temporary Password</label><input id="credPassword" readonly value="${esc(password||'')}"></div>
      </div>`;
    document.getElementById('credentialModal').classList.add('show');
  };

  window.copyCredentialDetails=async function(){
    const c=window.currentCredential;if(!c)return;
    const text=`Bingao NHS Grade Portal\nStudent: ${c.student.full_name}\nLRN: ${c.student.lrn||'—'}\nUser ID: ${c.userCode}\nTemporary Password: ${c.password}`;
    try{await navigator.clipboard.writeText(text);alert('Login details copied.');}catch(e){prompt('Copy the login details below:',text);}
  };

  window.printCredentialDetails=function(){
    const c=window.currentCredential;if(!c)return;
    const w=window.open('','_blank','width=720,height=620');
    w.document.write(`<!doctype html><html><head><title>Student Login Slip</title><style>body{font-family:Arial;padding:36px;color:#17324d}.slip{border:2px solid #0b4ea2;border-radius:14px;padding:26px;max-width:620px;margin:auto}h1{color:#0b4ea2;margin:0 0 5px;font-size:24px}.muted{color:#65758a}.box{background:#f4f8fd;border:1px solid #d7e4f2;border-radius:10px;padding:14px;margin-top:14px}.label{font-size:11px;text-transform:uppercase;color:#65758a;font-weight:700}.value{font-size:19px;font-weight:800;margin-top:4px}.note{margin-top:20px;font-size:12px;color:#65758a}</style></head><body><div class="slip"><h1>Bingao National High School</h1><div class="muted">Grade Portal Login Details</div><div class="box"><div class="label">Student Name</div><div class="value">${esc(c.student.full_name)}</div></div><div class="box"><div class="label">LRN</div><div class="value">${esc(c.student.lrn||'—')}</div></div><div class="box"><div class="label">User ID</div><div class="value">${esc(c.userCode)}</div></div><div class="box"><div class="label">Temporary Password</div><div class="value">${esc(c.password)}</div></div><div class="note">Keep this login slip private. The learner should change the password when a password-change feature becomes available.</div></div><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  };

  window.manageStudentLogin=async function(i){
    const s=students[i]; if(!s) return;
    try{
      if(me.role==='adviser' && s.adviser_user_id && s.adviser_user_id!==me.user_id){alert('You can only manage login details for learners assigned to you.');return;}
      status(s.user_id?'Generating a new temporary password…':'Creating student login…');
      let body;
      if(s.user_id){
        if(!confirm(`Generate a new temporary password for ${s.full_name}? The previous password will stop working.`)) return;
        body={action:'reset_student_password',role:'student',student_id:s.id};
      }else{
        body={role:'student',student_id:s.id,user_code:s.user_code||null,full_name:s.full_name};
      }
      const r=await sb.functions.invoke('bnhs-create-user',{body});
      if(r.error||!r.data?.ok){alert(r.data?.error||r.error?.message||'Could not generate login details.');status('Login generation failed',true);return;}
      await loadData();
      const refreshed=students.find(x=>x.id===s.id)||s;
      showStudentCredential(refreshed,r.data.user_code,r.data.temporary_password);
      if(document.getElementById('students')?.classList.contains('active')) renderStudents();
      if(document.getElementById('dashboard')?.classList.contains('active')) renderDashboard();
      status('Student login details ready');
    }catch(e){alert(e.message||String(e));status('Login generation failed',true);}
  };

  window.createStudentLogin=window.manageStudentLogin;

  window.renderDashboard=function(){
    oldRenderDashboard();
    if(me?.role!=='adviser') return;
    const dash=document.getElementById('dashboard');
    const noLogin=students.filter(s=>!s.user_id).length;
    const rows=students.slice(0,8).map((s,i)=>`<tr><td><strong>${esc(s.full_name)}</strong><div class="muted">${esc(s.lrn||'No LRN')}</div></td><td><code>${esc(s.user_code||'Will be generated')}</code></td><td><span class="pill ${s.user_id?'ok':'pending'}">${s.user_id?'Login Active':'No Login'}</span></td><td><button class="btn ${s.user_id?'outline':'primary'}" onclick="manageStudentLogin(${i})">${s.user_id?'Reset & Show Details':'Create Login Details'}</button></td></tr>`).join('');
    dash.insertAdjacentHTML('beforeend',`<div class="panel" style="margin-top:17px"><div class="panelHead"><div><h3>Student Login Details</h3><div class="muted">${noLogin} learner(s) still need login accounts.</div></div><button class="btn outline" onclick="showPage('students')">View All Learners</button></div><div class="tableWrap"><table><thead><tr><th>Learner</th><th>User ID</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows||'<tr><td colspan="4" class="empty">No assigned learners yet.</td></tr>'}</tbody></table></div></div>`);
  };

  window.renderStudents=function(){
    oldRenderStudents();
    if(me?.role!=='adviser') return;
    const tbody=document.querySelector('#students tbody');
    if(!tbody) return;
    const trs=[...tbody.querySelectorAll('tr')];
    trs.forEach((tr,i)=>{
      if(!students[i]) return;
      const td=tr.lastElementChild;
      if(td && !td.querySelector('.adviser-login-btn')){
        const b=document.createElement('button');
        b.className='btn outline adviser-login-btn';
        b.style.marginRight='6px';
        b.textContent=students[i].user_id?'Login Details':'Create Login';
        b.onclick=()=>manageStudentLogin(i);
        td.prepend(b);
      }
    });
  };

  ensureCredentialModal();
})();
