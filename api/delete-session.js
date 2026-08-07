const {supabase,hashSession,clearSession}=require('./_util');
function cookies(req){return String(req.headers.cookie||'').split(';').reduce((a,p)=>{const i=p.indexOf('=');if(i>0)a[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1).trim());return a},{})}
module.exports=async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    const id=cookies(req).give_lewy_session;
    if(!id){clearSession(res);return res.status(200).json({ok:true,deleted:0})}
    const sh=hashSession(id);
    const r=await supabase(`signatures?session_hash=eq.${encodeURIComponent(sh)}`,{method:'DELETE',headers:{Prefer:'return=representation'}});
    if(!r.ok)throw new Error('delete');
    const rows=await r.json().catch(()=>[]);
    clearSession(res);
    return res.status(200).json({ok:true,deleted:Array.isArray(rows)?rows.length:0});
  }catch{return res.status(500).json({error:'Suppression impossible pour le moment.'})}
};
