(function(){
  window.bulkStudentCredentials = window.bulkStudentCredentials || [];

  function adviserLearners(){
    if(typeof me==='undefined' || !me || me.role!=='adviser') return [];
    return (Array.isArray(students)?students:[]).filter(s=>!s.adviser_user_id || s.adviser_user_id===me.user_id);
  }

  function setBulkProgress(text){
    const el=document.getElementById('bulkLoginProgress');
    if(el) el.textContent=text;
    try{status(text)}catch(e){}
  }

  async function generateCredentialForStudent(s, resetExisting){
    let body;
    if(s.user_id){
      if(!resetExisting) return null;
      body={action:'reset_student_password',role:'student',student_id:s.id};
    }else{
      body={role:'student',student_id:s.id,user_code:s.user_code||null,full_name:s.full_name};
    }
    const r=await sb.functions.invoke('bnhs-create-user',{body});
    if(r.error || !r.data?.ok) throw new Error(r.data?.error || r.error?.message || `Could not create login for ${s.full_name}.`);
    return {
      student_id:s.id,
      full_name:s.full_name,
      lrn:s.lrn||'',
      grade_level:s.grade_level||'',
      section_name:s.section_name||'',
      user_code:r.data.user_code,
      temporary_password:r.data.temporary_password
    };
  }

  window.bulkCreateMissingStudentLogins=async function(){
    if(typeof me==='undefined' || me?.role!=='adviser') return alert('Adviser access required.');
    const list=adviserLearners().filter(s=>!s.user_id);
    if(!list.length) return alert('All assigned learners already have login accounts.');
    if(!confirm(`Create login details for ${list.length} learner(s) without accounts?`)) return;
    const creds=[], errors=[];
    for(let i=0;i<list.length;i++){
      const s=list[i];
      setBulkProgress(`Creating login ${i+1} of ${list.length}: ${s.full_name}`);
      try{
        const c=await generateCredentialForStudent(s,false);
        if(c) creds.push(c);
      }catch(e){errors.push(`${s.full_name}: ${e.message||e}`);}
    }
    window.bulkStudentCredentials=creds;
    await loadData();
    const active=document.querySelector('.page.active')?.id;
    if(active==='dashboard') renderDashboard();
    if(active==='students') renderStudents();
    setBulkProgress(`${creds.length} login(s) created${errors.length?` • ${errors.length} issue(s)`:''}`);
    if(errors.length){
      alert(`${creds.length} login(s) created.\n${errors.length} issue(s).\n\n${errors.slice(0,5).join('\n')}${errors.length>5?'\n...':''}`);
    }else{
      alert(`${creds.length} student login(s) created. You can now click “Bulk Print Slips”.`);
    }
  };

  window.prepareAllStudentLoginSlips=async function(){
    if(typeof me==='undefined' || me?.role!=='adviser') return alert('Adviser access required.');
    const list=adviserLearners();
    if(!list.length) return alert('No assigned learners found.');
    const active=list.filter(s=>s.user_id).length;
    const missing=list.length-active;
    if(!confirm(`Prepare login slips for all ${list.length} assigned learners?\n\n${missing} missing login(s) will be created.\n${active} existing password(s) will be reset so they can be printed.`)) return;
    const creds=[], errors=[];
    for(let i=0;i<list.length;i++){
      const s=list[i];
      setBulkProgress(`Preparing slip ${i+1} of ${list.length}: ${s.full_name}`);
      try{
        const c=await generateCredentialForStudent(s,true);
        if(c) creds.push(c);
      }catch(e){errors.push(`${s.full_name}: ${e.message||e}`);}
    }
    window.bulkStudentCredentials=creds;
    await loadData();
    const activePage=document.querySelector('.page.active')?.id;
    if(activePage==='dashboard') renderDashboard();
    if(activePage==='students') renderStudents();
    setBulkProgress(`${creds.length} slip(s) ready${errors.length?` • ${errors.length} issue(s)`:''}`);
    if(creds.length) bulkPrintStudentLoginSlips();
    if(errors.length) alert(`${errors.length} learner(s) could not be prepared.\n\n${errors.slice(0,5).join('\n')}${errors.length>5?'\n...':''}`);
  };

  window.bulkPrintStudentLoginSlips=function(){
    const creds=window.bulkStudentCredentials||[];
    if(!creds.length) return alert('No generated login details are available to print. First click “Bulk Create Missing Logins” or “Prepare & Print All Slips”.');
    const w=window.open('','_blank','width=1000,height=760');
    if(!w) return alert('Please allow pop-ups so the login slips can be printed.');
    const slips=creds.map(c=>`<section class="slip"><div class="school">Bingao National High School</div><div class="subtitle">Grade Portal Login Slip</div><div class="name">${esc(c.full_name)}</div><div class="meta">LRN: ${esc(c.lrn||'—')} &nbsp; • &nbsp; ${esc(c.grade_level||'')} ${c.section_name?'– '+esc(c.section_name):''}</div><div class="creds"><div><span>User ID</span><strong>${esc(c.user_code)}</strong></div><div><span>Temporary Password</span><strong>${esc(c.temporary_password)}</strong></div></div><div class="foot">Keep this slip private. Use the User ID and temporary password to sign in to the Bingao NHS Grade Portal.</div></section>`).join('');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Student Login Slips</title><style>@page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17324d;margin:0}.sheet{display:grid;grid-template-columns:1fr 1fr;gap:8mm}.slip{border:1.8px solid #0b4ea2;border-radius:12px;padding:14px;break-inside:avoid;min-height:123mm}.school{font-size:18px;font-weight:800;color:#0b4ea2}.subtitle{font-size:12px;color:#65758a;margin:3px 0 16px}.name{font-size:18px;font-weight:800}.meta{font-size:11px;color:#65758a;margin-top:4px}.creds{margin-top:16px;display:grid;gap:10px}.creds div{background:#f4f8fd;border:1px solid #d7e4f2;border-radius:8px;padding:10px}.creds span{display:block;font-size:10px;text-transform:uppercase;color:#65758a;font-weight:700}.creds strong{display:block;font-size:16px;margin-top:4px;word-break:break-all}.foot{font-size:10px;color:#65758a;margin-top:14px;line-height:1.45}</style></head><body><div class="sheet">${slips}</div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    w.document.close();
  };

  function addBulkButtonsToDashboard(){
    if(typeof me==='undefined' || me?.role!=='adviser') return;
    const dash=document.getElementById('dashboard');
    if(!dash || document.getElementById('bulkLoginTools')) return;
    const noLogin=adviserLearners().filter(s=>!s.user_id).length;
    const box=document.createElement('div');
    box.id='bulkLoginTools';
    box.className='panel';
    box.style.marginTop='17px';
    box.innerHTML=`<div class="panelHead"><div><h3>Bulk Student Login Details</h3><div class="muted">${noLogin} learner(s) still need login accounts.</div></div></div><div class="panelBody"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" onclick="bulkCreateMissingStudentLogins()">Bulk Create Missing Logins</button><button class="btn outline" onclick="bulkPrintStudentLoginSlips()">Bulk Print Slips</button><button class="btn outline" onclick="prepareAllStudentLoginSlips()">Prepare & Print All Slips</button></div><div id="bulkLoginProgress" class="muted" style="margin-top:10px">Create missing accounts first, or prepare all slips to reset existing passwords and print every learner.</div></div>`;
    dash.appendChild(box);
  }

  function addBulkButtonsToStudents(){
    if(typeof me==='undefined' || me?.role!=='adviser') return;
    const page=document.getElementById('students');
    if(!page || document.getElementById('studentBulkLoginButtons')) return;
    const toolbar=page.querySelector('.toolbar');
    if(!toolbar) return;
    const group=document.createElement('div');
    group.id='studentBulkLoginButtons';
    group.className='group';
    group.innerHTML=`<button class="btn primary" onclick="bulkCreateMissingStudentLogins()">Bulk Create Logins</button><button class="btn outline" onclick="bulkPrintStudentLoginSlips()">Bulk Print Slips</button><button class="btn outline" onclick="prepareAllStudentLoginSlips()">Prepare All & Print</button>`;
    toolbar.appendChild(group);
  }

  const previousDashboard=window.renderDashboard;
  window.renderDashboard=function(){previousDashboard();addBulkButtonsToDashboard();};
  const previousStudents=window.renderStudents;
  window.renderStudents=function(){previousStudents();addBulkButtonsToStudents();};
})();
