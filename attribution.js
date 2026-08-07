(()=>{
  const SOURCES={
    shareX:'share_x',
    shareWa:'share_whatsapp',
    copyLink:'share_copy',
    launchX:'share_x',
    launchWa:'share_whatsapp',
    launchCopy:'share_copy',
    nativeShare:'share_native'
  };

  function withSource(input,source){
    try{
      const url=new URL(input,location.origin);
      url.searchParams.set('source',source);
      return url.toString();
    }catch{return input}
  }

  function xCampaignUrl(anchor){
    try{
      const outer=new URL(anchor.href);
      return outer.searchParams.get('url')||'';
    }catch{return''}
  }

  function patchX(anchor,source){
    try{
      const outer=new URL(anchor.href);
      const campaign=outer.searchParams.get('url');
      if(campaign)outer.searchParams.set('url',withSource(campaign,source));
      anchor.href=outer.toString();
    }catch{}
  }

  function patchWhatsApp(anchor,source){
    try{
      const outer=new URL(anchor.href);
      const text=outer.searchParams.get('text')||'';
      const matches=[...text.matchAll(/https?:\/\/[^\s]+/g)];
      const last=matches[matches.length-1];
      if(last){
        const original=last[0];
        const tracked=withSource(original,source);
        outer.searchParams.set('text',text.slice(0,last.index)+tracked+text.slice((last.index||0)+original.length));
        anchor.href=outer.toString();
      }
    }catch{}
  }

  function personalBase(){
    const shown=document.getElementById('launchLink')?.textContent?.trim();
    if(shown&&/^https?:\/\//i.test(shown))return shown;
    return `${location.origin}/`;
  }

  function staticBase(){
    const x=document.getElementById('shareX');
    const fromX=x?xCampaignUrl(x):'';
    if(fromX)return fromX;
    const url=new URL('/',location.origin);
    const goal=new URLSearchParams(location.search).get('goal');
    if(goal)url.searchParams.set('goal',goal);
    return url.toString();
  }

  function copyLabel(){
    const lang=document.documentElement.lang||'fr';
    return ({fr:'Lien copié.',en:'Link copied.',pl:'Link skopiowany.',de:'Link kopiert.'})[lang]||'Link copied.';
  }

  async function copyTracked(button,base,source){
    const tracked=withSource(base,source);
    await navigator.clipboard.writeText(tracked);
    const previous=button.textContent;
    button.textContent=copyLabel();
    setTimeout(()=>{button.textContent=previous},1300);
  }

  function shareTextFromWhatsApp(){
    try{
      const anchor=document.getElementById('launchWa');
      if(!anchor?.href)return'';
      const text=new URL(anchor.href).searchParams.get('text')||'';
      const base=personalBase();
      return text.endsWith(base)?text.slice(0,-base.length).trim():text.replace(/\s+https?:\/\/[^\s]+\s*$/,'').trim();
    }catch{return''}
  }

  document.addEventListener('click',async event=>{
    const target=event.target instanceof Element?event.target.closest('#shareX,#shareWa,#copyLink,#launchX,#launchWa,#launchCopy,#nativeShare'):null;
    if(!target)return;
    const id=target.id;
    const source=SOURCES[id];
    if(!source)return;

    if(id==='shareX'||id==='launchX'){
      patchX(target,source);
      return;
    }
    if(id==='shareWa'||id==='launchWa'){
      patchWhatsApp(target,source);
      return;
    }
    if(id==='copyLink'){
      event.preventDefault();
      event.stopImmediatePropagation();
      try{await copyTracked(target,staticBase(),source)}catch{}
      return;
    }
    if(id==='launchCopy'){
      event.preventDefault();
      event.stopImmediatePropagation();
      try{await copyTracked(target,personalBase(),source)}catch{}
      return;
    }
    if(id==='nativeShare'){
      event.preventDefault();
      event.stopImmediatePropagation();
      const url=withSource(personalBase(),source);
      const text=shareTextFromWhatsApp();
      if(navigator.share){
        try{await navigator.share({title:'Give Lewy 2020',text,url});return}catch{}
      }
      try{await navigator.clipboard.writeText(url)}catch{}
    }
  },true);

  window.giveLewyTrackedUrl=(source,base=location.href)=>withSource(base,String(source||'direct').toLowerCase());
})();
