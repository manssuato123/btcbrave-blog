"""BTCBRAVE automatic blog briefs and original graphic cover images."""

import hashlib
import html
import json
import re
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageFont

NEWS_URL = "https://news.btcbrave.store/news.json"
POSTS_FILE = Path("posts.json")
IMAGE_FOLDER = Path("imgs/auto")
IMAGE_BASE = "https://blog.btcbrave.store/imgs/auto"
TOPICS = ("crypto", "finance", "technology", "ai", "world")
MAX_PER_TOPIC_PER_DAY = 3

PALETTE = {
    "crypto": ((8, 18, 34), (241, 174, 61)),
    "finance": ((9, 28, 40), (49, 213, 178)),
    "technology": ((8, 21, 48), (76, 147, 255)),
    "ai": ((25, 14, 53), (178, 109, 255)),
    "world": ((36, 19, 31), (255, 142, 100)),
}


class OnlyText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def clean_text(value):
    parser = OnlyText()
    parser.feed(html.unescape(str(value or "")))
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()


def get_date(value):
    try:
        result = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if result.tzinfo is None:
            result = result.replace(tzinfo=timezone.utc)
        return result.astimezone(timezone.utc)
    except (TypeError, ValueError):
        return None


def normal_link(value):
    try:
        url = urlsplit(str(value or "").strip())
        if url.scheme not in ("http", "https") or not url.netloc:
            return ""
        query = urlencode([
            (key, value) for key, value in parse_qsl(url.query)
            if not key.lower().startswith("utm_")
            and key.lower() not in ("fbclid", "gclid")
        ])
        return urlunsplit((url.scheme.lower(), url.netloc.lower(),
                           url.path.rstrip("/") or "/", query, ""))
    except ValueError:
        return ""


def get_json(url):
    request = Request(url, headers={
        "User-Agent": "BTCBRAVE-AutoBlog/2.0",
        "Accept": "application/json",
    })
    with urlopen(request, timeout=35) as response:
        data = json.load(response)
    if not isinstance(data, list):
        raise ValueError("news.json must contain a JSON list")
    return data


def load_posts():
    if not POSTS_FILE.exists():
        raise FileNotFoundError("posts.json is missing; no files changed")
    posts = json.loads(POSTS_FILE.read_text(encoding="utf-8-sig"))
    if not isinstance(posts, list):
        raise ValueError("posts.json must contain a JSON list")
    return posts


def load_font(size, bold=True):
    name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    path = Path("/usr/share/fonts/truetype/dejavu") / name
    try:
        return ImageFont.truetype(str(path), size)
    except OSError:
        return ImageFont.truetype(name, size)


def wrap_text(draw, title, font, max_width, max_lines=4):
    words = title.split()
    result = []
    for word in words:
        if result and draw.textbbox((0, 0), result[-1] + " " + word,
                                    font=font)[2] <= max_width:
            result[-1] += " " + word
        else:
            result.append(word)
    if len(result) > max_lines:
        result = result[:max_lines]
        while result[-1] and draw.textbbox(
            (0, 0), result[-1] + "...", font=font
        )[2] > max_width:
            result[-1] = result[-1].rsplit(" ", 1)[0] if " " in result[-1] else result[-1][:-1]
        result[-1] += "..."
    return result


def make_image(title, topic, identifier, now):
    """Create an original abstract illustration; no news photo is copied."""
    width, height = 1200, 675
    dark, bright = PALETTE[topic]
    pic = Image.new("RGB", (width, height), dark)
    draw = ImageDraw.Draw(pic)
    for y in range(height):
        color = tuple(min(255, int(c + (y / height) * 18)) for c in dark)
        draw.line((0, y, width, y), fill=color)

    art = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    graphic = ImageDraw.Draw(art)
    seed = int(identifier[:8], 16)
    for idx in range(5):
        size = 190 + (seed // (idx + 1)) % 170
        x = 850 + (idx * 74) - 120
        y = 20 + (idx * 95) - 120
        graphic.ellipse((x, y, x + size, y + size),
                        outline=(*bright, 65), width=6)
    for idx in range(9):
        y = 150 + idx * 47
        graphic.line((760, y, 1180, y - 65),
                     fill=(*bright, 26), width=2)
    pic = Image.alpha_composite(pic.convert("RGBA"), art)
    draw = ImageDraw.Draw(pic)

    draw.rounded_rectangle((66, 60, 415, 113), radius=20,
                           fill=(*bright, 48), outline=bright, width=2)
    draw.text((88, 67), "BTCBRAVE  /  BLOG", font=load_font(25), fill=(250, 251, 255))
    draw.rounded_rectangle((66, 151, 315, 208), radius=20, fill=bright)
    draw.text((86, 160), topic.upper(), font=load_font(28), fill=dark)

    font = load_font(58)
    title = clean_text(title)
    lines = wrap_text(draw, title, font, 995, max_lines=4)
    y = 250
    for line in lines:
        draw.text((70, y), line, font=font, fill=(249, 250, 253),
                  stroke_width=1, stroke_fill=dark)
        y += 77

    draw.line((70, 598, 1130, 598), fill=bright, width=3)
    draw.text((70, 615), "ORIGINAL GRAPHIC ILLUSTRATION",
              font=load_font(20, bold=False), fill=(207, 215, 231))
    draw.text((1022, 615), now.strftime("%d %b %Y"),
              font=load_font(17, bold=False), fill=(207, 215, 231),
              anchor="ra")

    date_path = now.strftime("%Y/%m/%d")
    filename = f"{topic}-{identifier[:14]}.png"
    destination = IMAGE_FOLDER / date_path / filename
    destination.parent.mkdir(parents=True, exist_ok=True)
    pic.convert("RGB").save(destination, format="PNG", optimize=True)
    return f"{IMAGE_BASE}/{date_path}/{filename}"


def make_post(item, now):
    title = clean_text(item["title"])
    description = clean_text(item["description"])
    url = item["link"]
    host = urlsplit(url).hostname or "Original publisher"
    source = host.removeprefix("www.")
    published = get_date(item.get("pubDate")) or now
    topic = item["category"].lower()
    identifier = hashlib.sha256(normal_link(url).encode("utf-8")).hexdigest()

    # At most 24 quoted words from the publisher's RSS snippet.
    excerpt = description.split()[:24]
    first = " ".join(excerpt[:12])
    second = " ".join(excerpt[12:])
    if len(description.split()) > 24:
        second += "..."

    # Exactly 10 brief English lines; do not invent events or unseen facts.
    rows = [
        f"BTCBRAVE {topic.title()} News Brief.",
        f"Headline: {title}.",
        f"Original reporting: {source}.",
        "The publisher's RSS summary states:",
        f"{first}",
        f"{second}",
        "This is a short source-attributed overview, not a complete report.",
        "The original article contains the complete reporting and context.",
        f"Original story date: {published.strftime('%d %B %Y')}.",
        f'Read the original story: <a href="{html.escape(url, quote=True)}" '
        'target="_blank" rel="noopener noreferrer">Open source</a>.',
    ]
    body = "\n".join(
        f"<p>{row}</p>" if index == 9 else f"<p>{html.escape(row)}</p>"
        for index, row in enumerate(rows)
    )
    cover_url = make_image(title, topic, identifier, now)
    return {
        "title": title,
        "description": " ".join(excerpt) + ("..." if len(description.split()) > 24 else ""),
        "link": "",
        "thumbnail": cover_url,
        "pubDate": now.isoformat(timespec="seconds"),
        "fullText": body,
        "category": topic,
        "sourceLink": url,
        "source": source,
        "autoGenerated": True,
        "imageCredit": "Original BTCBRAVE graphic illustration",
    }


def main():
    now = datetime.now(timezone.utc)
    print("[START] BTCBRAVE daily blog automation", flush=True)
    posts = load_posts()
    news = get_json(NEWS_URL)
    print(f"[INFO] {len(news)} news articles available", flush=True)

    # Replace previous auto-post thumbnails that reused publishers' images.
    repaired_covers = 0
    for post in posts:
        if not isinstance(post, dict) or not post.get("autoGenerated"):
            continue
        topic = str(post.get("category") or "").lower()
        if topic not in TOPICS or not post.get("title"):
            continue
        current_image = str(post.get("thumbnail") or "")
        if current_image.startswith(IMAGE_BASE + "/"):
            continue
        source = normal_link(post.get("sourceLink") or post.get("link"))
        identity = hashlib.sha256(
            (source or clean_text(post["title"])).encode("utf-8")
        ).hexdigest()
        date = get_date(post.get("pubDate")) or now
        post["thumbnail"] = make_image(post["title"], topic, identity, date)
        post["imageCredit"] = "Original BTCBRAVE graphic illustration"
        repaired_covers += 1
    if repaired_covers:
        print(f"[FIXED] Replaced {repaired_covers} earlier thumbnail(s)", flush=True)

    count_today = {topic: 0 for topic in TOPICS}
    seen_urls = set()
    seen_titles = set()
    for post in posts:
        if not isinstance(post, dict):
            continue
        url = normal_link(post.get("sourceLink") or post.get("link"))
        if url:
            seen_urls.add(url)
        seen_titles.add(clean_text(post.get("title")).casefold())
        date = get_date(post.get("pubDate"))
        topic = str(post.get("category") or "").lower()
        if (post.get("autoGenerated") and date and date.date() == now.date()
                and topic in count_today):
            count_today[topic] += 1

    candidates = {topic: [] for topic in TOPICS}
    for item in news:
        if not isinstance(item, dict):
            continue
        topic = str(item.get("category") or "").lower()
        title = clean_text(item.get("title"))
        description = clean_text(item.get("description"))
        url = normal_link(item.get("link"))
        date = get_date(item.get("pubDate"))
        if (topic not in candidates or len(title) < 18
                or len(description) < 70 or not url or not date
                or url in seen_urls or title.casefold() in seen_titles
                or date < now - timedelta(days=3)
                or date > now + timedelta(minutes=10)):
            continue
        candidates[topic].append((date, item))

    created = []
    for topic in TOPICS:
        if count_today[topic] >= MAX_PER_TOPIC_PER_DAY:
            print(f"[SKIP] {topic}: daily quota reached")
            continue
        candidates[topic].sort(key=lambda pair: pair[0], reverse=True)
        for _, item in candidates[topic]:
            title_key = clean_text(item["title"]).casefold()
            link_key = normal_link(item["link"])
            if link_key in seen_urls or title_key in seen_titles:
                continue
            post = make_post(item, now)
            created.append(post)
            seen_urls.add(link_key)
            seen_titles.add(title_key)
            print(f"[CREATED] {topic}: {post['title']}", flush=True)
            break
        else:
            print(f"[SKIP] {topic}: no suitable new news available")

    if not created and not repaired_covers:
        print("[DONE] No new posts; existing files preserved.")
        return

    posts = created + posts
    temporary = POSTS_FILE.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(posts, indent=2, ensure_ascii=False) + "\n",
                         encoding="utf-8")
    temporary.replace(POSTS_FILE)
    print(f"[DONE] Added {len(created)} posts and repaired {repaired_covers} covers. Total: {len(posts)}", flush=True)


if __name__ == "__main__":
    main()
