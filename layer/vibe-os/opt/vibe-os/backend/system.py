from __future__ import annotations
import os, platform, shutil, time
from datetime import datetime
from pathlib import Path

def _mem():
    t=a=None
    try:
        for l in Path('/proc/meminfo').read_text().splitlines():
            if l.startswith('MemTotal:'): t=int(l.split()[1])*1024
            elif l.startswith('MemAvailable:'): a=int(l.split()[1])*1024
    except Exception: pass
    return ((t-a)*100/t,t,a) if t and a is not None else (None,t,a)

def _cpu():
    try:
        def s():
            v=list(map(int,Path('/proc/stat').read_text().splitlines()[0].split()[1:])); return v[3]+v[4],sum(v)
        i1,t1=s(); time.sleep(.1); i2,t2=s(); return max(0,min(100,(t2-t1-(i2-i1))*100/(t2-t1)))
    except Exception:return None

def _battery():
    try:
        for p in Path('/sys/class/power_supply').glob('BAT*/capacity'):
            st=p.parent/'status'; return int(p.read_text()), st.exists() and st.read_text().strip().lower() in {'charging','full'}
    except Exception: pass
    return None,None

def get_system_info(workspace: Path):
    u=shutil.disk_usage(workspace); mp,mt,ma=_mem(); bp,bc=_battery()
    try: up=float(Path('/proc/uptime').read_text().split()[0])
    except Exception: up=None
    try: pc=sum(1 for p in Path('/proc').iterdir() if p.name.isdigit())
    except Exception: pc=None
    return {'os':platform.system(),'os_release':platform.release(),'machine':platform.machine(),'processor':platform.processor() or 'ARM Cortex-A53','hostname':platform.node() or 'Unknown','python':platform.python_version(),'python_executable':os.sys.executable,'cpu_count':os.cpu_count() or 1,'cpu_percent':_cpu(),'memory_percent':mp,'memory_total':mt,'memory_available':ma,'process_count':pc,'uptime_seconds':up,'battery_percent':bp,'battery_charging':bc,'workspace':str(workspace),'workspace_total':u.total,'workspace_used':u.total-u.free,'workspace_free':u.free,'server_time':datetime.now().isoformat(timespec='seconds')}
