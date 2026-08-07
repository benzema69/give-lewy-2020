const EDGE_URL='https://tnbxlcumokajylirydvu.supabase.co/functions/v1/petition-api';

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
    const headers={
      'content-type':'application/json',
      'x-site-origin':`${proto}://${host}`,
      'x-client-ip':String(req.headers['x-forwarded-for']||req.headers['x-real-ip']||'').split(',')[0].trim(),
      'user-agent':String(req.headers['user-agent']||''),
    };
    if(req.headers.cookie)headers.cookie=String(req.headers.cookie);
    const r=await fetch(`${EDGE_URL}?${qs}`,{method:req.method,headers,body:bodyOf(req),redirect:'manual'});
    for(const h of ['set-cookie','location','cache-control']){
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
