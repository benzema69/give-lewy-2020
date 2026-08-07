const fs=require('node:fs');
const path=require('node:path');

const SOURCE_COMMIT=process.env.SOURCE_COMMIT||process.env.VERCEL_GIT_COMMIT_SHA||'main';
const STATIC_FILES=[
  'index.html','styles.css','script.js','season.css','season.js','launch.css','launch.js',
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

(async()=>{
  fs.mkdirSync('dist',{recursive:true});
  for(const file of STATIC_FILES){
    await materialize(file);
    console.log('built',file);
  }
})().catch(error=>{
  console.error(error);
  process.exit(1);
});
