from __future__ import annotations

import os
from pathlib import Path
from datetime import datetime
from typing import Any


class FilesystemError(Exception):
    """Expected filesystem/API error."""


class WorkspaceFS:
    """
    Safe filesystem bridge for the OS.

    All operations are constrained to the Vibe-coder's OS project directory.
    This prevents the web UI from being used as an unrestricted PC file manager.
    """

    def __init__(self, workspace: Path):
        self.workspace = workspace.resolve()

    def _safe_path(self, relative: str = "") -> Path:
        relative = relative.replace("\\", "/").lstrip("/")
        target = (self.workspace / relative).resolve()

        try:
            target.relative_to(self.workspace)
        except ValueError:
            raise FilesystemError("Access denied: path is outside the OS workspace.")

        return target

    def _relative(self, path: Path) -> str:
        resolved = path.resolve()
        if resolved == self.workspace:
            return ""
        return resolved.relative_to(self.workspace).as_posix()

    def _entry_info(self, path: Path) -> dict[str, Any]:
        stat = path.stat()
        is_dir = path.is_dir()
        return {
            "name": path.name,
            "path": self._relative(path),
            "type": "folder" if is_dir else "file",
            "size": None if is_dir else stat.st_size,
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
        }

    def list_dir(self, relative: str = "") -> dict[str, Any]:
        target = self._safe_path(relative)

        if not target.exists():
            raise FilesystemError("Folder not found.")
        if not target.is_dir():
            raise FilesystemError("The selected path is not a folder.")

        entries = []
        for item in target.iterdir():
            try:
                entries.append(self._entry_info(item))
            except OSError:
                # Ignore entries that disappear or become inaccessible while listing.
                continue

        entries.sort(key=lambda x: (x["type"] != "folder", x["name"].lower()))

        parent = ""
        if target != self.workspace:
            parent_path = target.parent
            parent = self._relative(parent_path)

        return {
            "path": self._relative(target),
            "name": target.name or self.workspace.name,
            "parent": parent,
            "items": entries,
        }

    def create_folder(self, parent: str, name: str) -> dict[str, Any]:
        name = name.strip()
        if not name or name in {".", ".."} or "/" in name or "\\" in name:
            raise FilesystemError("Invalid folder name.")

        parent_path = self._safe_path(parent)
        if not parent_path.is_dir():
            raise FilesystemError("Parent folder not found.")

        target = parent_path / name
        if target.exists():
            raise FilesystemError("A file or folder with that name already exists.")

        target.mkdir()
        return self._entry_info(target)

    def create_file(self, parent: str, name: str, content: str = "") -> dict[str, Any]:
        name = name.strip()
        if not name or name in {".", ".."} or "/" in name or "\\" in name:
            raise FilesystemError("Invalid file name.")

        parent_path = self._safe_path(parent)
        if not parent_path.is_dir():
            raise FilesystemError("Parent folder not found.")

        target = parent_path / name
        if target.exists():
            raise FilesystemError("A file or folder with that name already exists.")

        target.write_text(content, encoding="utf-8")
        return self._entry_info(target)

    def rename(self, relative: str, new_name: str) -> dict[str, Any]:
        new_name = new_name.strip()
        if not new_name or new_name in {".", ".."} or "/" in new_name or "\\" in new_name:
            raise FilesystemError("Invalid name.")

        source = self._safe_path(relative)
        if source == self.workspace:
            raise FilesystemError("The workspace root cannot be renamed.")
        if not source.exists():
            raise FilesystemError("Item not found.")

        target = source.parent / new_name
        if target.exists():
            raise FilesystemError("A file or folder with that name already exists.")

        source.rename(target)
        return self._entry_info(target)

    def delete(self, relative: str) -> None:
        target = self._safe_path(relative)

        if target == self.workspace:
            raise FilesystemError("The workspace root cannot be deleted.")
        if not target.exists():
            raise FilesystemError("Item not found.")

        if target.is_dir():
            import shutil
            shutil.rmtree(target)
        else:
            target.unlink()

    def read_text(self, relative: str) -> str:
        target = self._safe_path(relative)

        if not target.is_file():
            raise FilesystemError("The selected item is not a file.")

        try:
            return target.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            raise FilesystemError("This file is not a UTF-8 text file.")
        except OSError as exc:
            raise FilesystemError(f"Could not read file: {exc}")

    def write_text(self, relative: str, content: str) -> dict[str, Any]:
        target = self._safe_path(relative)

        if target == self.workspace or not target.is_file():
            raise FilesystemError("The selected item is not a file.")

        try:
            target.write_text(content, encoding="utf-8")
        except OSError as exc:
            raise FilesystemError(f"Could not save file: {exc}")

        return self._entry_info(target)

    def search(self, query: str, relative: str = "") -> list[dict[str, Any]]:
        query = query.strip().lower()
        if not query:
            return []

        root = self._safe_path(relative)
        if not root.is_dir():
            raise FilesystemError("Search folder not found.")

        results = []
        for current, dirs, files in os.walk(root):
            # Skip hidden/cache-style Python directories when practical.
            dirs[:] = [d for d in dirs if d not in {".git", "__pycache__"}]

            for name in dirs + files:
                if query in name.lower():
                    item = Path(current) / name
                    try:
                        info = self._entry_info(item)
                        info["path"] = self._relative(item)
                        results.append(info)
                    except OSError:
                        continue

        results.sort(key=lambda x: (x["type"] != "folder", x["path"].lower()))
        return results[:500]
