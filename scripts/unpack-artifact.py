"""Treat CI artifacts as untrusted files; never extract executable configuration."""
import pathlib, stat, sys, zipfile
archive, destination = sys.argv[1:]
root = pathlib.Path(destination)
root.mkdir(parents=True, exist_ok=True)
allowed = {'.html', '.js', '.css', '.data', '.svg', '.png', '.jpg', '.webp', '.ico', '.woff2', '.txt', '.xml', '.json', '.map'}
with zipfile.ZipFile(archive) as z:
    members = z.infolist()
    if len(members) > 2000 or sum(m.file_size for m in members) > 50_000_000:
        raise ValueError('Artifact exceeds publication limits')
    seen = set()
    for m in members:
        path = pathlib.PurePosixPath(m.filename)
        if path.is_absolute() or '..' in path.parts or '\\' in m.filename or any(p.startswith('.') for p in path.parts) or str(path) != m.filename.rstrip('/'):
            raise ValueError('Unsafe artifact path')
        if stat.S_ISLNK(m.external_attr >> 16) or m.filename in seen:
            raise ValueError('Symlink or duplicate artifact member')
        seen.add(m.filename)
        if m.is_dir():
            continue
        if path.suffix not in allowed and m.filename != '_headers':
            raise ValueError('Unexpected artifact file type')
        target = root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(z.read(m))
if not (root / 'index.html').is_file() or not (root / '404.html').is_file():
    raise ValueError('Missing required static documents')
