const TARGET = 100000000;
const i18n = {
  fr: {
    navWhy:'Pourquoi',navFacts:'Les faits',navShare:'Partager',kicker:'PÉTITION MONDIALE · OBJECTIF 100 MILLIONS',
    headline:'2020 ne devrait pas rester <span class="gold">une page blanche.</span>',
    lead:'Nous demandons une reconnaissance rétroactive du Ballon d’Or 2020 pour Robert Lewandowski — sans retirer le trophée de qui que ce soit, puisque l’édition 2020 n’a pas été attribuée.',
    verified:'signatures comptées',goal:'Objectif : 100 000 000',fact55:'buts en 47 matchs avec le Bayern en 2019/20',fact15:'buts en Ligue des champions 2019/20',fact3:'trophées majeurs : Bundesliga, Coupe d’Allemagne, Ligue des champions',
    signTitle:'Signe la pétition',signSub:'1 clic suffit. Aucun compte. L’e-mail est facultatif et renforce simplement la fiabilité de ta signature.',nameLabel:'Prénom et nom · facultatif',emailLabel:'E-mail · recommandé, facultatif',emailHint:'Si tu le renseignes, tu pourras le confirmer pour renforcer ta signature.',countryLabel:'Pays · facultatif',countryPick:'Ne pas préciser',publicName:'Si je donne mon nom, j’accepte qu’il puisse apparaître dans une liste publique de soutiens.',updatesOptIn:'Si je donne mon e-mail, je souhaite recevoir les grandes étapes de la campagne. Désinscription à tout moment.',
    consent:'En cliquant sur « Je signe », tu acceptes le traitement des informations que tu fournis pour gérer la pétition et lutter contre les abus. L’e-mail n’est pas obligatoire. <a href="/confidentialite" target="_blank">Confidentialité.</a>',signBtn:'JE SIGNE POUR LEWY 2020',
    requestEyebrow:'LA DEMANDE',requestTitle:'Ce qu’on demande.',requestP1:'Pas de réécriture d’un vote. Pas de trophée retiré à un autre joueur. Nous demandons aux organisateurs du Ballon d’Or d’étudier une attribution rétroactive, exceptionnelle et explicitement datée <strong>« Ballon d’Or 2020 »</strong>, à Robert Lewandowski.',requestP2:'Le but est simple : transformer une année officiellement sans lauréat en reconnaissance historique d’une saison hors norme.',quote:'« Une saison comme celle-là n’est jamais garantie deux fois dans une carrière. »',independent:'Cette campagne est une initiative indépendante de supporters. Elle n’est ni affiliée ni approuvée par France Football, L’Équipe, l’UEFA, la FIFA, le Bayern Munich ou Robert Lewandowski.',
    factsEyebrow:'BASE FACTUELLE',factsTitle:'Les faits derrière la campagne.',f1t:'Le Ballon d’Or 2020 n’a pas été attribué.',f1b:'Le palmarès officiel du Ballon d’Or affiche « No Ballon d’Or » pour 2020, entre Messi 2019 et Messi 2021.',f2t:'Lewandowski a dominé la saison 2019/20.',f2b:'L’UEFA recense 55 buts en 47 matchs avec le Bayern, dont 15 en Ligue des champions, lors d’une saison conclue par le triplé.',f3t:'Il a été reconnu par d’autres grandes institutions.',f3b:'Lewandowski a remporté le prix UEFA du Joueur de l’année 2019/20 et The Best FIFA Men’s Player 2020.',
    movementEyebrow:'FAIRE GRANDIR LE MOUVEMENT',movementTitle:'100 millions, ça ne se fait pas seul.',movementBody:'On veut une campagne internationale : supporters du Bayern, de Pologne, fans de football, créateurs TikTok/YouTube/X, anciens joueurs et médias. Le message doit rester factuel et positif : reconnaître 2020, pas attaquer d’autres lauréats.',shareTitle:'Partager la campagne',copy:'Copier le lien',hashtag:'Hashtag proposé : #GiveLewy2020',transparency:'Transparence :',footerText:'cette pétition est indépendante. Le compteur représente uniquement les signatures acceptées par les protections anti-abus. Les données ne sont pas vendues ni utilisées à des fins publicitaires.',privacy:'Confidentialité',
    signed:'Signé ✅ Merci. Ta signature est comptée.',signedEmail:'Signé ✅ Vérifie ton e-mail si tu veux renforcer ta signature.',pending:'Ta signature est reçue et passe une vérification anti-abus.',challenge:'Petite vérification anti-bot nécessaire avant de compter la signature.',error:'Impossible d’enregistrer la signature.',copied:'Lien copié.'
  },
  en: {
    navWhy:'Why',navFacts:'The facts',navShare:'Share',kicker:'GLOBAL PETITION · 100 MILLION GOAL',
    headline:'2020 should not remain <span class="gold">a blank page.</span>',
    lead:'We are asking for retroactive recognition of the 2020 Ballon d’Or for Robert Lewandowski — without taking any trophy away from anyone, because the 2020 edition was not awarded.',
    verified:'counted signatures',goal:'Goal: 100,000,000',fact55:'goals in 47 Bayern matches in 2019/20',fact15:'Champions League goals in 2019/20',fact3:'major trophies: Bundesliga, German Cup, Champions League',
    signTitle:'Sign the petition',signSub:'One click is enough. No account. Email is optional and simply makes your signature more trustworthy.',nameLabel:'Full name · optional',emailLabel:'Email · recommended, optional',emailHint:'If you add it, you can confirm it to strengthen your signature.',countryLabel:'Country · optional',countryPick:'Prefer not to say',publicName:'If I provide my name, it may appear in a public supporter list.',updatesOptIn:'If I provide my email, I want major campaign updates. Unsubscribe anytime.',
    consent:'By clicking “Sign”, you agree that the information you provide may be processed to manage the petition and prevent abuse. Email is not required. <a href="/privacy.html" target="_blank">Privacy.</a>',signBtn:'SIGN FOR LEWY 2020',
    requestEyebrow:'THE REQUEST',requestTitle:'What we are asking for.',requestP1:'No rewriting of a vote. No trophy taken from another player. We ask the Ballon d’Or organisers to consider an exceptional retroactive award, explicitly dated <strong>“Ballon d’Or 2020”</strong>, to Robert Lewandowski.',requestP2:'The idea is simple: turn an officially unawarded year into historical recognition of an extraordinary season.',quote:'“A season like that is never guaranteed twice in a career.”',independent:'This is an independent fan-led campaign. It is not affiliated with or endorsed by France Football, L’Équipe, UEFA, FIFA, Bayern Munich or Robert Lewandowski.',
    factsEyebrow:'FACTUAL BASIS',factsTitle:'The facts behind the campaign.',f1t:'The 2020 Ballon d’Or was not awarded.',f1b:'The official Ballon d’Or winners list shows “No Ballon d’Or” for 2020, between Messi 2019 and Messi 2021.',f2t:'Lewandowski dominated the 2019/20 season.',f2b:'UEFA records 55 goals in 47 Bayern matches, including 15 in the Champions League, in a treble-winning season.',f3t:'Other major institutions recognised him.',f3b:'Lewandowski won the 2019/20 UEFA Men’s Player of the Year award and The Best FIFA Men’s Player 2020.',
    movementEyebrow:'GROW THE MOVEMENT',movementTitle:'100 million takes a global movement.',movementBody:'The campaign is for Bayern supporters, Poland fans, football fans everywhere, TikTok/YouTube/X creators, former players and media. Keep the message factual and positive: recognise 2020, do not attack other winners.',shareTitle:'Share the campaign',copy:'Copy link',hashtag:'Suggested hashtag: #GiveLewy2020',transparency:'Transparency:',footerText:'this petition is independent. The counter includes only signatures accepted by the anti-abuse protections. Signer data is not sold or used for advertising.',privacy:'Privacy',
    signed:'Signed ✅ Thank you. Your signature is counted.',signedEmail:'Signed ✅ Check your email if you want to strengthen your signature.',pending:'Your signature was received and is going through an anti-abuse check.',challenge:'A quick anti-bot check is needed before the signature can be counted.',error:'Unable to save your signature.',copied:'Link copied.'
  }
};

let lang = localStorage.getItem('lang') || 'fr';
function applyLang(){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.dataset.i18n;if(i18n[lang][k])el.textContent=i18n[lang][k]});
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{const k=el.dataset.i18nHtml;if(i18n[lang][k])el.innerHTML=i18n[lang][k]});
  document.getElementById('lang').textContent = lang==='fr'?'EN':'FR';
}
applyLang();
document.getElementById('lang').addEventListener('click',()=>{lang=lang==='fr'?'en':'fr';localStorage.setItem('lang',lang);applyLang();updateShare()});

async function refreshCount(){
  try{
    const r=await fetch('/api/count',{cache:'no-store'});
    const d=await r.json();
    const count=Number(d.count||0);
    document.getElementById('count').textContent=count.toLocaleString(lang==='fr'?'fr-FR':'en-US');
    const pct=Math.min(100,(count/TARGET)*100);
    document.getElementById('percent').textContent=(pct<.01?pct.toFixed(6):pct.toFixed(2))+'%';
    document.getElementById('progressBar').style.width=Math.max(.003,pct)+'%';
  }catch{}
}
refreshCount();

let turnstileLoader;
function loadTurnstile(){
  if(window.turnstile)return Promise.resolve();
  if(turnstileLoader)return turnstileLoader;
  turnstileLoader=new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async=true;s.defer=true;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });
  return turnstileLoader;
}
async function getTurnstileToken(){
  const cfg=await fetch('/api/config',{cache:'no-store'}).then(r=>r.json());
  if(!cfg.turnstileSiteKey)throw new Error(i18n[lang].error);
  await loadTurnstile();
  const challenge=document.getElementById('challenge');
  const target=document.getElementById('turnstileWidget');
  challenge.hidden=false; target.innerHTML='';
  return new Promise((resolve,reject)=>{
    window.turnstile.render(target,{sitekey:cfg.turnstileSiteKey,theme:'dark',callback:resolve,'error-callback':()=>reject(new Error(i18n[lang].error)),'expired-callback':()=>{}});
  });
}

const form=document.getElementById('petitionForm');
async function submitPetition(payload,allowChallenge=true){
  const r=await fetch('/api/signatures',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  const d=await r.json().catch(()=>({}));
  if(r.status===403&&d.code==='challenge_required'&&allowChallenge){
    const status=document.getElementById('status');status.textContent=i18n[lang].challenge;
    const turnstileToken=await getTurnstileToken();
    return submitPetition({...payload,turnstileToken},false);
  }
  if(!r.ok)throw new Error(d.error||i18n[lang].error);
  return d;
}

form.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const btn=document.getElementById('submitBtn');
  const status=document.getElementById('status');
  btn.disabled=true;status.textContent='';
  const fd=new FormData(form);
  const payload={
    name:fd.get('name'),email:fd.get('email'),country:fd.get('country'),
    publicName:fd.get('publicName')==='on',updatesOptIn:fd.get('updatesOptIn')==='on',website:fd.get('website')
  };
  try{
    const d=await submitPetition(payload);
    if(d.status==='accepted')status.textContent=d.emailVerification==='sent'?i18n[lang].signedEmail:i18n[lang].signed;
    else status.textContent=i18n[lang].pending;
    if(d.accepted)refreshCount();
    form.querySelectorAll('input:not([type="checkbox"]), select').forEach(el=>{if(el.name!=='website')el.value=''});
    form.querySelectorAll('input[type="checkbox"]').forEach(el=>el.checked=false);
    document.getElementById('challenge').hidden=true;
  }catch(err){status.textContent=err.message||i18n[lang].error}
  finally{btn.disabled=false}
});

const shareText=()=>lang==='fr'?'2020 est resté sans Ballon d’Or. Je signe pour demander une reconnaissance rétroactive de Robert Lewandowski. #GiveLewy2020':'2020 had no Ballon d’Or winner. I signed to ask for retroactive recognition for Robert Lewandowski. #GiveLewy2020';
function updateShare(){
  const u=location.href;
  document.getElementById('shareX').href=`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText())}&url=${encodeURIComponent(u)}`;
  document.getElementById('shareWa').href=`https://wa.me/?text=${encodeURIComponent(shareText()+' '+u)}`;
}
updateShare();
document.getElementById('copyLink').addEventListener('click',async()=>{
  await navigator.clipboard.writeText(location.href);
  document.getElementById('copyLink').textContent=i18n[lang].copied;
  setTimeout(()=>document.getElementById('copyLink').textContent=i18n[lang].copy,1300);
});
