(()=>{
  const MILESTONES=[10000,100000,1000000,10000000,100000000];
  let currentCount=0;

  function language(){return document.documentElement.lang==='en'?'en':'fr'}
  function compact(n){if(n>=1000000)return `${n/1000000}M`;if(n>=1000)return `${n/1000}K`;return String(n)}
  function full(n){return n.toLocaleString(language()==='fr'?'fr-FR':'en-US')}
  function nextGoal(count){return MILESTONES.find(value=>count<value)||null}
  function previousGoal(count){return [...MILESTONES].reverse().find(value=>count>=value)||0}
  function goalSlug(value){if(value>=1000000)return `${value/1000000}m`;if(value>=1000)return `${value/1000}k`;return String(value)}
  function shareUrl(){
    const goal=nextGoal(currentCount)||MILESTONES[MILESTONES.length-1];
    const url=new URL('/',location.origin);
    url.searchParams.set('goal',goalSlug(goal));
    return url.toString();
  }
  function shareMessage(){
    const goal=nextGoal(currentCount);
    if(language()==='en'){
      return goal
        ? `2020 had no Ballon d’Or winner. Help us reach ${compact(goal)} signatures for Robert Lewandowski. #GiveLewy2020`
        : '100 million signatures. One message: recognise Robert Lewandowski’s 2020 season. #GiveLewy2020';
    }
    return goal
      ? `2020 est resté sans Ballon d’Or. Aide-nous à atteindre ${compact(goal)} signatures pour Robert Lewandowski. #GiveLewy2020`
      : '100 millions de signatures. Un message : reconnaître la saison 2020 de Robert Lewandowski. #GiveLewy2020';
  }
  function ensurePulse(){
    let pulse=document.getElementById('milestonePulse');
    if(pulse)return pulse;
    const anchor=document.querySelector('.milestones');
    if(!anchor)return null;
    pulse=document.createElement('div');
    pulse.id='milestonePulse';
    pulse.className='milestone-pulse';
    pulse.innerHTML='<span class="milestone-pulse-label"></span><strong></strong><span class="milestone-pulse-copy"></span><div class="milestone-mini-progress" aria-hidden="true"><span></span></div>';
    anchor.insertAdjacentElement('afterend',pulse);
    return pulse;
  }
  function updateMilestones(){
    const pulse=ensurePulse();
    if(!pulse)return;
    const next=nextGoal(currentCount);
    const prev=previousGoal(currentCount);
    const spans=[...document.querySelectorAll('.milestones span')];
    spans.forEach((span,index)=>{
      const value=MILESTONES[index];
      span.classList.toggle('reached',currentCount>=value);
      span.classList.toggle('current',next===value);
      if(next===value)span.setAttribute('aria-current','step');else span.removeAttribute('aria-current');
    });
    const label=pulse.querySelector('.milestone-pulse-label');
    const strong=pulse.querySelector('strong');
    const copy=pulse.querySelector('.milestone-pulse-copy');
    const bar=pulse.querySelector('.milestone-mini-progress>span');
    if(next){
      pulse.classList.remove('done');
      label.textContent=language()==='fr'?'PROCHAIN PALIER':'NEXT MILESTONE';
      strong.textContent=compact(next);
      const remaining=Math.max(0,next-currentCount);
      copy.textContent=language()==='fr'
        ? `${full(remaining)} signature${remaining===1?'':'s'} restante${remaining===1?'':'s'} pour débloquer le prochain cap.`
        : `${full(remaining)} signature${remaining===1?'':'s'} to unlock the next milestone.`;
      const start=prev;
      const range=Math.max(1,next-start);
      const pct=Math.max(0,Math.min(100,((currentCount-start)/range)*100));
      bar.style.width=`${pct}%`;
    }else{
      pulse.classList.add('done');
      label.textContent=language()==='fr'?'OBJECTIF MONDIAL':'GLOBAL GOAL';
      strong.textContent='100M';
      copy.textContent=language()==='fr'?'Objectif atteint. Le mouvement a franchi les 100 millions de signatures.':'Goal reached. The movement has passed 100 million signatures.';
      bar.style.width='100%';
    }
  }
  function syncShareLinks(){
    const url=shareUrl();
    const text=shareMessage();
    const x=document.getElementById('shareX');
    const wa=document.getElementById('shareWa');
    if(x)x.href=`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    if(wa)wa.href=`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  }
  function syncAll(){updateMilestones();syncShareLinks()}
  function readCounter(){
    const el=document.getElementById('count');
    if(!el)return;
    const parsed=Number((el.textContent||'').replace(/[^0-9]/g,''));
    if(Number.isFinite(parsed))currentCount=parsed;
    syncAll();
  }

  const countEl=document.getElementById('count');
  if(countEl){
    new MutationObserver(readCounter).observe(countEl,{childList:true,subtree:true,characterData:true});
  }
  new MutationObserver(syncAll).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});

  const langButton=document.getElementById('lang');
  if(langButton)langButton.addEventListener('click',()=>queueMicrotask(syncAll));

  const copyButton=document.getElementById('copyLink');
  if(copyButton){
    copyButton.addEventListener('click',async event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      try{
        await navigator.clipboard.writeText(shareUrl());
        const original=language()==='fr'?'Copier le lien':'Copy link';
        copyButton.textContent=language()==='fr'?'Lien copié.':'Link copied.';
        setTimeout(()=>{copyButton.textContent=original},1300);
      }catch{}
    },true);
  }

  readCounter();
})();
