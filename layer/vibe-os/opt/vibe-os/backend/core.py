from __future__ import annotations
import json, os, sys, subprocess
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote

ROOT = Path(os.environ.get('VIBE_OS_ROOT', '/opt/vibe-os')).resolve()
BACKEND = ROOT / 'backend'
FRONTEND = ROOT / 'frontend'
WORKSPACE = Path(os.environ.get('VIBE_WORKSPACE', '/home/vibe/Workspace')).resolve()
WORKSPACE.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(BACKEND))
from filesystem import WorkspaceFS, FilesystemError
from system import get_system_info

try:
    CONFIG = json.loads((ROOT / 'config.json').read_text(encoding='utf-8'))
except Exception:
    CONFIG = {}
CONFIG.setdefault('name', "Vibe-coder's OS — Raspberry Edition")
CONFIG.setdefault('version', '1.3.0')
CONFIG.setdefault('host', '127.0.0.1')
CONFIG.setdefault('port', 8765)
FS = WorkspaceFS(WORKSPACE)

class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(FRONTEND), **k)
    def log_message(self, f, *a):
        print('[VibeOS]', f % a)
    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        super().end_headers()
    def _headers(self, content_type):
        self.send_header('Content-Type', content_type)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
    def j(self, x, s=200):
        b = json.dumps(x, ensure_ascii=False).encode()
        self.send_response(s); self._headers('application/json; charset=utf-8'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def body(self):
        try:
            return json.loads(self.rfile.read(int(self.headers.get('Content-Length', '0')) or 0) or b'{}')
        except Exception:
            raise FilesystemError('Invalid JSON request.')
    def do_GET(self):
        p = urlparse(self.path); q = parse_qs(p.query)
        try:
            if p.path == '/api/status':
                return self.j({'name': CONFIG['name'], 'version': CONFIG['version'], 'shell': CONFIG.get('shell', 'Vibe Pro Desktop'), 'level': 'Raspberry Edition', 'status': 'online', 'platform': 'Linux', 'workspace': str(FS.workspace)})
            if p.path == '/api/health':
                return self.j({'ok': True, 'service': CONFIG['name'], 'version': CONFIG['version'], 'platform': 'linux', 'workspace_safe': True})
            if p.path == '/api/session':
                user = os.environ.get('USER', 'vibe')
                sessions = subprocess.run(['loginctl', 'list-sessions', '--no-legend'], capture_output=True, text=True, timeout=3)
                active = False
                for line in sessions.stdout.splitlines():
                    parts = line.split()
                    if len(parts) >= 3 and parts[2] == user:
                        sid = parts[0]
                        probe = subprocess.run(['loginctl', 'show-session', sid, '-p', 'Active', '--value'], capture_output=True, text=True, timeout=2)
                        active = probe.returncode == 0 and probe.stdout.strip().lower() == 'yes'
                        if active: break
                return self.j({'active': active})
            if p.path == '/api/system':
                return self.j(get_system_info(WORKSPACE))
            if p.path == '/api/files':
                return self.j(FS.list_dir(unquote(q.get('path', [''])[0])))
            if p.path == '/api/file':
                x = unquote(q.get('path', [''])[0]); return self.j({'path': x, 'content': FS.read_text(x)})
            if p.path == '/api/search':
                return self.j({'results': FS.search(unquote(q.get('q', [''])[0]), unquote(q.get('path', [''])[0]))})
            return super().do_GET()
        except FilesystemError as e:
            return self.j({'error': str(e)}, 400)
        except Exception as e:
            return self.j({'error': f'Server error: {e}'}, 500)
    def do_POST(self):
        p = urlparse(self.path)
        try:
            d = self.body()
            if p.path == '/api/session':
                if d.get('action') != 'lock': return self.j({'error': 'Unsupported session action.'}, 400)
                user = os.environ.get('USER', 'vibe')
                sessions = subprocess.run(['loginctl', 'list-sessions', '--no-legend'], capture_output=True, text=True, timeout=3)
                session_id = None
                for line in sessions.stdout.splitlines():
                    parts = line.split()
                    if len(parts) >= 3 and parts[2] == user:
                        session_id = parts[0]; break
                if not session_id: return self.j({'error': 'No Linux session found for the Vibe user.'}, 409)
                r = subprocess.run(['loginctl', 'lock-session', session_id], capture_output=True, text=True, timeout=3)
                if r.returncode != 0: return self.j({'error': (r.stderr or 'Unable to lock the Linux session.').strip()}, 500)
                return self.j({'ok': True, 'action': 'lock', 'session': session_id})
            if p.path == '/api/folder': return self.j({'ok': True, 'item': FS.create_folder(d.get('parent', ''), d.get('name', ''))}, 201)
            if p.path == '/api/file': return self.j({'ok': True, 'item': FS.create_file(d.get('parent', ''), d.get('name', ''), d.get('content', ''))}, 201)
            if p.path == '/api/rename': return self.j({'ok': True, 'item': FS.rename(d.get('path', ''), d.get('newName', ''))})
            if p.path == '/api/delete': FS.delete(d.get('path', '')); return self.j({'ok': True})
            if p.path == '/api/write': return self.j({'ok': True, 'item': FS.write_text(d.get('path', ''), d.get('content', ''))})
            if p.path == '/api/terminal': return self.j(term(d.get('command', ''), d.get('path', '')))
            return self.j({'error': 'Unknown API endpoint.'}, 404)
        except FilesystemError as e:
            return self.j({'error': str(e)}, 400)
        except Exception as e:
            return self.j({'error': f'Server error: {e}'}, 500)

def term(c, path=''):
    c = c.strip(); a = c.split()
    if not c: return {'ok': True, 'output': ''}
    cmd = a[0].lower(); arg = ' '.join(a[1:]).strip()
    if cmd == 'help': return {'ok': True, 'output': 'Available commands:\n  help\n  pwd\n  ls\n  cd <path>\n  cat <file>\n  clear'}
    if cmd == 'pwd': return {'ok': True, 'output': str(FS._safe_path(path))}
    if cmd == 'ls':
        x = FS.list_dir(path); return {'ok': True, 'output': '\n'.join(('[DIR] ' if i['type'] == 'folder' else '[FILE] ') + i['name'] for i in x['items']) or '(empty folder)'}
    if cmd == 'cd':
        t = FS._safe_path(arg)
        if not t.is_dir(): raise FilesystemError('Not a folder.')
        return {'ok': True, 'path': FS._relative(t), 'output': FS._relative(t) or '/'}
    if cmd == 'cat':
        if not arg: raise FilesystemError('Usage: cat <file>')
        t = (FS._safe_path(path) / arg).resolve()
        try: r = t.relative_to(FS.workspace)
        except ValueError: raise FilesystemError('Access denied.')
        return {'ok': True, 'output': FS.read_text(r.as_posix())}
    if cmd == 'clear': return {'ok': True, 'clear': True, 'output': ''}
    return {'ok': False, 'output': f'Command not allowed: {cmd}. Type "help".'}

if __name__ == '__main__':
    ThreadingHTTPServer((CONFIG['host'], CONFIG['port']), H).serve_forever()
