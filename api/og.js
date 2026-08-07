const sharp=require('sharp');

const WIDTH=1200;
const HEIGHT=630;
const PHOTO='https://upload.wikimedia.org/wikipedia/commons/0/03/Robert_Lewandowski%2C_FC_Bayern_M%C3%BCnchen_%28by_Sven_Mandel%2C_2019-05-27%29_01.jpg';
let cachedPng=null;

function overlay(){
  return Buffer.from(`
  <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#080808" stop-opacity="0.98"/>
        <stop offset="0.56" stop-color="#080808" stop-opacity="0.82"/>
        <stop offset="1" stop-color="#080808" stop-opacity="0.18"/>
      </linearGradient>
      <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.55" stop-color="#090909" stop-opacity="0"/>
        <stop offset="1" stop-color="#090909" stop-opacity="0.9"/>
      </linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f5dc8a"/>
        <stop offset="1" stop-color="#b99035"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#shade)"/>
    <rect width="1200" height="630" fill="url(#bottom)"/>
    <rect x="0" y="0" width="14" height="630" fill="url(#gold)"/>
    <circle cx="1110" cy="80" r="190" fill="none" stroke="#d5ad50" stroke-opacity="0.18" stroke-width="2"/>
    <circle cx="1110" cy="80" r="145" fill="none" stroke="#d5ad50" stroke-opacity="0.10" stroke-width="2"/>

    <text x="72" y="82" fill="#f7f2e8" font-size="31" font-weight="900" font-family="Arial, Helvetica, sans-serif" letter-spacing="-1">GIVE <tspan fill="#f5dc8a">LEWY</tspan> 2020</text>
    <text x="72" y="128" fill="#d5ad50" font-size="18" font-weight="700" font-family="Arial, Helvetica, sans-serif" letter-spacing="3">GLOBAL PETITION</text>

    <text x="68" y="252" fill="#ffffff" font-size="76" font-weight="900" font-family="Arial, Helvetica, sans-serif" letter-spacing="-4">55 GOALS.</text>
    <text x="68" y="334" fill="#ffffff" font-size="76" font-weight="900" font-family="Arial, Helvetica, sans-serif" letter-spacing="-4">TREBLE.</text>
    <text x="68" y="416" fill="#f5dc8a" font-size="76" font-weight="900" font-family="Arial, Helvetica, sans-serif" letter-spacing="-4">NO BALLON D’OR.</text>

    <rect x="72" y="466" width="260" height="56" rx="28" fill="url(#gold)"/>
    <text x="202" y="502" text-anchor="middle" fill="#171104" font-size="19" font-weight="900" font-family="Arial, Helvetica, sans-serif" letter-spacing="1">SIGN THE PETITION</text>

    <text x="72" y="574" fill="#f7f2e8" font-size="22" font-weight="700" font-family="Arial, Helvetica, sans-serif">Robert Lewandowski · 2019/20</text>
    <text x="1128" y="596" text-anchor="end" fill="#c4beb3" font-size="12" font-family="Arial, Helvetica, sans-serif">Photo: Sven Mandel · CC BY-SA 4.0</text>
  </svg>`);
}

async function render(){
  let image;
  try{
    const response=await fetch(PHOTO,{headers:{'user-agent':'GiveLewy2020/1.0'}});
    if(!response.ok)throw new Error(`photo ${response.status}`);
    const photo=Buffer.from(await response.arrayBuffer());
    image=sharp(photo)
      .resize(WIDTH,HEIGHT,{fit:'cover',position:'right'})
      .modulate({brightness:0.62,saturation:0.78});
  }catch(error){
    console.error('og photo fallback',error);
    image=sharp({create:{width:WIDTH,height:HEIGHT,channels:4,background:{r:14,g:14,b:14,alpha:1}}});
  }
  return image.composite([{input:overlay(),top:0,left:0}]).png({compressionLevel:9}).toBuffer();
}

module.exports=async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).end();
  try{
    if(!cachedPng)cachedPng=await render();
    res.setHeader('Content-Type','image/png');
    res.setHeader('Cache-Control','public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Length',String(cachedPng.length));
    if(req.method==='HEAD')return res.status(200).end();
    return res.status(200).send(cachedPng);
  }catch(error){
    console.error('og render failed',error);
    return res.status(500).json({error:'OG image unavailable'});
  }
};
