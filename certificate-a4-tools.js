(function(){
  const style=document.createElement('style');
  style.textContent=`
    #certificates .certPreview{width:100%!important;aspect-ratio:297/210!important;height:auto!important;min-height:0!important;overflow:hidden!important}
    #certificates .certPreview>div{height:100%!important;min-height:0!important;display:flex!important;flex-direction:column!important;justify-content:flex-start!important}
    #certificates .panelBody .certPreview{max-width:1123px;margin:0 auto}
    #certificates .panelHead h3::after{content:' • A4 Landscape (297 × 210 mm)';font-weight:500;color:#6b7b90;font-size:12px}
  `;
  document.head.appendChild(style);

  function wrapA4Print(fn){
    if(typeof fn!=='function') return fn;
    return function(){
      const realOpen=window.open;
      window.open=function(){
        const w=realOpen.apply(window,arguments);
        if(!w) return w;
        const realWrite=w.document.write.bind(w.document);
        w.document.write=function(html){
          if(typeof html==='string' && html.includes('Academic Excellence Certificates')){
            html=html
              .replace('@page{size:A4 landscape;margin:8mm}','@page{size:A4 landscape;margin:0}')
              .replace('.certificate{page-break-after:always;width:100%;height:190mm;', '.certificate{page-break-after:always;width:297mm;height:210mm;')
              .replace('padding:4mm;border:2px solid #c9952e}', 'padding:6mm;border:2px solid #c9952e;overflow:hidden}')
              .replace('.inner{height:100%;', '.inner{width:100%;height:100%;');
          }
          return realWrite(html);
        };
        return w;
      };
      try{return fn.apply(this,arguments);}finally{setTimeout(()=>{window.open=realOpen;},0);}
    };
  }

  window.printOneCertificate=wrapA4Print(window.printOneCertificate);
  window.printSelectedCertificates=wrapA4Print(window.printSelectedCertificates);

  const oldRender=window.renderCertificates;
  window.renderCertificates=function(){
    oldRender();
    const preview=document.querySelector('#certificates .certPreview');
    if(preview){
      const note=document.createElement('div');
      note.className='muted';
      note.style.cssText='margin-top:8px;text-align:right;font-size:11px';
      note.textContent='A4 Landscape • 297 mm × 210 mm';
      if(!preview.nextElementSibling?.classList?.contains('a4-dimension-note')){
        note.classList.add('a4-dimension-note');
        preview.after(note);
      }
    }
  };
})();
