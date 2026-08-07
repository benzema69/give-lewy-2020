const {supabase,hash}=require('./_util');
module.exports=async function handler(req,res){
  const base=(process.env.SITE_URL||`https://${req.headers.host}`).replace(/\/$/,'');const t=String(req.query?.token||'');if(!t)return res.redirect(302,`${base}/?deleted=invalid`);
  try{const h=hash(t);const r=await supabase(`signatures?delete_token_hash=eq.${encodeURIComponent(h)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});if(!r.ok)throw new Error('delete');return res.redirect(302,`${base}/?deleted=1`)}catch{return res.redirect(302,`${base}/?deleted=error`)}
}
