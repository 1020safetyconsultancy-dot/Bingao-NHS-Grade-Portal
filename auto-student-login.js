(function(){
  let autoGenerating=false;
  const originalLoadData=window.loadData;

  function canCreateStudentLogins(){
    return typeof me!=='undefined' && me && (me.role==='adviser' || me.role==='admin');
  }

  function rememberCredential(student,data){
    window.bulkStudentCredentials=window.bulkStudentCredentials||[];
    const item={
      student_id:student.id,
      full_name:student.full_name,
      lrn:student.lrn||'',
      grade_level:student.grade_level||'',
      section_name:student.section_name||'',
      user_code:data.user_code,
      temporary_password:data.temporary_password
    };
    const idx=window.bulkStudentCredentials.findIndex(x=>x.student_id===student.id);
    if(idx>=0) window.bulkStudentCredentials[idx]=item; else window.bulkStudentCredentials.push(item);
    try{sessionStorage.setItem('bnhs_auto_credentials',JSON.stringify(window.bulkStudentCredentials));}catch(e){}
  }

  function restoreCredentials(){
    try{
      const saved=JSON.parse(sessionStorage.getItem('bnhs_auto_credentials')||'[]');
      if(Array.isArray(saved) && saved.length){
        window.bulkStudentCredentials=window.bulkStudentCredentials||[];
        saved.forEach(item=>{
          const idx=window.bulkStudentCredentials.findIndex(x=>x.student_id===item.student_id);
          if(idx<0) window.bulkStudentCredentials.push(item);
        });
      }
    }catch(e){}
  }

  async function autoCreateMissingLogins(){
    if(autoGenerating || !canCreateStudentLogins()) return;
    const missing=(typeof students!=='undefined' ? students : []).filter(s=>!s.user_id);
    if(!missing.length) return;
    autoGenerating=true;
    let created=0, failed=0;
    try{
      for(let i=0;i<missing.length;i++){
        const s=missing[i];
        try{
          status(`Automatically creating login ${i+1} of ${missing.length}: ${s.full_name}`);
          const r=await sb.functions.invoke('bnhs-create-user',{body:{role:'student',student_id:s.id,user_code:s.user_code||null,full_name:s.full_name}});
          if(r.error || !r.data?.ok){ failed++; continue; }
          rememberCredential(s,r.data);
          created++;
        }catch(e){ failed++; }
      }
      if(created){
        await originalLoadData();
        const active=document.querySelector('.page.active')?.id;
        if(active==='students' && typeof renderStudents==='function') renderStudents();
        if(active==='dashboard' && typeof renderDashboard==='function') renderDashboard();
      }
      if(created || failed) status(`${created} login(s) generated automatically${failed?` • ${failed} issue(s)`:''}`);
    }finally{
      autoGenerating=false;
    }
  }

  window.loadData=async function(){
    const result=await originalLoadData.apply(this,arguments);
    await autoCreateMissingLogins();
    return result;
  };

  window.autoCreateMissingLogins=autoCreateMissingLogins;
  restoreCredentials();

  // For learners already loaded before this script was evaluated.
  setTimeout(()=>{ autoCreateMissingLogins().catch(()=>{}); },500);
})();
