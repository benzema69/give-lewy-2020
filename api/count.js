const { supabase } = require('./_util');
module.exports=async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  try{
    const r=await supabase('petition_stats?id=eq.global&select=accepted_count,email_verified_count&limit=1');
    if(!r.ok)throw new Error('count');
    const rows=await r.json();
    const row=rows[0]||{};
    res.setHeader('Cache-Control','public, s-maxage=5, stale-while-revalidate=30');
    return res.status(200).json({count:Number(row.accepted_count||0),emailVerified:Number(row.email_verified_count||0)});
  }catch{
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({count:0,emailVerified:0,configured:false});
  }
};
