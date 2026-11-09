const fs=require('fs'),path=require('path');
const dist=path.join(__dirname,'dist');
let html=fs.readFileSync(path.join(dist,'index.html'),'utf8').replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,file)=>{
  let css=fs.readFileSync(path.join(dist,file),'utf8');
  css=css.replace(/url\(["']?(assets\/[^"')]+)["']?\)/g,(_,asset)=>'url("data:image/png;base64,'+fs.readFileSync(path.join(dist,asset)).toString('base64')+'")');
  return '<style'+(file==='flow.css'?' data-entry-style="true"':'')+'>'+css+'</style>';
});
const scriptFiles=[...html.matchAll(/<script defer src="([^"]+)"><\/script>/g)].map(match=>match[1]);
html=html.replace(/\s*<script defer src="[^"]+"><\/script>/g,'');
const scripts=scriptFiles.map(file=>'<script>\n'+fs.readFileSync(path.join(dist,file),'utf8').replace(/<\/script/gi,'<\\/script')+'\n</script>').join('\n');
html=html.replace('</body>',()=>scripts+'\n</body>');
// The self-contained campaign keeps a working local link to the archived build.
html=html.replace('href="classic.html"','href="金文泰-上一版留档.html"');
const out=path.join(__dirname,'金文泰-AI整合版.html');fs.writeFileSync(out,html);console.log(out);
