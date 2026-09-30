#!/usr/bin/env python3
"""Extract English body text from a Wegic template."""
import re, sys

path = sys.argv[1] if len(sys.argv) > 1 else '/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic/69/index.html'

with open(path) as f:
    html = f.read()

body_start = html.find('<body')
body = html[body_start:html.find('</body>')]

texts = set()
for m in re.finditer(r'>([^<>]{3,})<', body):
    t = m.group(1).strip()
    if not t:
        continue
    # Skip code-like strings
    if re.match(r'^[\s\d.,!?;:+\-*/=@#$%^&()[\]{}|~`"\'\\]+$', t):
        continue
    if t.startswith('http'):
        continue
    if re.search(r'[a-zA-Z]', t):
        texts.add(t)

print(f'Found {len(texts)} English text snippets:')
for t in sorted(texts)[:50]:
    print(f'  [{t[:120]}]')
