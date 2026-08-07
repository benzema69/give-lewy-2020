const crypto = require('node:crypto');

const SESSION_COOKIE = 'give_lewy_session';

function envConfig(){
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error('Supabase not configured');
  return {url:url.replace(/\/$/,''),key};
}

async function supabase(path,init={}){
  const {url,key}=envConfig();
  const headers={...(init.headers||{}),apikey:key,Authorization:`Bearer ${key}`};
  if(init.body && !headers['Content-Type']) headers['Content-Type']='application/json';
  return fetch(`${url}/rest/v1/${path}`,{...init,headers,cache:'no-store'});
}

function hash(v){return crypto.createHash('sha256').update(v).digest('hex')}
function hmac(label,value){
  const salt=process.env.HASH_SALT;
  if(!salt||!value) return null;
  return crypto.createHmac('sha256',salt).update(`${label}:${value}`).digest('hex');
}
function token(){return crypto.randomBytes(32).toString('base64url')}
function email(v){return String(v||'').trim().toLowerCase()}
function parseBody(req){
  if(typeof req.body==='object'&&req.body)return req.body;
  if(typeof req.body==='string'){try{return JSON.parse(req.body)}catch{return {}}}
  return {};
}
function parseCookies(req){
  return String(req.headers.cookie||'').split(';').reduce((acc,pair)=>{
    const i=pair.indexOf('='); if(i<0)return acc;
    const k=pair.slice(0,i).trim(); const v=pair.slice(i+1).trim();
    if(k) acc[k]=decodeURIComponent(v); return acc;
  },{});
}
function setCookie(res,value,maxAge=60*60*24*180){
  res.setHeader('Set-Cookie',`${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`);
}
function getOrCreateSession(req,res){
  const cookies=parseCookies(req);
  let id=cookies[SESSION_COOKIE];
  if(!id || id.length<20 || id.length>200){id=crypto.randomUUID();setCookie(res,id)}
  return id;
}
function clearSession(res){setCookie(res,'',0)}
function getClientIp(req){
  return String(req.headers['x-forwarded-for']||req.headers['x-real-ip']||'').split(',')[0].trim()||null;
}
function utcDay(){return new Date().toISOString().slice(0,10)}
function hashIp(ip){return ip?hmac(`ip:${utcDay()}`,ip):null}
function hashUa(ua){return ua?hmac('ua',ua):null}
function hashSession(id){return id?hmac('session',id):null}
function validEmail(v){return !v || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)&&v.length<=254)}

module.exports={supabase,hash,hmac,token,email,parseBody,getOrCreateSession,clearSession,getClientIp,hashIp,hashUa,hashSession,validEmail};
