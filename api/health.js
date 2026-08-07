const EDGE_URL='https://tnbxlcumokajylirydvu.supabase.co/functions/v1/petition-api';

module.exports=async(req,res)=>{
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'Method not allowed'});
  const started=Date.now();
  try{
    const [configRes,countRes]=await Promise.all([
      fetch(`${EDGE_URL}?action=config`,{headers:{'x-site-origin':'https://give-lewy-2020.vercel.app'},cache:'no-store'}),
      fetch(`${EDGE_URL}?action=count`,{headers:{'x-site-origin':'https://give-lewy-2020.vercel.app'},cache:'no-store'})
    ]);
    if(!configRes.ok||!countRes.ok) throw new Error(`upstream ${configRes.status}/${countRes.status}`);
    const [config,count]=await Promise.all([configRes.json(),countRes.json()]);
    res.setHeader('Cache-Control','no-store, max-age=0');
    return res.status(200).json({
      ok:true,
      version:config.version||null,
      database:'ok',
      count:Number(count.count||0),
      emailConfigured:!!config.emailConfigured,
      turnstileConfigured:!!config.turnstileConfigured,
      latencyMs:Date.now()-started,
      checkedAt:new Date().toISOString()
    });
  }catch(e){
    console.error('healthcheck failed',e);
    res.setHeader('Cache-Control','no-store, max-age=0');
    return res.status(503).json({ok:false,database:'unknown',checkedAt:new Date().toISOString()});
  }
};
