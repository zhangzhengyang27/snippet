#!/usr/bin/env python3
"""Extract all unique English text snippets from body of all Wegic templates."""
import re, os, json

WEGIC = "/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic"

# Patterns to skip (non-translatable)
SKIP_PATTERNS = [
    r'^\s*$',                          # empty/whitespace
    r'^[\s\d.,!?;:+\-*/=@#$%^&()[\]{}|~`"\'\\/]+$',  # symbols/numbers only
    r'^[.#@][\w-]',                    # CSS selectors/emails
    r'^https?://',                     # URLs
    r'^[A-Z]{2,}$',                    # All caps abbreviations
    r'^[A-Z][a-z]*\s*&\s*[A-Z][a-z]*$', # Brand names like "Hygge & Haus"
]

# Known brand names / proper nouns to keep as-is
KEEP_AS_IS = {
    'Wegic', 'NOIR', 'AURA', 'Lumina', 'NeonPulse', 'NexusCorp', 'NexusBiz',
    'OBSIDIAN', 'BOLD', 'BuildCore', 'TradeCore', 'LinkForge', 'PeptiCore',
    'Coachify', 'Oblivion', 'CODOT', 'Verdant', 'Onyx', 'Proxima',
    'SparkleClean', 'AffiliateBoost', 'WixBuilder', 'LUMIERE', 'ADULT',
    'Burivers', 'Ignite', 'Chronicle', 'Coral Fiesta', 'Electric Bloom',
    'Grace Church', 'Aegis Archives', 'Lex Advisors',
    'Serenity Spa', 'Radiant Smile', 'Warm Coral', 'Warm Orange',
    'Sunny Steps', 'Little Sprout', 'CitySprouts',
    'Hygge & Haus', 'Hygge &amp; Haus', 'Hygge and Haus',
    'Sage & Petal', 'Sage &amp; Petal', 'Sage and Petal',
    'Blush & Bloom', 'Blush &amp; Bloom', 'Blush and Bloom',
    'Fleur & Co', 'Fleur &amp; Co', 'Fleur and Co',
    'Teal Craft Co', 'Teal Craft',
    'Elara Studio', 'Aura Studio', 'Lens & Light', 'Lens and Light',
    'MAISON ELARA', 'Elara',
    'Sterling & Partners', 'Sterling &amp; Partners',
    'Sterling & Co', 'Sterling &amp; Co',
    'Emma & James', 'Emma &amp; James', 'Eleanor & James', 'Eleanor &amp; James',
    'STRUCTORA', 'MOCAR', 'MOCHAR', 'GRAIN & GRIT', 'GRAIN &amp; GRIT',
    'Numerous', 'Lumina 3D', 'Lumina Photography', 'Lumina Events',
    'Lumina Gallery',
    'Maya Chen', 'Nora Vane', 'Alex Rivera', 'Alex', 'Kimmy',
    'James Hartwell', 'Dr. Emily Carter', 'Emily Carter',
    'CUP CULT', 'Urban Living',
    'AI Payroll', 'Payroll',
    'InteractFlow', 'Bootstrap',
    'WanderFolio', 'The Slow Travel Manifesto',
    'CT Executive Training',
    'Sabi Dining Chair', 'Elysian Wool Rug', 'Hygge Lounge Chair',
}

def is_translatable(text):
    """Check if text should be translated (contains English prose)."""
    text = text.strip()
    if len(text) < 2:
        return False
    # Skip known brand names
    if text in KEEP_AS_IS:
        return False
    # Skip if matches any skip pattern
    for pat in SKIP_PATTERNS:
        if re.match(pat, text):
            return False
    # Must contain at least 2 English letters
    if not re.search(r'[a-zA-Z]{2,}', text):
        return False
    return True

def extract_body_texts(html):
    """Extract translatable text from body HTML."""
    body_start = html.find('<body')
    if body_start < 0:
        return set()
    # Remove our injected animation JS (between <script> and </script>)
    body = html[body_start:]
    body = re.sub(r'<script[\s\S]*?</script>', '', body)
    body = re.sub(r'<style[\s\S]*?</style>', '', body)
    
    # Also remove the head section
    body_end = body.find('</body>')
    if body_end > 0:
        body = body[:body_end]
    
    texts = set()
    # Extract text from common HTML elements
    # Text between > and <
    for m in re.finditer(r'>\s*([^<>]{2,})\s*<', body):
        t = m.group(1).strip()
        if is_translatable(t):
            texts.add(t)
    
    # Also extract from attributes that contain text: alt, title, aria-label, placeholder
    for attr in ['alt', 'title', 'aria-label', 'placeholder']:
        for m in re.finditer(rf'{attr}="([^"]+)"', body):
            t = m.group(1).strip()
            if is_translatable(t):
                texts.add(t)
    
    return texts


def main():
    all_texts = {}  # template_id -> set of texts
    global_unique = set()
    
    for i in range(1, 103):
        path = os.path.join(WEGIC, str(i), 'index.html')
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as f:
            html = f.read()
        
        texts = extract_body_texts(html)
        if texts:
            all_texts[str(i)] = sorted(texts)
            global_unique.update(texts)
            print(f'  [#{i}] {len(texts)} texts')
    
    print(f'\nTotal unique English texts: {len(global_unique)}')
    
    # Save to JSON for translation
    output = {
        'unique_texts': sorted(global_unique),
        'by_template': all_texts,
    }
    out_path = os.path.join(os.path.dirname(__file__), 'body_en_to_translate.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f'Saved to: {out_path}')


if __name__ == '__main__':
    main()
