(function(){
  const PERIODS=['1st Term','2nd Term','3rd Term','Final School Year'];
  let certPeriod='1st Term';
  let certFilter='all';
  let selectedCertIds=new Set();

  function ensurePage(){
    const content=document.querySelector('.content');
    if(content && !document.getElementById('certificates')){
      const sec=document.createElement('section'); sec.id='certificates'; sec.className='page'; content.appendChild(sec);
    }
  }

  function classify(avg){
    const n=Math.round(avg);
    if(n>=98&&n<=100)return {key:'highest',label:'WITH HIGHEST HONORS',range:'98–100'};
    if(n>=95)return {key:'high',label:'WITH HIGH HONORS',range:'95–97'};
    if(n>=90)return {key:'honors',label:'WITH HONORS',range:'90–94'};
    return null;
  }

  function gradesForStudent(s,period){
    if(period!=='Final School Year'){
      return SUBJECTS.map(sub=>grades.find(g=>g.student_id===s.id&&g.term===period&&g.subject===sub)?.grade).filter(v=>v!==undefined&&v!==null&&v!=='').map(Number);
    }
    return SUBJECTS.map(sub=>{
      const vals=['1st Term','2nd Term','3rd Term'].map(t=>grades.find(g=>g.student_id===s.id&&g.term===t&&g.subject===sub)?.grade).filter(v=>v!==undefined&&v!==null&&v!=='').map(Number);
      return vals.length===3?vals.reduce((a,b)=>a+b,0)/3:null;
    }).filter(v=>v!==null);
  }

  function qualification(s,period){
    const vals=gradesForStudent(s,period);
    if(vals.length!==SUBJECTS.length)return null;
    if(vals.some(v=>v<75))return null;
    const raw=vals.reduce((a,b)=>a+b,0)/vals.length;
    const award=classify(raw);
    if(!award)return null;
    return {student:s,raw,reported:Math.round(raw),award};
  }

  function qualified(){
    return students.map(s=>qualification(s,certPeriod)).filter(Boolean).filter(q=>certFilter==='all'||q.award.key===certFilter).sort((a,b)=>a.student.full_name.localeCompare(b.student.full_name));
  }

  function certCard(q){
    const periodText=certPeriod==='Final School Year'?'School Year 2026–2027':certPeriod+' of School Year 2026–2027';
    return `<div class="certPreview" style="background:linear-gradient(135deg,#092f67 0 8%,#fff 8% 92%,#092f67 92%);padding:9px;border:3px solid #c9952e;box-shadow:0 12px 30px rgba(0,0,0,.12)">
      <div style="background:white;min-height:490px;border:1px solid #d5ad5a;padding:25px 45px;text-align:center;position:relative;overflow:hidden">
        <div style="font-family:Georgia,serif;font-size:13px;line-height:1.35">Republic of the Philippines<br><strong>Department of Education</strong><br>Region I<br>Schools Division of Ilocos Norte<br><strong>BINGAO NATIONAL HIGH SCHOOL</strong><br>Bingao, Ilocos Norte</div>
        <div style="font-family:Georgia,serif;color:#b17b20;font-size:34px;margin-top:24px;letter-spacing:1px">CERTIFICATE OF RECOGNITION</div>
        <div style="margin-top:8px;font-family:Georgia,serif">is awarded to</div>
        <div style="font-family:Georgia,serif;font-size:42px;font-style:italic;margin:17px 0 9px">${esc(q.student.full_name)}</div>
        <div style="height:1px;background:#d3a449;width:65%;margin:0 auto 14px"></div>
        <div style="font-family:Georgia,serif;font-size:15px;line-height:1.55">for having attained a General Average of <strong>${q.reported}</strong> and passing final/quarterly grades in all learning areas for the ${esc(periodText)}.</div>
        <div style="font-family:Georgia,serif;color:#b17b20;font-size:24px;font-weight:bold;margin-top:17px">${q.award.label}</div>
        <div style="display:flex;justify-content:space-around;margin-top:45px;font-family:Georgia,serif"><div><div style="border-top:1px solid #333;min-width:210px;padding-top:5px"><strong>${esc(me.full_name||'Class Adviser')}</strong><br><span style="font-size:12px">Class Adviser</span></div></div><div><div style="border-top:1px solid #333;min-width:210px;padding-top:5px"><strong id="schoolHeadPreview">SCHOOL HEAD</strong><br><span style="font-size:12px">School Principal</span></div></div></div>
      </div>
    </div>`;
  }

  window.renderCertificates=function(){
    ensurePage();
    if(me?.role!=='adviser'){document.getElementById('certificates').innerHTML='<div class="empty">Adviser access required.</div>';return;}
    const list=qualified();
    const first=list[0];
    selectedCertIds=new Set([...selectedCertIds].filter(id=>list.some(q=>q.student.id===id)));
    const rows=list.map(q=>`<tr><td><input type="checkbox" ${selectedCertIds.has(q.student.id)?'checked':''} onchange="toggleCertStudent('${q.student.id}',this.checked)"></td><td><strong>${esc(q.student.full_name)}</strong><div class="muted">${esc(q.student.lrn||'No LRN')}</div></td><td>${q.reported}</td><td><span class="pill ok">${q.award.label.replace('WITH ','')}</span></td><td><button class="btn outline" onclick="previewCertificate('${q.student.id}')">Preview</button> <button class="btn primary" onclick="printOneCertificate('${q.student.id}')">Generate</button></td></tr>`).join('');
    document.getElementById('certificates').innerHTML=`<div class="toolbar"><div><h2 style="margin:0">Certificate Generator</h2><div class="muted">Automatically identifies Academic Excellence awardees and creates Canva-style certificates.</div></div></div>
      <div style="display:grid;grid-template-columns:minmax(280px,360px) 1fr;gap:18px;align-items:start">
        <div>
          <div class="panel"><div class="panelBody">
            <div class="field"><label>Grading Period</label><select id="certPeriod" onchange="certPeriodChanged(this.value)">${PERIODS.map(p=>`<option ${p===certPeriod?'selected':''}>${p}</option>`).join('')}</select></div>
            <div class="field"><label>Honor Category</label><select id="certFilter" onchange="certFilterChanged(this.value)"><option value="all">All Qualified</option><option value="honors" ${certFilter==='honors'?'selected':''}>With Honors (90–94)</option><option value="high" ${certFilter==='high'?'selected':''}>With High Honors (95–97)</option><option value="highest" ${certFilter==='highest'?'selected':''}>With Highest Honors (98–100)</option></select></div>
            <div class="field"><label>School Head / Principal</label><input id="certPrincipal" value="SCHOOL HEAD" oninput="updateCertPrincipal(this.value)"></div>
            <div class="field"><label>Awarding Date</label><input id="certDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
            <button class="btn primary wide" onclick="printSelectedCertificates()">Generate Selected Certificates (${selectedCertIds.size})</button>
            <button class="btn outline wide" style="margin-top:8px" onclick="selectAllCertificates()">Select All Qualified</button>
          </div></div>
          <div class="note"><strong>DepEd basis:</strong> Academic Excellence awards use reported whole-number averages: With Honors 90–94, With High Honors 95–97, and With Highest Honors 98–100. Learners must pass all learning areas.</div>
        </div>
        <div>
          <div class="panel"><div class="panelHead"><h3>Certificate Preview</h3></div><div class="panelBody">${first?certCard(first):'<div class="empty">No qualified learner with complete grades for the selected period.</div>'}</div></div>
          <div class="panel" style="margin-top:16px"><div class="panelHead"><div><h3>Qualified Learners (${list.length})</h3><div class="muted">Names are listed alphabetically within the selected category.</div></div></div><div class="tableWrap"><table><thead><tr><th></th><th>Learner</th><th>General Average</th><th>Award</th><th>Action</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty">No qualified learners found.</td></tr>'}</tbody></table></div></div>
        </div>
      </div>`;
  };

  window.certPeriodChanged=function(v){certPeriod=v;selectedCertIds.clear();renderCertificates();};
  window.certFilterChanged=function(v){certFilter=v;selectedCertIds.clear();renderCertificates();};
  window.toggleCertStudent=function(id,on){on?selectedCertIds.add(id):selectedCertIds.delete(id);const b=document.querySelector('#certificates .wide.primary');if(b)b.textContent=`Generate Selected Certificates (${selectedCertIds.size})`;};
  window.selectAllCertificates=function(){qualified().forEach(q=>selectedCertIds.add(q.student.id));renderCertificates();};
  window.updateCertPrincipal=function(v){const e=document.getElementById('schoolHeadPreview');if(e)e.textContent=v||'SCHOOL HEAD';};
  window.previewCertificate=function(id){const q=qualified().find(x=>x.student.id===id);if(!q)return;const body=document.querySelector('#certificates .panel .panelBody');if(body)body.innerHTML=certCard(q);updateCertPrincipal(document.getElementById('certPrincipal')?.value||'SCHOOL HEAD');};

  function printable(q){
    const principal=document.getElementById('certPrincipal')?.value||'SCHOOL HEAD';
    const dateVal=document.getElementById('certDate')?.value;
    const date=dateVal?new Date(dateVal+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}):'';
    const periodText=certPeriod==='Final School Year'?'School Year 2026–2027':certPeriod+' of School Year 2026–2027';
    return `<section class="certificate"><div class="inner"><div class="gov">Republic of the Philippines<br><b>Department of Education</b><br>Region I<br>Schools Division of Ilocos Norte<br><b>BINGAO NATIONAL HIGH SCHOOL</b><br>Bingao, Ilocos Norte</div><h1>CERTIFICATE OF RECOGNITION</h1><div>is awarded to</div><div class="student">${esc(q.student.full_name)}</div><div class="line"></div><p>for having attained a General Average of <b>${q.reported}</b> and passing grades in all learning areas for the ${esc(periodText)}.</p><h2>${q.award.label}</h2><p>Given this ${esc(date)} at Bingao National High School, Bingao, Ilocos Norte.</p><div class="sigs"><div><b>${esc(me.full_name||'CLASS ADVISER')}</b><span>Class Adviser</span></div><div><b>${esc(principal)}</b><span>School Principal</span></div></div></div></section>`;
  }
  function printList(list){if(!list.length)return alert('Select at least one qualified learner.');const w=window.open('','_blank','width=1200,height=850');if(!w)return alert('Please allow pop-ups to print certificates.');w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Academic Excellence Certificates</title><style>@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{margin:0;font-family:Georgia,serif}.certificate{page-break-after:always;width:100%;height:190mm;background:linear-gradient(135deg,#092f67 0 7%,#fff 7% 93%,#092f67 93%);padding:4mm;border:2px solid #c9952e}.inner{height:100%;background:#fff;border:1px solid #d5ad5a;text-align:center;padding:8mm 16mm}.gov{font-size:11pt;line-height:1.25}.certificate h1{color:#aa751c;font-size:31pt;font-weight:normal;margin:8mm 0 2mm}.student{font-size:32pt;font-style:italic;margin:6mm 0 2mm}.line{height:1px;background:#c9952e;width:65%;margin:auto}.certificate p{font-size:13pt;line-height:1.5;margin:5mm auto;max-width:80%}.certificate h2{font-size:21pt;color:#aa751c;margin:5mm}.sigs{display:flex;justify-content:space-around;margin-top:12mm}.sigs div{border-top:1px solid #333;min-width:58mm;padding-top:2mm;font-size:11pt}.sigs span{display:block;font-size:9pt;margin-top:1mm}</style></head><body>${list.map(printable).join('')}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);w.document.close();}
  window.printOneCertificate=function(id){const q=qualified().find(x=>x.student.id===id);if(q)printList([q]);};
  window.printSelectedCertificates=function(){const list=qualified().filter(q=>selectedCertIds.has(q.student.id));printList(list);};

  const originalNavItems=window.navItems;
  window.navItems=function(){const items=originalNavItems();if(me?.role==='adviser'&&!items.some(x=>x[0]==='certificates')){const idx=items.findIndex(x=>x[0]==='profile');items.splice(idx<0?items.length:idx,0,['certificates','Certificate Generator']);}return items;};
  const originalRenderPage=window.renderPage;
  window.renderPage=function(id){if(id==='certificates'){renderCertificates();return;}originalRenderPage(id);};
  const originalShowPage=window.showPage;
  window.showPage=function(id){ensurePage();originalShowPage(id);if(id==='certificates')renderCertificates();};
  ensurePage();
})();