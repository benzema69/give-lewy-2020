const {supabase,hash}=require('./_util');
module.exports=async function handler(req,res){
  const base=(process.env.SITE_URL||`https://${req.headers.host}`).replace(/\/$/,'');
  const t=String(req.query?.token||'');
  if(!t)return res.redirect(302,`${base}/merci?status=invalid`);
  try{
    const h=hash(t);
    const lr=await supabase(`signatures?verify_token_hash=eq.${encodeURIComponent(h)}&select=id,status,risk_score&limit=1`);
    if(!lr.ok)throw new Error('lookup');
    const rows=await lr.json();
    if(!rows.length)return res.redirect(302,`${base}/merci?status=invalid`);
    const row=rows[0];
    const now=new Date().toISOString();
    const patch={email_verified_at:now};
    if(row.status==='pending' && Number(row.risk_score||0)<90){patch.status='accepted';patch.accepted_at=now}
    const ur=await supabase(`signatures?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(patch)});
    if(!ur.ok)throw new Error('update');
    return res.redirect(302,`${base}/merci?status=ok`);
  }catch{return res.redirect(302,`${base}/merci?status=error`)}
};
