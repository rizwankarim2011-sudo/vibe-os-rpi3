const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const API = "/api";

let currentPath = "", historyStack = [], currentFile = null, zIndex = 20, terminalPath = "", terminalHistory = [], historyIndex = -1, taskTimer = null, clockEnabled = true;
const savedWallpaper = localStorage.getItem("vibeWallpaper") || "default";

function toast(message){
  const el=$("#toast"); el.textContent=message; el.classList.add("show");
  clearTimeout(window.__toastTimer); window.__toastTimer=setTimeout(()=>el.classList.remove("show"),2200);
}
function formatSize(bytes){
  if(bytes===null||bytes===undefined)return "—";
  if(bytes<1024)return `${bytes} B`;
  if(bytes<1048576)return `${(bytes/1024).toFixed(1)} KB`;
  if(bytes<1073741824)return `${(bytes/1048576).toFixed(1)} MB`;
  return `${(bytes/1073741824).toFixed(1)} GB`;
}
function formatDate(value){const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleString();}
function displayPath(path){return path?`/${path}`:"/";}
async function apiGet(url){const r=await fetch(url),d=await r.json();if(!r.ok||d.error)throw new Error(d.error||"Request failed.");return d;}
async function apiPost(url,body){const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),d=await r.json();if(!r.ok||d.error)throw new Error(d.error||"Request failed.");return d;}
window.vibeAPI={get:apiGet,post:apiPost};
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function iconFor(item){if(item.type==="folder")return "📁";const ext=item.name.split(".").pop().toLowerCase();if(["html","css","js"].includes(ext))return "🌐";if(["py","json"].includes(ext))return "⚙️";if(["txt","md"].includes(ext))return "📝";return "📄";}

async function loadDirectory(path=currentPath,pushHistory=false){
  try{
    const data=await apiGet(`${API}/files?path=${encodeURIComponent(path)}`);
    if(pushHistory&&path!==currentPath)historyStack.push(currentPath);
    currentPath=data.path; $("#pathBar").textContent=displayPath(currentPath); $("#fileList").innerHTML="";
    data.items.forEach(item=>{
      const row=document.createElement("div");row.className="file-row";row.dataset.path=item.path;
      row.innerHTML=`<span class="file-name ${item.type==="folder"?"folder-name":""}">${iconFor(item)} ${escapeHtml(item.name)}</span><span>${item.type}</span><span class="size">${formatSize(item.size)}</span><span class="modified">${formatDate(item.modified)}</span>`;
      row.addEventListener("dblclick",()=>item.type==="folder"?loadDirectory(item.path,true):openTextFile(item.path));
      row.addEventListener("contextmenu",e=>{e.preventDefault();showFileActions(item);});
      $("#fileList").appendChild(row);
    });
    $("#explorerStatus").textContent=`${data.items.length} item${data.items.length===1?"":"s"} • ${displayPath(currentPath)}`;
    $$(".side-link").forEach(b=>b.classList.toggle("active",b.dataset.nav===currentPath));
  }catch(e){toast(e.message);$("#explorerStatus").textContent=e.message;}
}

async function searchWorkspace(query){
  if(!query.trim()){loadDirectory();return;}
  try{
    const d=await apiGet(`${API}/search?q=${encodeURIComponent(query)}&path=`);
    $("#fileList").innerHTML="";
    d.results.forEach(item=>{
      const row=document.createElement("div");row.className="file-row";
      row.innerHTML=`<span class="file-name">${iconFor(item)} ${escapeHtml(item.path)}</span><span>${item.type}</span><span class="size">${formatSize(item.size)}</span><span class="modified">${formatDate(item.modified)}</span>`;
      row.addEventListener("dblclick",()=>item.type==="folder"?loadDirectory(item.path,true):openTextFile(item.path));
      $("#fileList").appendChild(row);
    });
    $("#explorerStatus").textContent=`${d.results.length} search result${d.results.length===1?"":"s"} for "${query}"`;
  }catch(e){toast(e.message);}
}

function showFileActions(item){
  const action=prompt(`${item.type==="folder"?"Folder":"File"}: ${item.name}\n\nType: rename / delete`,"rename");
  if(!action)return;
  if(action.toLowerCase()==="rename")renameItem(item);
  else if(action.toLowerCase()==="delete")deleteItem(item);
  else toast("Unknown action.");
}
async function renameItem(item){const n=prompt("New name:",item.name);if(!n||n===item.name)return;try{await apiPost(`${API}/rename`,{path:item.path,newName:n});toast("Renamed successfully.");loadDirectory();}catch(e){toast(e.message);}}
async function deleteItem(item){if(!confirm(`Delete "${item.name}"?${item.type==="folder"?"\n\nEverything inside will also be deleted.":""}`))return;try{await apiPost(`${API}/delete`,{path:item.path});toast("Deleted successfully.");loadDirectory();}catch(e){toast(e.message);}}
async function createFolder(){const n=prompt("Folder name:");if(!n)return;try{await apiPost(`${API}/folder`,{parent:currentPath,name:n});toast("Folder created.");loadDirectory();}catch(e){toast(e.message);}}
async function createFile(){const n=prompt("File name:","New Text File.txt");if(!n)return;try{await apiPost(`${API}/file`,{parent:currentPath,name:n,content:""});toast("File created.");loadDirectory();}catch(e){toast(e.message);}}

async function openTextFile(path){try{const d=await apiGet(`${API}/file?path=${encodeURIComponent(path)}`);currentFile=d.path;$("#notepadFile").textContent=displayPath(currentFile);$("#notepadArea").value=d.content;openWindow("notepad");}catch(e){toast(e.message);}}
async function saveNotepad(){if(!currentFile)return saveAsNotepad();try{await apiPost(`${API}/write`,{path:currentFile,content:$("#notepadArea").value});toast("File saved to USB workspace.");loadDirectory();}catch(e){toast(e.message);}}
async function saveAsNotepad(){const n=prompt("Save as:",currentFile?currentFile.split("/").pop():"Untitled.txt");if(!n)return;try{const d=await apiPost(`${API}/file`,{parent:currentPath,name:n,content:$("#notepadArea").value});currentFile=d.item.path;$("#notepadFile").textContent=displayPath(currentFile);toast("Saved as a real file.");loadDirectory();}catch(e){toast(e.message);}}
function newNotepad(){currentFile=null;$("#notepadFile").textContent="Untitled";$("#notepadArea").value="";openWindow("notepad");}

function openWindow(app){
  const w=$(`#window-${app}`);
  if(!w)return;
  w.classList.remove("hidden");
  w.style.zIndex=++zIndex;
  updateTaskbar();
  if(app==="explorer")loadDirectory(currentPath);
  if(app==="system")loadSystemInfo();
  if(app==="taskmanager")loadTaskManager();
  if(app==="hub")loadHub();
  if(app==="codestudio")setupCodeStudio();
  if(app==="calendar")setupCalendar();
  if(app==="sketch")setupSketchpad();
  if(app==="clipboard")setupClipboardVault();
  if(app==="devtools")setupDevTools();
}
function closeWindow(w){w.classList.add("hidden");updateTaskbar();}
function minimizeWindow(w){w.classList.add("hidden");updateTaskbar();}
function updateTaskbar(){const c=$("#taskbarApps");c.innerHTML="";$$(".window").forEach(w=>{if(w.classList.contains("hidden"))return;const b=document.createElement("button");b.className="taskbar-app active";b.textContent=w.querySelector(".window-title").textContent.trim();b.onclick=()=>{w.classList.remove("hidden");w.style.zIndex=++zIndex;};c.appendChild(b);});}

function enableDragging(w){
  const bar=w.querySelector(".window-titlebar");let dragging=false,ox=0,oy=0;
  bar.addEventListener("pointerdown",e=>{if(e.target.closest(".window-controls")||w.classList.contains("maximized"))return;dragging=true;w.style.zIndex=++zIndex;const r=w.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top;bar.setPointerCapture(e.pointerId);});
  bar.addEventListener("pointermove",e=>{if(!dragging)return;w.style.left=`${Math.max(0,e.clientX-ox)}px`;w.style.top=`${Math.max(0,e.clientY-oy)}px`;});
  bar.addEventListener("pointerup",()=>dragging=false);
}
function setupWindows(){$$(".window").forEach(w=>{enableDragging(w);w.addEventListener("pointerdown",()=>w.style.zIndex=++zIndex);w.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();const a=b.dataset.action;if(a==="close")closeWindow(w);if(a==="minimize")minimizeWindow(w);if(a==="maximize")w.classList.toggle("maximized");}));});}

async function checkBackend(){
  try{const d=await apiGet(`${API}/status`);$("#backendDot").classList.add("online");$("#backendDot").classList.remove("offline");$("#backendText").textContent="Backend online";$("#settingsBackend").textContent="Online";}catch{$("#backendText").textContent="Backend offline";$("#settingsBackend").textContent="Offline";}
}
function updateClock(){const n=new Date();$("#clock").textContent=n.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});$("#date").textContent=n.toLocaleDateString([],{day:"2-digit",month:"short"});}

async function loadSystemInfo(){
  try{
    const d=await apiGet(`${API}/system`);
    const stats=[
      [d.os+" "+d.os_release,"Operating system"],[d.machine,"Architecture"],[d.python,"Python runtime"],[d.cpu_count+" logical cores","CPU availability"],[d.hostname,"Computer name"],[d.processor,"Processor"]
    ];
    $("#systemStats").innerHTML=stats.map(x=>`<div class="stat-card"><b>${escapeHtml(x[0])}</b><span>${escapeHtml(x[1])}</span></div>`).join("");
    const used=d.workspace_used/Math.max(d.workspace_total,1)*100;
    $("#storageFill").style.width=`${Math.min(100,used)}%`;
    $("#storageText").textContent=`${formatSize(d.workspace_used)} used • ${formatSize(d.workspace_free)} free`;
  }catch(e){$("#systemStats").innerHTML=`<div class="stat-card"><b>Unavailable</b><span>${escapeHtml(e.message)}</span></div>`;}
}

async function loadTaskManager(){
  try{
    const d=await apiGet(`${API}/system`);
    const cpu=Number(d.cpu_percent)||0, mem=Number(d.memory_percent)||0;
    $("#tmCpuText").textContent=`${cpu.toFixed(0)}%`;$("#tmCpuFill").style.width=`${Math.min(100,cpu)}%`;
    $("#tmMemText").textContent=`${mem.toFixed(0)}%`;$("#tmMemFill").style.width=`${Math.min(100,mem)}%`;
    $("#tmProcesses").textContent=d.process_count??"—";$("#tmUptime").textContent=formatUptime(d.uptime_seconds);
    $("#tmProcessor").textContent=d.processor||"Unknown";$("#tmPython").textContent=d.python||"Unknown";$("#tmBattery").textContent=d.battery_percent==null?"Not detected":`${d.battery_percent}%${d.battery_charging?" • Charging":""}`;$("#tmFree").textContent=formatSize(d.workspace_free);
    $("#tmUpdated").textContent=`Updated ${new Date().toLocaleTimeString()}`;
  }catch(e){$("#tmUpdated").textContent=`Telemetry unavailable: ${e.message}`;}
}
function formatUptime(sec){sec=Number(sec)||0;const d=Math.floor(sec/86400),h=Math.floor(sec%86400/3600),m=Math.floor(sec%3600/60);return d?`${d}d ${h}h`:h?`${h}h ${m}m`:`${m}m`;}
function setupTaskManager(){
  $("#taskRefreshBtn").onclick=loadTaskManager;
  $("#taskAutoBtn").onclick=e=>{const b=e.currentTarget;const on=b.classList.toggle("active");b.textContent=`Auto refresh: ${on?"ON":"OFF"}`;if(on){loadTaskManager();taskTimer=setInterval(loadTaskManager,2500);}else{clearInterval(taskTimer);taskTimer=null;}};
}

async function loadHub(){
  updateHubClock();
  try{const d=await apiGet(`${API}/files?path=`);$("#hubFiles").textContent=d.items.length;$("#hubBackend").textContent="Online";}catch{$("#hubFiles").textContent="—";$("#hubBackend").textContent="Offline";}
}
function updateHubClock(){const n=new Date();$("#hubTime").textContent=n.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});$("#hubDate").textContent=n.toLocaleDateString([],{weekday:"long",day:"2-digit",month:"short"});}
function applyWallpaper(name, announce=true){document.body.dataset.wallpaper=name;localStorage.setItem("vibeWallpaper",name);$$('.quick-choice').forEach(x=>x.classList.toggle('active',x.dataset.wall===name));if(announce){const b=$(`.quick-choice[data-wall="${name}"]`);toast(`Wallpaper: ${b?b.textContent.trim():name}`);}}

function setupQuickSettings(){
  $("#quickBtn").onclick=e=>{e.stopPropagation();$("#quickPanel").classList.toggle("hidden");$("#notificationPanel").classList.add("hidden");};
  $$(".quick-choice").forEach(b=>b.onclick=()=>applyWallpaper(b.dataset.wall));
  $("#clockToggle").onclick=e=>{clockEnabled=!clockEnabled;e.currentTarget.textContent=clockEnabled?"ON":"OFF";e.currentTarget.classList.toggle("active",clockEnabled);if(!clockEnabled){$("#clock").textContent="--:--";$("#date").textContent="---";}else updateClock();};
  $("#glowToggle").onclick=e=>{const on=e.currentTarget.classList.toggle("active");e.currentTarget.textContent=on?"ON":"OFF";document.body.classList.toggle("reduce-glow",on);localStorage.setItem("vibeReduceGlow",on);};
  $("#focusToggle").onclick=e=>{const on=e.currentTarget.classList.toggle("active");e.currentTarget.textContent=on?"ON":"OFF";document.body.classList.toggle("focus-mode",on);localStorage.setItem("vibeFocus",on);toast(on?"Focus mode enabled":"Focus mode disabled");};
  document.addEventListener("click",e=>{if(!e.target.closest("#quickPanel")&&!e.target.closest("#quickBtn"))$("#quickPanel").classList.add("hidden");});
}

function typeTerminalText(text, done){
  const out=$("#terminalOutput");
  const fragment=document.createElement("span");
  out.appendChild(fragment);
  let i=0;
  const step=()=>{
    if(i>=text.length){if(done)done();return;}
    fragment.textContent+=text[i++];
    out.scrollTop=out.scrollHeight;
    setTimeout(step, Math.max(4, Math.min(22, 1200/Math.max(text.length,1))));
  };
  step();
}

async function runTerminal(){
  const input=$("#terminalCommand"),cmd=input.value.trim();if(!cmd)return;
  input.value="";
  const out=$("#terminalOutput");
  out.innerHTML+=`\n<span class="terminal-command">› ${escapeHtml(cmd)}</span>\n`;
  try{
    const d=await apiPost(`${API}/terminal`,{command:cmd,path:terminalPath});
    if(d.clear){out.innerHTML="";return;}
    if(d.path!==undefined)terminalPath=d.path;
    typeTerminalText(d.output+"\n");
  }catch(e){typeTerminalText(`ERROR: ${e.message}\n`);}
}
function setupStartMenu(){
  $("#startBtn").addEventListener("click",()=>$("#startMenu").classList.toggle("hidden"));
  $$(".start-app").forEach(b=>b.addEventListener("click",()=>{openWindow(b.dataset.open);$("#startMenu").classList.add("hidden");}));
  $("#startSearch").addEventListener("input",e=>{const q=e.target.value.toLowerCase();$$(".start-app").forEach(b=>b.style.display=b.textContent.toLowerCase().includes(q)?"flex":"none");});
  document.addEventListener("click",e=>{if(!e.target.closest("#startMenu")&&!e.target.closest("#startBtn"))$("#startMenu").classList.add("hidden");});
}
function setupExplorer(){
  $("#backBtn").onclick=()=>{if(historyStack.length)loadDirectory(historyStack.pop());};
  $("#upBtn").onclick=()=>{if(currentPath){const p=currentPath.split("/");p.pop();loadDirectory(p.join("/"),true);}};
  $("#refreshBtn").onclick=()=>loadDirectory();
  $("#newFolderBtn").onclick=createFolder;$("#newFileBtn").onclick=createFile;
  $("#explorerSearch").addEventListener("keydown",e=>{if(e.key==="Enter")searchWorkspace(e.target.value);});
  $$(".side-link").forEach(b=>b.onclick=()=>{historyStack.push(currentPath);loadDirectory(b.dataset.nav);});
}
function setupNotepad(){$("#openTextBtn").onclick=()=>{const p=prompt("Workspace file path, e.g. frontend/OS.html");if(p)openTextFile(p);};$("#saveTextBtn").onclick=saveNotepad;$("#saveAsBtn").onclick=saveAsNotepad;$("#newTextBtn").onclick=newNotepad;}
function setupCalculator(){let expr="";$$("#window-calculator [data-calc]").forEach(b=>b.onclick=()=>{const k=b.dataset.calc;if(k==="C")expr="";else if(k==="⌫")expr=expr.slice(0,-1);else if(k==="="){try{if(!/^[0-9+\-*/%.() ]+$/.test(expr))throw 0;expr=String(Function(`"use strict";return (${expr})`)());}catch{expr="Error";}}else{if(expr==="Error")expr="";expr+=k;}$("#calcDisplay").value=expr;});}
function setupTerminal(){$("#terminalCommand").addEventListener("keydown",e=>{
  if(e.key==="Enter"){const v=e.currentTarget.value.trim();if(v){terminalHistory.unshift(v);terminalHistory=terminalHistory.slice(0,40);historyIndex=-1;}runTerminal();}
  if(e.key==="ArrowUp"){e.preventDefault();if(terminalHistory.length){historyIndex=Math.min(historyIndex+1,terminalHistory.length-1);e.currentTarget.value=terminalHistory[historyIndex];}}
  if(e.key==="ArrowDown"){e.preventDefault();if(historyIndex>0){historyIndex--;e.currentTarget.value=terminalHistory[historyIndex];}else{historyIndex=-1;e.currentTarget.value="";}}
});}

const notifications=[];
function notify(title,message){
  notifications.unshift({title,message,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})});
  renderNotifications();
}
function renderNotifications(){
  const list=$("#notificationList");
  if(!notifications.length){list.innerHTML='<div class="notification-empty">No new notifications.</div>';return;}
  list.innerHTML=notifications.map(n=>`<div class="notification-item"><b>${escapeHtml(n.title)} <span class="muted">${escapeHtml(n.time)}</span></b>${escapeHtml(n.message)}</div>`).join("");
}
function setupHub(){
  $$("[data-hub-open]").forEach(b=>b.onclick=()=>openWindow(b.dataset.hubOpen));
}

function setupNotifications(){
  $("#notifyBtn").onclick=e=>{e.stopPropagation();$("#notificationPanel").classList.toggle("hidden");};
  $("#clearNotifications").onclick=()=>{notifications.length=0;renderNotifications();};
}

window.addEventListener("keydown",e=>{
  if(e.ctrlKey&&e.key.toLowerCase()==="k"){e.preventDefault();$("#startMenu").classList.remove("hidden");$("#startSearch").focus();}
  if(e.ctrlKey&&e.key.toLowerCase()==="e"){e.preventDefault();openWindow("explorer");}
  if(e.ctrlKey&&e.key.toLowerCase()==="n"){e.preventDefault();newNotepad();}
  if(e.ctrlKey&&e.key.toLowerCase()==="`"){e.preventDefault();openWindow("terminal");$("#terminalCommand").focus();}
});

window.addEventListener("load",()=>{
  setTimeout(()=>{
    $("#boot").classList.add("hidden");$("#desktop").classList.remove("hidden");
    setupWindows();setupStartMenu();setupExplorer();setupNotepad();setupCalculator();setupTerminal();setupNotifications();setupTaskManager();setupQuickSettings();setupHub();
    applyWallpaper(savedWallpaper,false);
    const rg=localStorage.getItem("vibeReduceGlow")==="true";document.body.classList.toggle("reduce-glow",rg);$("#glowToggle").textContent=rg?"ON":"OFF";$("#glowToggle").classList.toggle("active",rg);
    const fm=localStorage.getItem("vibeFocus")==="true";document.body.classList.toggle("focus-mode",fm);$("#focusToggle").textContent=fm?"ON":"OFF";$("#focusToggle").classList.toggle("active",fm);
    loadDirectory("");checkBackend();updateClock();setInterval(()=>{if(clockEnabled)updateClock();updateHubClock();},1000);notify("System ready","Vibe-coder's OS 100% milestone is online.");toast("Vibe-coder's OS • 100% milestone ready");
  },1700);
});
$$(".desktop-icon").forEach(b=>b.addEventListener("click",()=>openWindow(b.dataset.open)));


/* ===== 100% FINAL FEATURE SUITE — functional ===== */
(function(){
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const safeEsc=v=>escapeHtml(v);

  function setupCodeStudio(){
    const path=q('#codePath'), area=q('#codeArea'), status=q('#codeStatus');
    if(!path||path.dataset.ready)return;
    path.dataset.ready='1';
    q('#codeOpen').onclick=async()=>{try{const d=await apiGet(`${API}/file?path=${encodeURIComponent(path.value.trim())}`);area.value=d.content||'';status.textContent='Opened '+d.path;notify('Code Studio','Opened '+d.path)}catch(e){status.textContent='Error: '+e.message;}};
    q('#codeSave').onclick=async()=>{try{await apiPost(`${API}/write`,{path:path.value.trim(),content:area.value});status.textContent='Saved '+path.value;notify('Code Studio','Saved '+path.value); }catch(e){status.textContent='Error: '+e.message;}};
    q('#codeNew').onclick=()=>{path.value='new-file.txt';area.value='';status.textContent='New document';};
  }

  let calDate=new Date(), selectedDay=new Date();
  const dayKey=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;};
  const readEvents=()=>{try{return JSON.parse(localStorage.getItem('vibeCalendar')||'{}')}catch{return {}}};
  function renderCalendar(){
    const grid=q('#calendarGrid'),title=q('#calTitle'); if(!grid||!title)return;
    const y=calDate.getFullYear(),m=calDate.getMonth(),first=new Date(y,m,1).getDay(),events=readEvents(),today=dayKey(new Date()),selected=dayKey(selectedDay);
    title.textContent=calDate.toLocaleString([], {month:'long',year:'numeric'});
    let html='';
    for(let i=0;i<42;i++){const d=new Date(y,m,i-first+1),k=dayKey(d),outside=d.getMonth()!==m;const ev=(events[k]||[]).slice(0,2);html+=`<div class="cal-cell ${outside?'muted ':''}${k===today?'today ':''}${k===selected?'selected':''}" data-day="${k}"><b>${d.getDate()}</b>${ev.map(x=>`<div class="cal-event">• ${safeEsc(x)}</div>`).join('')}</div>`;}
    grid.innerHTML=html;
    qa('.cal-cell').forEach(c=>c.onclick=()=>{selectedDay=new Date(c.dataset.day+'T12:00:00');renderCalendar();renderEvents();});
    renderEvents();
  }
  function renderEvents(){const box=q('#eventList');if(!box)return;const events=readEvents()[dayKey(selectedDay)]||[];box.innerHTML=events.length?events.map((x,i)=>`<div class="event-item">📌 ${safeEsc(x)} <button data-event-del="${i}">×</button></div>`).join(''):'<div class="muted">No events for selected day.</div>';qa('[data-event-del]').forEach(b=>b.onclick=()=>{const a=readEvents(),k=dayKey(selectedDay);a[k].splice(+b.dataset.eventDel,1);if(!a[k].length)delete a[k];localStorage.setItem('vibeCalendar',JSON.stringify(a));renderCalendar();});}
  function setupCalendar(){const g=q('#calendarGrid');if(!g||g.dataset.ready)return;g.dataset.ready='1';q('#calPrev').onclick=()=>{calDate.setMonth(calDate.getMonth()-1);renderCalendar()};q('#calNext').onclick=()=>{calDate.setMonth(calDate.getMonth()+1);renderCalendar()};q('#calToday').onclick=()=>{calDate=new Date();selectedDay=new Date();renderCalendar()};q('#addEvent').onclick=()=>{const i=q('#eventText'),v=i.value.trim();if(!v)return;const a=readEvents(),k=dayKey(selectedDay);(a[k]||(a[k]=[])).push(v);localStorage.setItem('vibeCalendar',JSON.stringify(a));i.value='';renderCalendar();notify('Calendar','Event added');};renderCalendar();}

  function setupSketchpad(){
    const c=q('#sketchCanvas'); if(!c||c.dataset.ready)return; c.dataset.ready='1';
    const ctx=c.getContext('2d'),size=q('#brushSize');let drawing=false,last=null;
    ctx.lineCap='round';ctx.lineJoin='round';
    const pos=e=>{const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height}};
    c.onpointerdown=e=>{drawing=true;last=pos(e);c.setPointerCapture(e.pointerId)};
    c.onpointermove=e=>{if(!drawing)return;const p=pos(e);ctx.strokeStyle='#111';ctx.lineWidth=Number(size.value);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p};
    c.onpointerup=()=>{drawing=false;last=null};c.onpointerleave=()=>{drawing=false;last=null};
    q('#sketchClear').onclick=()=>ctx.clearRect(0,0,c.width,c.height);
    q('#sketchSave').onclick=()=>{const a=document.createElement('a');a.download='vibe-sketch.png';a.href=c.toDataURL('image/png');a.click();notify('Sketchpad','PNG exported');};
  }

  function setupClipboardVault(){
    const add=q('#clipAdd');if(!add||add.dataset.ready)return;add.dataset.ready='1';
    const read=()=>{try{return JSON.parse(localStorage.getItem('vibeClips')||'[]')}catch{return []}};
    const render=()=>{const box=q('#clipList'),items=read();box.innerHTML=items.length?items.map((x,i)=>`<div class="clip-item"><div>${safeEsc(x)}</div><div class="clip-actions"><button data-copy="${i}">Copy</button><button data-remove="${i}">Delete</button></div></div>`).join(''):'<div class="muted">Your saved snippets will appear here.</div>';qa('[data-copy]').forEach(b=>b.onclick=async()=>{try{await navigator.clipboard.writeText(items[+b.dataset.copy]);toast('Copied to clipboard.')}catch{toast('Clipboard access unavailable.')}});qa('[data-remove]').forEach(b=>b.onclick=()=>{items.splice(+b.dataset.remove,1);localStorage.setItem('vibeClips',JSON.stringify(items));render()});};
    add.onclick=()=>{const i=q('#clipInput'),v=i.value.trim();if(!v)return;const a=read();a.unshift(v);localStorage.setItem('vibeClips',JSON.stringify(a.slice(0,50)));i.value='';render();};render();
  }

  function setupDevTools(){
    const run=q('#toolRun');if(!run||run.dataset.ready)return;run.dataset.ready='1';let tool='json';
    qa('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;qa('[data-tool]').forEach(x=>x.classList.remove('active'));b.classList.add('active')});
    run.onclick=()=>{const v=q('#toolInput').value;let o='';try{if(tool==='json')o=JSON.stringify(JSON.parse(v),null,2);else if(tool==='base64')o=btoa(unescape(encodeURIComponent(v)));else if(tool==='case')o=v.toLowerCase().replace(/\b\w/g,x=>x.toUpperCase());}catch(e){o='Error: '+e.message}q('#toolOutput').value=o};
    q('#toolClear').onclick=()=>{q('#toolInput').value='';q('#toolOutput').value=''};
  }

  const commands=[
    ['📁','File Explorer','explorer'],['📝','Notepad','notepad'],['🧮','Calculator','calculator'],['📊','System Monitor','system'],['⌨️','Vibe Terminal','terminal'],['🧠','Task Manager','taskmanager'],['✨','Vibe Hub','hub'],['💻','Code Studio','codestudio'],['📅','Vibe Calendar','calendar'],['🎨','Vibe Sketchpad','sketch'],['📋','Clipboard Vault','clipboard'],['🧰','Dev Tools','devtools'],['⚙️','Settings','settings'],['ℹ️','About','about']
  ];
  function openCommandCenter(){
    let p=q('#commandPalette');
    if(!p){
      p=document.createElement('div');p.id='commandPalette';p.className='final-modal';
      p.innerHTML='<div class="final-modal-card"><div class="final-modal-head"><b>⌘ Command Center</b><button id="ccClose">×</button></div><input id="ccInput" class="final-search" placeholder="Search apps…" autocomplete="off"><div id="ccResults" class="final-results"></div><div class="final-hint">↑ ↓ move · Enter launch · Esc close</div></div>';
      document.body.appendChild(p);
      q('#ccClose').onclick=()=>p.classList.add('hidden');
      q('#ccInput').oninput=e=>renderCommands(e.target.value);
      q('#ccInput').onkeydown=e=>{const rows=qa('#ccResults .final-command'),cur=rows.findIndex(x=>x.classList.contains('active'));let n=cur<0?0:cur;if(e.key==='ArrowDown'){e.preventDefault();n=(n+1)%Math.max(rows.length,1)}if(e.key==='ArrowUp'){e.preventDefault();n=(n-1+rows.length)%Math.max(rows.length,1)}if(e.key==='Enter'&&rows[n]){e.preventDefault();rows[n].click()}if(e.key==='Escape'){e.preventDefault();p.classList.add('hidden')}rows.forEach(x=>x.classList.remove('active'));if(rows[n])rows[n].classList.add('active')};
    }
    p.classList.remove('hidden');q('#ccInput').value='';renderCommands('');setTimeout(()=>q('#ccInput').focus(),30);
  }
  function renderCommands(term){const box=q('#ccResults');if(!box)return;const t=(term||'').toLowerCase();const list=commands.filter(x=>x[1].toLowerCase().includes(t));box.innerHTML=list.map((x,i)=>`<div class="final-command ${i===0?'active':''}" data-final-app="${x[2]}"><span>${x[0]}</span><b>${safeEsc(x[1])}</b><small>Open</small></div>`).join('')||'<div class="final-empty">No matching app</div>';qa('[data-final-app]').forEach(r=>r.onclick=()=>{q('#commandPalette').classList.add('hidden');openWindow(r.dataset.finalApp)});}
  function setupFinal(){
    q('#commandCenterBtn')?.addEventListener('click',e=>{e.stopPropagation();openCommandCenter()});
    document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();openCommandCenter()}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')q('#commandPalette')?.classList.add('hidden')});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupFinal);else setupFinal();
})();
