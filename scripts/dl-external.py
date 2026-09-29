#!/usr/bin/env python3
"""Download external images to local, one template at a time."""
import re, os, urllib.request, hashlib, sys

WEGIC = "/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic"
SKIP = ['google.com/maps','ui-avatars.com','pravatar.cc','dicebear.com','fonts.googleapis','fonts.gstatic']

def download(url, dest):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as r:
            with open(dest, 'wb') as f: f.write(r.read())
        return True
    except: return False

def process(tid):
    path = os.path.join(WEGIC, str(tid), 'index.html')
    if not os.path.exists(path): return 0
    with open(path, encoding='utf-8') as f: html = f.read()

    os.makedirs(os.path.join(WEGIC, str(tid), 'images'), exist_ok=True)
    replacements = {}
    urls = set()

    # Find all external image URLs
    for m in re.finditer(r'(?:src|content|href)="(https?://[^"]+\.(?:png|jpg|jpeg|gif|svg|webp|ico|webm|mp4)[^"]*)"', html):
        url = m.group(1).replace('&amp;', '&')
        if any(s in url for s in SKIP): continue
        urls.add(url)
    for m in re.finditer(r'url\(["\']?(https?://[^")]+\.(?:png|jpg|jpeg|webp|svg)[^")]*)["\']?\)', html):
        url = m.group(1)
        if any(s in url for s in SKIP): continue
        urls.add(url)

    if not urls: return 0

    dl = 0
    for url in urls:
        ext = os.path.splitext(url.split('?')[0])[1] or '.jpg'
        fn = f"{hashlib.md5(url.encode()).hexdigest()[:12]}{ext}"
        dest = os.path.join(WEGIC, str(tid), 'images', fn)
        if download(url, dest):
            replacements[url] = f"./images/{fn}"
            # Also try &amp; version
            amp_url = url.replace('&', '&amp;')
            if amp_url != url:
                replacements[amp_url] = f"./images/{fn}"
            dl += 1

    if replacements:
        new_html = html
        for old, new in replacements.items():
            new_html = new_html.replace(old, new)
        with open(path, 'w', encoding='utf-8') as f: f.write(new_html)
        print(f"  [#{tid}] {dl}/{len(urls)} downloaded")

    return dl

if __name__ == '__main__':
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 102
    total = 0
    for i in range(start, end+1):
        total += process(i)
    print(f"\nDone: {total} files downloaded")
