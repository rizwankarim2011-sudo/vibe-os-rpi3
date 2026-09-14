/* Vibe Pro Shell — modular desktop layer. It does not replace the existing apps. */
(function(){
  'use strict';
  const qs=s=>document.querySelector(s), qsa=s=>[...document.querySelectorAll(s)];
  const state={desktop:Number(localStorage.getItem('vibeDesktop')||1),snap:null,lastX:0,lastY:0};
  const apps=[['explorer','Files'],['notepad','Notepad'],['terminal','Terminal'],['taskmanager','Task Manager'],['settings','Settings']];

  function inject(){
    if(qs('#vibeShellLayer'))return;
    const layer=document.createElement('div');layer.id='vibeShellLayer';layer.className='vibe-shell-layer';
    layer.innerHTML=`
      <div id="vibeContext" class="vibe-context-menu hidden">
        <button data-vibe-cmd="refresh">↻ Refresh desktop</button>
        <button data-vibe-cmd="explorer">📁 Open Files</button>
        <button data-vibe-cmd="terminal">⌨ Open Terminal</button>
        <button data-vibe-cmd="settings">⚙ Personalize / Settings</button>
      </div>
      <div id="vibeDesktops" class="vibe-shell-panel hidden">
        <div class="vibe-panel-head"><b>Workspace desktops</b><span>Ctrl+Win+1…4 to switch</span></div>
        <div class="vibe-desktops"></div>
      </div>
      <div id="vibeSnap" class="vibe-snap-overlay"><div class="vibe-snap-zone left"></div><div class="vibe-snap-zone right"></div></div>
      <div id="vibeLock" class="vibe-lock-screen hidden"><div class="vibe-lock-card"><div class="vibe-lock-logo">V</div><h2>Vibe-coder's OS</h2><p>Session locked by Vibe Security</p><div id="vibeLockTime" class="vibe-lock-time">--:--</div><p>Unlock using your normal Linux account credentials.</p><div class="vibe-lock-note">This screen is only shown after the real Linux session lock succeeds.</div></div></div>`;
    document.body.appendChild(layer);
  }

  function open(app){if(typeof window.openWindow==='function')window.openWindow(app);}
  function renderDesktops(){
    const box=qs('.vibe-desktops');if(!box)return;box.innerHTML='';
    for(let i=1;i<=4;i++){
      const b=document.createElement('button');b.className='vibe-desktop'+(i===state.desktop?' active':'');
      b.innerHTML=`<b>Desktop ${i}</b><small>${i===state.desktop?'Current workspace':'Switch workspace'}</small>`;
      b.onclick=()=>switchDesktop(i);box.appendChild(b);
    }
  }
  function switchDesktop(n){state.desktop=n;localStorage.setItem('vibeDesktop',String(n));qsa('.window').forEach(w=>{if(!w.dataset.vibeDesktop)w.dataset.vibeDesktop='1';w.classList.toggle('hidden',w.dataset.vibeDesktop!==String(n) || w.dataset.vibeClosed==='1' || w.dataset.vibeMinimized==='1');});renderDesktops();if(typeof window.updateTaskbar==='function')window.updateTaskbar();}
  function patchOpenWindow(){
    if(typeof window.openWindow!=='function'||window.__vibeOpenPatched)return;
    const original=window.openWindow;window.__vibeOriginalOpenWindow=original;
    window.openWindow=function(app){const w=qs('#window-'+app);if(w){w.dataset.vibeDesktop=String(state.desktop);w.dataset.vibeClosed='0';w.dataset.vibeMinimized='0';}original(app);};window.__vibeOpenPatched=true;
  }
  function patchCloseState(){
    qsa('.window').forEach(w=>{w.dataset.vibeDesktop=w.dataset.vibeDesktop||'1';w.addEventListener('pointerdown',()=>{w.dataset.vibeDesktop=w.dataset.vibeDesktop||String(state.desktop);});});
    if(typeof window.closeWindow==='function'&&!window.__vibeClosePatched){const close=window.closeWindow;window.closeWindow=function(w){w.dataset.vibeClosed='1';w.dataset.vibeMinimized='0';close(w);};window.__vibeClosePatched=true;}
    if(typeof window.minimizeWindow==='function'&&!window.__vibeMinPatched){const min=window.minimizeWindow;window.minimizeWindow=function(w){w.dataset.vibeMinimized='1';min(w);};window.__vibeMinPatched=true;}
  }
  function snapWindow(w,side){
    if(!w)return;w.classList.remove('maximized','vibe-snap-left','vibe-snap-right');w.classList.add(side==='left'?'vibe-snap-left':'vibe-snap-right');state.snap=side;w.dataset.vibeSnapped='1';
  }
  function clearSnap(w){if(!w)return;w.classList.remove('vibe-snap-left','vibe-snap-right');w.dataset.vibeSnapped='0';}
  function setupSnap(){
    qsa('.window-titlebar').forEach(bar=>{
      let activeWindow=null;
      bar.addEventListener('pointerdown',e=>{activeWindow=bar.closest('.window');state.lastX=e.clientX;state.lastY=e.clientY;});
      bar.addEventListener('pointermove',e=>{state.lastX=e.clientX;state.lastY=e.clientY;});
      bar.addEventListener('pointerup',e=>{
        const w=activeWindow;if(!w)return;const edge=28;
        if(e.clientY<edge){w.classList.remove('vibe-snap-left','vibe-snap-right');w.classList.add('maximized');clearSnap(w);}
        else if(e.clientX<edge)snapWindow(w,'left');
        else if(e.clientX>innerWidth-edge)snapWindow(w,'right');
        else if(w.dataset.vibeSnapped==='1')clearSnap(w);
        activeWindow=null;hideSnap();
      });
      bar.addEventListener('dblclick',()=>{const w=bar.closest('.window');if(!w)return;clearSnap(w);w.classList.toggle('maximized');});
    });
  }
  function showSnap(side){const o=qs('#vibeSnap');if(!o)return;o.classList.add('active',''+side);}
  function hideSnap(){const o=qs('#vibeSnap');if(!o)return;o.classList.remove('active','left','right');}
  function setupContext(){
    const menu=qs('#vibeContext');
    document.addEventListener('contextmenu',e=>{if(e.target.closest('.window,.taskbar,.start-menu,#vibeContext'))return;e.preventDefault();menu.style.left=Math.min(e.clientX,innerWidth-220)+'px';menu.style.top=Math.min(e.clientY,innerHeight-190)+'px';menu.classList.remove('hidden');});
    document.addEventListener('click',e=>{if(!e.target.closest('#vibeContext'))menu.classList.add('hidden');});
    menu.addEventListener('click',e=>{const c=e.target.closest('[data-vibe-cmd]');if(!c)return;const cmd=c.dataset.vibeCmd;menu.classList.add('hidden');if(cmd==='refresh'){location.reload();return;}open(cmd);});
  }
  function setupDesktopPanel(){
    const task=qs('.taskbar');if(!task)return;const btn=document.createElement('button');btn.id='vibeDesktopBtn';btn.className='taskbar-mini';btn.title='Virtual desktops';btn.textContent='▦';task.querySelector('.taskbar-right')?.prepend(btn);btn.onclick=e=>{e.stopPropagation();const p=qs('#vibeDesktops');p.classList.toggle('hidden');renderDesktops();};
    document.addEventListener('click',e=>{if(!e.target.closest('#vibeDesktops')&&!e.target.closest('#vibeDesktopBtn'))qs('#vibeDesktops')?.classList.add('hidden');});
  }
  async function lockSession(){
    try{if(!window.vibeAPI||typeof window.vibeAPI.post!=='function')throw new Error('Core API unavailable');await window.vibeAPI.post('/api/session',{action:'lock'});qs('#vibeLock')?.classList.remove('hidden');}
    catch(e){if(typeof window.toast==='function')window.toast('Linux session lock unavailable: '+e.message);}
  }
  function setupLock(){
    const task=qs('.taskbar-right');if(!task)return;const b=document.createElement('button');b.id='vibeLockBtn';b.className='taskbar-mini';b.title='Lock session';b.textContent='🔒';b.onclick=lockSession;task.prepend(b);
    document.addEventListener('keydown',e=>{if(e.metaKey&&e.key.toLowerCase()==='l'){e.preventDefault();lockSession();}if(e.ctrlKey&&e.metaKey&&/^[1-4]$/.test(e.key)){e.preventDefault();switchDesktop(Number(e.key));}if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='escape'){e.preventDefault();open('taskmanager');}});
    setInterval(()=>{const t=qs('#vibeLockTime');if(t)t.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});},1000);
  }
  function setup(){inject();patchOpenWindow();patchCloseState();setupSnap();setupContext();setupDesktopPanel();setupLock();renderDesktops();switchDesktop(state.desktop);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(setup,100));else setTimeout(setup,100);
})();
