#!/usr/bin/env python3
"""
Extract all translatable English strings from Wegic template index.html files.
Outputs a JSON mapping: { "template_id": { "key": "english_text", ... }, ... }
"""

import re
import json
import os
import html as html_module

WEGIC_DIR = "/Users/xiaoye/Desktop/html5-examples/public/static-sites/wegic"


def extract_meta_content(html_text, meta_name):
    """Extract content from <meta name="X" content="...">"""
    # Handle both name= and property= variants
    patterns = [
        rf'<meta\s+name="{re.escape(meta_name)}"\s+content="([^"]*)"',
        rf"<meta\s+name='{re.escape(meta_name)}'\s+content='([^']*)'",
    ]
    for pattern in patterns:
        match = re.search(pattern, html_text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def extract_meta_property(html_text, prop_name):
    """Extract content from <meta property="og:title" content="..."> or <meta property="twitter:title" content="...">"""
    patterns = [
        rf'<meta\s+property="{re.escape(prop_name)}"\s+content="([^"]*)"',
        rf"<meta\s+property='{re.escape(prop_name)}'\s+content='([^']*)'",
    ]
    for pattern in patterns:
        match = re.search(pattern, html_text, re.IGNORECASE)
        if match:
            return match.group(1)
    return None


def extract_title(html_text):
    """Extract <title>...</title> content"""
    match = re.search(r"<title>(.*?)</title>", html_text, re.IGNORECASE)
    if match:
        return match.group(1)
    return None


def extract_inline_texts(html_text):
    """
    Extract inline English text nodes from the body (for rich templates 1-32).
    Returns list of text strings found between HTML tags in the body.
    Uses a conservative approach: only text that looks like English prose.
    """
    # Get the body content
    body_match = re.search(r"<body[^>]*>(.*?)</body>", html_text, re.DOTALL | re.IGNORECASE)
    if not body_match:
        return []

    body = body_match.group(1)

    # Find root div content
    root_match = re.search(r'<div\s+id="root"[^>]*>(.*)</div>\s*</body>', body, re.DOTALL)
    if not root_match:
        return []

    root_content = root_match.group(1)

    texts = []

    # Extract text from specific patterns:
    # 1. aria-label attributes
    for match in re.finditer(r'aria-label="([^"]*)"', root_content):
        text = match.group(1)
        if _is_english_prose(text):
            texts.append({"type": "aria_label", "text": text})

    # 2. Text content in anchor tags <a ...>TEXT</a>
    for match in re.finditer(r"<a\s[^>]*>([^<]*)</a>", root_content, re.DOTALL):
        text = match.group(1).strip()
        if text and _is_english_prose(text) and len(text) > 1:
            texts.append({"type": "link_text", "text": text})

    # 3. Text in heading tags h1-h6
    for match in re.finditer(r"<h[1-6][^>]*>([^<]*)</h[1-6]>", root_content, re.DOTALL):
        text = match.group(1).strip()
        if text and _is_english_prose(text) and len(text) > 1:
            texts.append({"type": "heading", "text": text})

    # 4. Text in paragraph/span/div/button/label tags
    for tag in ["p", "span", "div", "button", "label", "li", "dt", "dd", "figcaption", "cite"]:
        for match in re.finditer(
            rf"<{tag}(?:\s[^>]*)?>\s*([^<]*[a-zA-Z][^<]*)\s*</{tag}>", root_content, re.DOTALL
        ):
            text = match.group(1).strip()
            # Filter out: pure whitespace, CSS class-like strings, pure symbols, short text
            if text and _is_english_prose(text) and len(text) > 2:
                # Avoid duplicates
                if not any(t["text"] == text for t in texts):
                    texts.append({"type": f"tag_{tag}", "text": text})

    return texts


def _is_english_prose(text):
    """Check if text contains English words (not just code/URLs/symbols)"""
    if not text:
        return False
    # Skip if mostly HTML entities or symbols
    cleaned = re.sub(r"&[a-z]+;", "", text)
    cleaned = re.sub(r"\s+", "", cleaned)
    if len(cleaned) < 3:
        return False
    # Skip if it looks like a URL
    if re.match(r"^https?://", text):
        return False
    # Skip if it's only CSS/JS like strings
    if re.match(r"^[.#][\w-]+", text):
        return False
    # Must contain at least some alphabetic characters
    return bool(re.search(r"[a-zA-Z]{2,}", text))


def process_file(template_id):
    """Process a single template's index.html and extract translatable strings."""
    filepath = os.path.join(WEGIC_DIR, str(template_id), "index.html")
    if not os.path.exists(filepath):
        return None

    with open(filepath, "r", encoding="utf-8") as f:
        html_text = f.read()

    result = {}

    # Extract title
    title = extract_title(html_text)
    if title and _is_english_prose(title):
        result["title"] = title

    # Extract meta description
    desc = extract_meta_content(html_text, "description")
    if desc and _is_english_prose(desc):
        result["meta_description"] = desc

    # Extract meta keywords
    keywords = extract_meta_content(html_text, "keywords")
    if keywords and _is_english_prose(keywords):
        result["meta_keywords"] = keywords

    # Extract meta author
    author = extract_meta_content(html_text, "author")
    if author and _is_english_prose(author):
        result["meta_author"] = author

    # Extract OG tags
    og_title = extract_meta_property(html_text, "og:title")
    if og_title and _is_english_prose(og_title) and og_title != title:
        result["og_title"] = og_title

    og_desc = extract_meta_property(html_text, "og:description")
    if og_desc and _is_english_prose(og_desc) and og_desc != desc:
        result["og_description"] = og_desc

    # Extract Twitter tags
    tw_title = extract_meta_property(html_text, "twitter:title")
    if tw_title and _is_english_prose(tw_title) and tw_title != title and tw_title != og_title:
        result["twitter_title"] = tw_title

    tw_desc = extract_meta_property(html_text, "twitter:description")
    if (
        tw_desc
        and _is_english_prose(tw_desc)
        and tw_desc != desc
        and tw_desc != og_desc
    ):
        result["twitter_description"] = tw_desc

    # For rich templates (1-32), also extract inline body text
    if template_id <= 32:
        inline_texts = extract_inline_texts(html_text)
        if inline_texts:
            result["inline_texts"] = inline_texts

    # Check if lang needs changing
    lang_match = re.search(r'<html\s+lang="en"', html_text)
    if lang_match:
        result["_change_lang"] = True

    return result if result else None


def main():
    all_data = {}
    skipped = []

    for tid in range(1, 103):
        if tid == 85:  # Already Chinese
            skipped.append(tid)
            continue

        data = process_file(tid)
        if data:
            all_data[str(tid)] = data
            inline_count = len(data.get("inline_texts", []))
            meta_count = sum(
                1
                for k in data
                if k
                in [
                    "title",
                    "meta_description",
                    "meta_keywords",
                    "meta_author",
                    "og_title",
                    "og_description",
                    "twitter_title",
                    "twitter_description",
                ]
            )
            print(f"  Template {tid}: {meta_count} meta fields, {inline_count} inline texts")
        else:
            skipped.append(tid)
            print(f"  Template {tid}: nothing to translate (skip)")

    # Save to JSON
    output_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "i18n_strings_to_translate.json"
    )
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    print(f"\nTotal templates processed: {len(all_data)}")
    print(f"Skipped (already Chinese or no content): {skipped}")
    print(f"Output saved to: {output_path}")


if __name__ == "__main__":
    main()
