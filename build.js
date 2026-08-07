const fs=require('node:fs');
const path=require('node:path');

const SOURCE_COMMIT=process.env.SOURCE_COMMIT||process.env.VERCEL_GIT_COMMIT_SHA||'main';
const STATIC_FILES=[
  'index.html','styles.css','script.js','season.css','season.js','launch.css','launch.js','viral.css','viral.js','attribution.js',
  'admin.html','admin.js','press.html','privacy.html','thanks.html','robots.txt','sitemap.xml'
];

async function materialize(file){
  const local=path.resolve(file);
  if(fs.existsSync(local)) return fs.copyFileSync(local,path.join('dist',file));
  const url=`https://raw.githubusercontent.com/benzema69/give-lewy-2020/${SOURCE_COMMIT}/${file}`;
  const response=await fetch(url);
  if(!response.ok) throw new Error(`${file}: ${response.status}`);
  fs.writeFileSync(path.join('dist',file),Buffer.from(await response.arrayBuffer()));
}

function injectSocialMeta(){
  const file=path.join('dist','index.html');
  let html=fs.readFileSync(file,'utf8');
  if(html.includes('property="og:image"'))return;
  const marker='  <meta property="og:type" content="website" />';
  const image='https://give-lewy-2020.vercel.app/api/og?v=milestones-1';
  const social=`${marker}\n  <meta property="og:site_name" content="Give Lewy 2020" />\n  <meta property="og:url" content="https://give-lewy-2020.vercel.app/" />\n  <meta property="og:locale" content="fr_FR" />\n  <meta property="og:image" content="${image}" />\n  <meta property="og:image:secure_url" content="${image}" />\n  <meta property="og:image:type" content="image/png" />\n  <meta property="og:image:width" content="1200" />\n  <meta property="og:image:height" content="630" />\n  <meta property="og:image:alt" content="Give Lewy 2020 — campaign milestone card" />\n  <meta name="twitter:card" content="summary_large_image" />\n  <meta name="twitter:title" content="Give Lewy 2020 — Sign the petition" />\n  <meta name="twitter:description" content="55 goals. Treble. No Ballon d’Or. Help the campaign reach its next signature milestone." />\n  <meta name="twitter:image" content="${image}" />\n  <meta name="twitter:image:alt" content="Give Lewy 2020 — campaign milestone card" />`;
  if(!html.includes(marker))throw new Error('Open Graph marker missing from index.html');
  html=html.replace(marker,social);
  fs.writeFileSync(file,html);
}

function injectGrowthAssets(){
  const file=path.join('dist','index.html');
  let html=fs.readFileSync(file,'utf8');
  if(!html.includes('href="/viral.css"'))html=html.replace('</head>','  <link rel="stylesheet" href="/viral.css" />\n</head>');
  if(!html.includes('src="/viral.js"'))html=html.replace('</body>','  <script src="/viral.js" defer></script>\n</body>');
  if(!html.includes('src="/attribution.js"'))html=html.replace('</body>','  <script src="/attribution.js" defer></script>\n</body>');
  fs.writeFileSync(file,html);
}

(async()=>{
  fs.mkdirSync('dist',{recursive:true});
  for(const file of STATIC_FILES){
    await materialize(file);
    console.log('built',file);
  }
  injectSocialMeta();
  injectGrowthAssets();
  console.log('injected social metadata, milestone sharing and channel attribution assets');
})().catch(error=>{
  console.error(error);
  process.exit(1);
});