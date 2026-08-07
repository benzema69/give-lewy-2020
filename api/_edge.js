const crypto=require('node:crypto');
const EDGE_URL='https://tnbxlcumokajylirydvu.supabase.co/functions/v1/petition-api';
const SESSION_COOKIE='give_lewy_session';

function parseCookies(raw){
  const out={};
  for(const pair of String(raw||'').split(';')){
    const i=pair.indexOf('=');if(i<0)continue;
    const k=pair.slice(0,i).trim();const v=pair.slice(i+1).trim();
    if(k){try{out[k]=decodeURIComponent(v)}catch{out[k]=v}}
  }
  return out;
}
function validSession(v){return typeof v==='string'&&v.length>=20&&v.length<=200}
function sessionCookie(value,maxAge=60*60*24*180){
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function bodyOf(req){
  if(req.method==='GET'||req.method==='HEAD')return undefined;
  if(req.body==null)return undefined;
  if(typeof req.body==='string')return req.body;
  return JSON.stringify(req.body);
}

async function proxy(req,res,action){
  try{
    const qs=new URLSearchParams({action});
    if(req.query?.token)qs.set('token',String(req.query.token));
    const host=String(req.headers.host||'give-lewy-2020.vercel.app');
    const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0];
    const cookies=parseCookies(req.headers.cookie);
    let sessionId=validSession(cookies[SESSION_COOKIE])?cookies[SESSION_COOKIE]:null;
    if((action==='sign'||action==='delete-session')&&!sessionId)sessionId=crypto.randomUUID();
    const headers={
      'content-type':'application/json',
      'x-site-origin':`${proto}://${host}`,
      'x-client-ip':String(req.headers['x-forwarded-for']||req.headers['x-real-ip']||'').split(',')[0].trim(),
      'user-agent':String(req.headers['user-agent']||''),
    };
    if(sessionId){
      headers['x-petition-session']=sessionId;
      headers.cookie=`${SESSION_COOKIE}=${encodeURIComponent(sessionId)}`;
    }
    const r=await fetch(`${EDGE_URL}?${qs}`,{method:req.method,headers,body:bodyOf(req),redirect:'manual'});
    // Session cookies belong to the public Vercel domain. Never relay Supabase/Cloudflare Set-Cookie headers.
    if(action==='sign'&&sessionId)res.setHeader('Set-Cookie',sessionCookie(sessionId));
    if(action==='delete-session')res.setHeader('Set-Cookie',sessionCookie('',0));
    for(const h of ['location','cache-control']){
      const v=r.headers.get(h);if(v)res.setHeader(h,v);
    }
    const ct=r.headers.get('content-type');if(ct)res.setHeader('content-type',ct);
    const buf=Buffer.from(await r.arrayBuffer());
    return res.status(r.status).send(buf);
  }catch(e){
    console.error('edge proxy failed',e);
    return res.status(503).json({error:'Service temporairement indisponible.'});
  }
}
module.exports={proxy};
