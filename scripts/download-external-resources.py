#!/usr/bin/env python3
"""Download external images/resources to local directories and rewrite HTML references."""
import re, os, urllib.request, json, time, hashlib

WEGIC_DIR = "/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic"

# Patterns to find external URLs in HTML
SRC_PATTERNS = [
    (r'src="(https?://[^"]+)"', 'src'),
    (r'href="(https?://[^"]+\.(?:png|jpg|jpeg|gif|svg|webp|ico|webm|mp4)[^"]*)"', 'href'),
    (r'content="(https?://[^"]+\.(?:png|jpg|jpeg|webp)[^"]*)"', 'content'),
    (r'url\(["\']?(https?://[^")]+\.(?:png|jpg|jpeg|webp|svg)[^")]*)["\']?\)', 'bg'),
    (r'style="[^"]*background-image:\s*url\(["\']?(https?://[^")]+)["\']?\)[^"]*"', 'bg_style'),
]

SKIP_DOMAINS = [
    'google.com/maps', 'maps.google',
    'ui-avatars.com', 'pravatar.cc', 'dicebear.com', 'api.dicebear.com',
    'fonts.googleapis', 'fonts.gstatic',
]

def safe_filename(url):
    """Generate a unique filename from URL."""
    # Strip query params for extension
    base = url.split('?')[0]
    ext = os.path.splitext(base)[1] or '.jpg'
    # Hash URL for uniqueness
    h = hashlib.md5(url.encode()).hexdigest()[:12]
    return f"{h}{ext}"

def should_skip(url):
    for domain in SKIP_DOMAINS:
        if domain in url:
            return True
    return False

def download(url, dest):
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            with open(dest, 'wb') as f:
                f.write(data)
            return True
    except Exception as e:
        print(f"    ❌ {url[:80]}: {e}")
        return False

def main():
    total_dl, total_skip = 0, 0
    total_urls = 0

    for tid in range(1, 103):
        path = os.path.join(WEGIC_DIR, str(tid), 'index.html')
        if not os.path.exists(path):
            continue

        with open(path, encoding='utf-8') as f:
            html = f.read()

        images_dir = os.path.join(WEGIC_DIR, str(tid), 'images')
        assets_dir = os.path.join(WEGIC_DIR, str(tid), 'assets')
        os.makedirs(images_dir, exist_ok=True)
        os.makedirs(assets_dir, exist_ok=True)

        replacements = {}
        found_any = False

        for pattern, ptype in SRC_PATTERNS:
            for m in re.finditer(pattern, html):
                url = m.group(1)
                # Handle HTML entities in URL
                url = url.replace('&amp;', '&')
                if should_skip(url):
                    continue
                if url in replacements:
                    continue
                total_urls += 1
                found_any = True

        if found_any:
            print(f"\n[#{tid}] {total_urls} external URLs found")

        # Process found URLs
        count = 0
        for pattern, ptype in SRC_PATTERNS:
            for m in re.finditer(pattern, html):
                url = m.group(1)
                url_clean = url.replace('&amp;', '&')
                if should_skip(url_clean):
                    continue
                if url in replacements:
                    continue

                # Determine destination
                fn = safe_filename(url_clean)
                if ptype in ('bg', 'bg_style'):
                    dest = os.path.join(images_dir, fn)
                    local_path = f"./images/{fn}"
                elif ptype in ('src', 'content'):
                    if any(ext in url_clean.lower() for ext in ('.png','.jpg','.jpeg','.gif','.svg','.webp','.ico','.webm','.mp4')):
                        dest = os.path.join(images_dir, fn)
                        local_path = f"./images/{fn}"
                    else:
                        dest = os.path.join(assets_dir, fn)
                        local_path = f"./assets/{fn}"
                elif ptype == 'href':
                    dest = os.path.join(assets_dir, fn)
                    local_path = f"./assets/{fn}"
                else:
                    continue

                # Download
                if download(url_clean, dest):
                    replacements[url] = local_path
                    count += 1
                    total_dl += 1
                else:
                    total_skip += 1
                    # Try original URL (with &amp;)
                    if url != url_clean:
                        if download(url, dest):
                            replacements[url] = local_path
                            count += 1
                            total_dl += 1
                            total_skip -= 1

                time.sleep(0.3)

        # Apply replacements
        if replacements:
            new_html = html
            for old_url, local_path in replacements.items():
                new_html = new_html.replace(old_url, local_path)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_html)
            print(f"  ✅ Downloaded {count}, rewrote {len(replacements)} URLs")

    print(f"\n{'='*50}")
    print(f"Total downloaded: {total_dl}")
    print(f"Total skipped/failed: {total_skip}")

if __name__ == '__main__':
    main()
