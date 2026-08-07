const crypto=require('node:crypto');
const {supabase,hash,token,email,parseBody,getOrCreateSession,getClientIp,hashIp,hashUa,hashSession,validEmail}=require('./_util');

async function countRows(query){
  const r=await supabase(query,{headers:{Prefer:'count=exact',Range:'0-0'}});
  if(!r.ok)return 0;
  return Number((r.headers.get('content-range')||'0/0').split('/')[1]||0);
}

async function verifyTurnstile(response,ip){
  const secret=process.env.TURNSTILE_SECRET_KEY;
  if(!secret||!response)return false;
  const body=new URLSearchParams({secret,response});
  if(ip)body.set('remoteip',ip);
  const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body});
  if(!r.ok)return false;
  const d=await r.json();
  return !!d.success;
}

async function sendMail(to,verifyUrl,deleteUrl){
  const key=process.env.RESEND_API_KEY,from=process.env.PETITION_FROM_EMAIL;
  if(!key||!from)return false;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({
    from,to:[to],subject:'Confirme ton e-mail — Give Lewy 2020',
    html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:24px"><h1>Renforce ta signature</h1><p>Ta signature a bien été reçue. Confirme ton e-mail pour la rendre encore plus fiable dans nos statistiques anti-abus.</p><p><a href="${verifyUrl}" style="display:inline-block;background:#d5ad50;color:#171104;text-decoration:none;font-weight:700;padding:14px 18px;border-radius:10px">Confirmer mon e-mail</a></p><p style="font-size:13px;color:#666">Tu peux supprimer ta signature avec ce lien personnel : <a href="${deleteUrl}">supprimer ma signature</a>.</p><p style="font-size:13px;color:#666">Si tu n’as rien demandé, ignore cet e-mail.</p></div>`
  })});
  return r.ok;
}

module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY||!process.env.HASH_SALT){
      return res.status(503).json({error:'Le système de signatures n’est pas encore activé sur ce déploiement.'});
    }

    const b=parseBody(req);
    if(b.website)return res.status(200).json({ok:true,status:'accepted'});

    const name=String(b.name||'').trim();
    const mail=email(b.email);
    const country=String(b.country||'').trim();
    const publicName=!!b.publicName && !!name;
    const updatesOptIn=!!b.updatesOptIn && !!mail;
    if(name.length>80)return res.status(400).json({error:'Nom trop long.'});
    if(!validEmail(mail))return res.status(400).json({error:'E-mail invalide.'});
    if(country.length>80)return res.status(400).json({error:'Pays invalide.'});

    const sessionId=getOrCreateSession(req,res);
    const sessionHash=hashSession(sessionId);
    const ip=getClientIp(req);
    const ipHash=hashIp(ip);
    const uaHash=hashUa(String(req.headers['user-agent']||''));

    const sr=await supabase(`signatures?session_hash=eq.${encodeURIComponent(sessionHash)}&status=in.(accepted,pending)&select=id,status&limit=1`);
    if(!sr.ok)throw new Error('session lookup');
    const sessionRows=await sr.json();
    if(sessionRows.length)return res.status(409).json({error:'Cette session a déjà signé la pétition.',code:'already_signed'});

    if(mail){
      const er=await supabase(`signatures?email=eq.${encodeURIComponent(mail)}&status=in.(accepted,pending)&select=id,status&limit=1`);
      if(!er.ok)throw new Error('email lookup');
      const rows=await er.json();
      if(rows.length)return res.status(409).json({error:'Cet e-mail est déjà associé à une signature.',code:'email_duplicate'});
    }

    const sinceHour=new Date(Date.now()-60*60*1000).toISOString();
    const sinceTenMin=new Date(Date.now()-10*60*1000).toISOString();
    const [ipHour,ipTen,ipUaTen]=await Promise.all([
      ipHash?countRows(`signatures?ip_hash=eq.${encodeURIComponent(ipHash)}&created_at=gte.${encodeURIComponent(sinceHour)}&select=id`):0,
      ipHash?countRows(`signatures?ip_hash=eq.${encodeURIComponent(ipHash)}&created_at=gte.${encodeURIComponent(sinceTenMin)}&select=id`):0,
      ipHash&&uaHash?countRows(`signatures?ip_hash=eq.${encodeURIComponent(ipHash)}&user_agent_hash=eq.${encodeURIComponent(uaHash)}&created_at=gte.${encodeURIComponent(sinceTenMin)}&select=id`):0,
    ]);

    let risk=0;
    if(ipTen>=20||ipHour>=50)risk+=100;
    else if(ipTen>=10||ipHour>=25)risk+=70;
    else if(ipTen>=5||ipHour>=12)risk+=40;
    else if(ipHour>=6)risk+=20;
    if(ipUaTen>=5)risk+=30;
    if(!mail&&!name&&!country)risk+=8;
    if(mail)risk-=15;
    if(name)risk-=3;
    if(country)risk-=2;

    let turnstilePassed=false;
    if(b.turnstileToken){
      turnstilePassed=await verifyTurnstile(String(b.turnstileToken),ip);
      if(turnstilePassed)risk-=60;
      else risk+=40;
    }
    risk=Math.max(0,Math.min(100,risk));

    const challengeConfigured=!!(process.env.TURNSTILE_SECRET_KEY&&process.env.TURNSTILE_SITE_KEY);
    if(risk>=50 && challengeConfigured && !turnstilePassed){
      return res.status(403).json({error:'Une vérification anti-bot est nécessaire.',code:'challenge_required'});
    }
    if(risk>=90)return res.status(429).json({error:'Cette tentative ressemble à du trafic automatisé. Réessaie plus tard.',code:'risk_rejected'});

    const status=risk>=50?'pending':'accepted';
    const verifyRaw=mail?token():null;
    const deleteRaw=token();
    const now=new Date().toISOString();
    const rec={
      id:crypto.randomUUID(),name:name||null,email:mail||null,country:country||null,
      public_name:publicName,updates_opt_in:updatesOptIn,status,risk_score:risk,
      email_verified_at:null,verify_token_hash:verifyRaw?hash(verifyRaw):null,delete_token_hash:hash(deleteRaw),
      session_hash:sessionHash,ip_hash:ipHash,user_agent_hash:uaHash,created_at:now,
      accepted_at:status==='accepted'?now:null
    };
    const wr=await supabase('signatures',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(rec)});
    if(!wr.ok){console.error('write failed',wr.status,await wr.text());throw new Error('write')}

    let verification='not_provided';
    if(mail){
      const base=(process.env.SITE_URL||`https://${req.headers.host}`).replace(/\/$/,'');
      const sent=await sendMail(mail,`${base}/api/verify?token=${encodeURIComponent(verifyRaw)}`,`${base}/api/delete?token=${encodeURIComponent(deleteRaw)}`);
      verification=sent?'sent':'unavailable';
    }

    return res.status(200).json({ok:true,status,accepted:status==='accepted',emailVerification:verification});
  }catch(e){console.error(e);return res.status(500).json({error:'Impossible d’enregistrer la signature pour le moment.'})}
};
