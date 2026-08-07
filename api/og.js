const sharp=require('sharp');

const WIDTH=1200;
const HEIGHT=630;
const PHOTO='https://upload.wikimedia.org/wikipedia/commons/0/03/Robert_Lewandowski%2C_FC_Bayern_M%C3%BCnchen_%28by_Sven_Mandel%2C_2019-05-27%29_01.jpg';
const MILESTONES=[10000,100000,1000000,10000000,100000000];
let cache={key:null,expires:0,png:null};

function compact(value){
  if(value>=1000000)return `${value/1000000}M`;
  if(value>=1000)return `${value/1000}K`;
  return String(value);
}

function campaignState(count){
  const reached=[...MILESTONES].reverse().find(value=>count>=value)||0;
  const next=MILESTONES.find(value=>count<value)||null;
  return {count,reached,next};
}

function copyFor(state){
  if(state.count>=100000000)return ['100M SIGNATURES.','HISTORY.','MADE.'];
  if(state.reached>=10000)return [`${compact(state.reached)} SIGNATURES.`,'THE MOVEMENT','IS GROWING.'];
  return ['55 GOALS.','TREBLE.','NO BALLON D’OR.'];
}

function overlay(state){
  const [line1,line2,line3]=copyFor(state);
  const counted=state.count.toLocaleString('en-US');
  const next=state.next?`NEXT STOP: ${compact(state.next)}`:'GLOBAL GOAL REACHED';
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

    <text x="68" y="252" fill="#ffffff" font-size="76" font-weight="900" font-family="Arial, Helvetica, sans-serif" letter-spacing="-4">${line1}</text>
    <text x="68" y="334" fill="#ffffff" font-size="76" font-weight="900" font-family="Arial, Helvetica, sans-serif" letter-spacing="-4">${line2}</text>
    <text x="68" y="416" fill="#f5dc8a" font-size="76" font-weight="900" font-family="Arial, Helvetica, sans-serif" letter-spacing="-4">${line3}</text>

    <rect x="72" y="466" width="260" height="56" rx="28" fill="url(#gold)"/>
    <text x="202" y="502" text-anchor="middle" fill="#171104" font-size="19" font-weight="900" font-family="Arial, Helvetica, sans-serif" letter-spacing="1">SIGN THE PETITION</text>

    <rect x="720" y="454" width="408" height="92" rx="20" fill="#0a0a0a" fill-opacity="0.76" stroke="#d5ad50" stroke-opacity="0.38"/>
    <text x="748" y="491" fill="#f7f2e8" font-size="24" font-weight="900" font-family="Arial, Helvetica, sans-serif">${counted} COUNTED</text>
    <text x="748" y="521" fill="#f5dc8a" font-size="16" font-weight="800" font-family="Arial, Helvetica, sans-serif" letter-spacing="1.5">${next}</text>

    <text x="72" y="574" fill="#f7f2e8" font-size="22" font-weight="700" font-family="Arial, Helvetica, sans-serif">Robert Lewandowski · 2019/20</text>
    <text x="1128" y="596" text-anchor="end" fill="#c4beb3" font-size="12" font-family="Arial, Helvetica, sans-serif">Photo: Sven Mandel · CC BY-SA 4.0</text>
  </svg>`);
}

async function fetchCount(req){
  try{
    const host=req.headers['x-forwarded-host']||req.headers.host;
    if(!host)return 0;
    const proto=req.headers['x-forwarded-proto']||'https';
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),2500);
    const response=await fetch(`${proto}://${host}/api/count?fresh=1&source=og`,{
      headers:{'user-agent':'GiveLewy2020-OG/2.0'},
      cache:'no-store',
      signal:controller.signal
    });
    clearTimeout(timer);
    if(!response.ok)throw new Error(`count ${response.status}`);
    const data=await response.json();
    const count=Number(data.count||0);
    return Number.isFinite(count)&&count>=0?Math.floor(count):0;
  }catch(error){
    console.error('og count fallback',error);
    return 0;
  }
}

async function render(state){
  let image;
  try{
    const response=await fetch(PHOTO,{headers:{'user-agent':'GiveLewy2020/2.0'}});
    if(!response.ok)throw new Error(`photo ${response.status}`);
    const photo=Buffer.from(await response.arrayBuffer());
    image=sharp(photo)
      .resize(WIDTH,HEIGHT,{fit:'cover',position:'right'})
      .modulate({brightness:0.62,saturation:0.78});
  }catch(error){
    console.error('og photo fallback',error);
    image=sharp({create:{width:WIDTH,height:HEIGHT,channels:4,background:{r:14,g:14,b:14,alpha:1}}});
  }
  return image.composite([{input:overlay(state),top:0,left:0}]).png({compressionLevel:9}).toBuffer();
}

module.exports=async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).end();
  try{
    const count=await fetchCount(req);
    const state=campaignState(count);
    const key=`${state.count}:${state.reached}:${state.next||'done'}`;
    if(!cache.png||cache.key!==key||Date.now()>=cache.expires){
      cache={key,expires:Date.now()+300000,png:await render(state)};
    }
    res.setHeader('Content-Type','image/png');
    res.setHeader('Cache-Control','public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
    res.setHeader('Content-Length',String(cache.png.length));
    if(req.method==='HEAD')return res.status(200).end();
    return res.status(200).send(cache.png);
  }catch(error){
    console.error('og render failed',error);
    return res.status(500).json({error:'OG image unavailable'});
  }
};