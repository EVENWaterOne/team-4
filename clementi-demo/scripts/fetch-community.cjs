'use strict';
// Reproduce the game’s small, static population overview from the official ZIP.
// Run: node scripts/fetch-community.cjs [--zip C:\path\to\download.zip]
// No network or CSV parsing is required while the game itself runs.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),https=require('node:https');
const {execFileSync}=require('node:child_process');
const url='https://www.singstat.gov.sg/files/593998d7-7249-4081-bbf0-567bf0a82df5.zip';
const dest=path.join(os.tmpdir(),'clementi-age-2026.zip');
function download(target){return new Promise((resolve,reject)=>{https.get(url,res=>{if(res.statusCode!==200){res.resume();reject(Error('Official download returned '+res.statusCode));return;}const file=fs.createWriteStream(target);res.pipe(file);file.on('finish',()=>file.close(resolve));file.on('error',reject);}).on('error',reject);});}
(async()=>{
  const zipIndex=process.argv.indexOf('--zip');const zip=zipIndex>=0?path.resolve(process.argv[zipIndex+1]):dest;
  if(zipIndex<0)await download(zip);
  const literal="'"+zip.replace(/'/g,"''")+"'";
  const ps=`$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem
$a=[System.IO.Compression.ZipFile]::OpenRead(${literal})
try {$r=[System.IO.StreamReader]::new($a.GetEntry('respopagesex2026.csv').Open()); try {$rows=ConvertFrom-Csv ($r.ReadToEnd())} finally {$r.Dispose()}
$selected=@($rows | Where-Object {$_.PA -eq 'Clementi' -and $_.Time -eq '2026'})
$seen=@{};foreach($row in $selected){$key=$row.SZ+'|'+$row.Age+'|'+$row.Sex;if($seen.ContainsKey($key)){throw 'Duplicate population cell'};$seen[$key]=$true}
$bands=@(@(0,14),@(15,24),@(25,44),@(45,64),@(65,200));$counts=@();foreach($b in $bands){$counts+=($selected|Where-Object {[int]($_.Age -replace '\\D','') -ge $b[0] -and [int]($_.Age -replace '\\D','') -le $b[1]}|Measure-Object Pop -Sum).Sum}
@{year=2026;rows=$selected.Count;subzones=@($selected.SZ|Select-Object -Unique).Count;total=($selected|Measure-Object Pop -Sum).Sum;counts=$counts}|ConvertTo-Json -Compress
}finally{$a.Dispose()}`;
  const result=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{encoding:'utf8'}).trim());
  if(result.rows!==1638||result.subzones!==9||result.counts.reduce((a,b)=>a+b,0)!==result.total)throw Error('Official source structure changed; review aggregation before publishing.');
  const communityFile=path.join(__dirname,'..','dist','community.js');
  let source=fs.readFileSync(communityFile,'utf8');
  source=source.replace(/total:\d+,sourceRows:\d+,subzones:\d+/,`total:${result.total},sourceRows:${result.rows},subzones:${result.subzones}`);
  let index=0;source=source.replace(/count:\d+,percent:[\d.]+/g,()=>{const count=result.counts[index++];return`count:${count},percent:${Math.round(count/result.total*1000)/10}`;});
  if(index!==5)throw Error('Expected five age groups');fs.writeFileSync(communityFile,source,'utf8');
  console.log(JSON.stringify({source:url,geography:'Clementi Planning Area (Master Plan 2025)',...result,percentages:result.counts.map(n=>Math.round(n/result.total*1000)/10),note:'Rounded-source-cell aggregate; citizens and permanent residents only.'},null,2));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
