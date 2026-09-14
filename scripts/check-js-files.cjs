const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.join(__dirname,'..','layer','vibe-os','opt','vibe-os','frontend');
function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p):p.endsWith('.js')?[p]:[]})}
for(const f of walk(root)){const r=cp.spawnSync(process.execPath,['--check',f],{encoding:'utf8'});if(r.status!==0){process.stderr.write(r.stderr);process.exit(r.status||1)}console.log('JavaScript parse: OK',path.relative(root,f));}
