"""Generate project markup from data/projects.json.

Writes:
  - work/<slug>.html            one case-study page per project
  - index.html (between markers) the featured chapters and the project rail

Run from the repository root:  python scripts/build.py
No dependencies beyond the Python standard library.
"""
import json
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "projects.json"
INDEX = ROOT / "index.html"
WORK = ROOT / "work"
ASSET_VERSION = "94"
# Where GitHub Pages serves the site; used for social-preview links
SITE_URL = "https://sangamesh-dev.github.io/"


def icons(root):
    """The mascot's round badge, so tabs and home screens show the same face as the site."""
    return (f'<link rel="icon" type="image/png" sizes="32x32" href="{root}images/favicon-32.png">\n'
            f'<link rel="icon" type="image/png" sizes="64x64" href="{root}images/favicon-64.png">\n'
            f'<link rel="apple-touch-icon" href="{root}images/apple-touch-icon.png">')


def social(title, description, url):
    """Open Graph / Twitter tags so shared links get a title, summary and preview image."""
    return f"""<meta property="og:type" content="website">
<meta property="og:site_name" content="Sangamesh Girish Dandin">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:url" content="{e(url)}">
<meta property="og:image" content="{SITE_URL}images/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
"""

CATEGORY_LABEL = {"ai": "AI & ML", "security": "Security", "software": "Software"}


def e(text):
    return escape(str(text), quote=True)


def ext_link_label(link):
    return f'{e(link["label"])} <span aria-hidden="true">↗</span>'


def is_external(url):
    return url.startswith("http")


def link_attrs(url):
    return ' target="_blank" rel="noopener noreferrer"' if is_external(url) else ""


POS = {}  # slug -> (position, total), filled in main()


def web(p):
    """Compressed JPEG copy (images/web/, max 1400px wide) used outside the case-study hero."""
    w = min(1400, p["w"])
    return f"images/web/{Path(p['image']).stem}.jpg", w, round(p["h"] * w / p["w"])



# ── Project covers ────────────────────────────────────────────
# Projects without a real screenshot get a cover drawn from their own data:
# name, kind and pipeline stages on the chapter colour, with a dot-matrix
# halftone like the toolkit art. No invented UI, numbers or screens.
# Set "screenshot": true on a project to show its real image instead.
COVER_PALETTE = [("#2261e9", "#f4f1ea"), ("#16130f", "#f4f1ea"), ("#f4f1ea", "#16130f"), ("#e8462a", "#16130f"), ("#c4b5f4", "#16130f")]


def has_shot(p):
    return bool(p.get("screenshot"))


def cover_colors(p, i, light_page=False):
    ch = p.get("chapter")
    # Inverted chapter colours, so the cover stands out on its own chapter
    bg, fg = (ch["fg"], ch["bg"]) if ch else COVER_PALETTE[i % len(COVER_PALETTE)]
    # On a cream page a cream cover would disappear: flip it
    if light_page and bg.lower() == "#f4f1ea":
        bg, fg = fg, bg
    return bg, fg


def render_cover(p, i, total, light_page=False):
    bg, fg = cover_colors(p, i, light_page)
    steps = p["pipeline"]
    n = len(steps)
    # Halftone dot field swelling toward a corner that varies per project
    fx, fy = [(760, 470), (40, 470), (760, 40), (700, 480)][i % 4]
    dots = []
    for gy in range(10, 500, 20):
        for gx in range(10, 800, 20):
            r = 4.6 - (((gx - fx) ** 2 + (gy - fy) ** 2) ** 0.5) / 95
            if r > 0.5:
                dots.append(f'<circle cx="{gx}" cy="{gy}" r="{r:.1f}"/>')
    # Name sized to fit; pipeline boxes share the width evenly
    name = p["name"]
    name_size = min(62, round(720 / (len(name) * 0.6)))
    gap = 30
    bw = (720 - (n - 1) * gap) / n
    boxes = []
    for k, (title, _) in enumerate(steps):
        x = 40 + k * (bw + gap)
        # Two-word names wrap onto two lines rather than shrinking to fit
        words = title.split(" ")
        lines = [" ".join(words[:1]), " ".join(words[1:])] if len(words) > 1 and len(title) > 9 else [title]
        size = min(19, round((bw - 26) / (max(len(l) for l in lines) * 0.6)))
        tspans = "".join(f'<tspan x="{x + 14:.1f}" dy="{0 if j == 0 else size * 1.1:.1f}">{e(l)}</tspan>' for j, l in enumerate(lines))
        ty = 384 - (len(lines) - 1) * size * 1.1
        boxes.append(
            f'<rect x="{x:.1f}" y="290" width="{bw:.1f}" height="112" rx="14" fill="{fg}"/>'
            f'<text class="cv-mono" x="{x + 14:.1f}" y="316" font-size="12" fill="{bg}" opacity=".7">{k + 1:02}</text>'
            f'<text class="cv-step" x="{x + 14:.1f}" y="{ty:.1f}" font-size="{size}" fill="{bg}">{tspans}</text>'
        )
        if k < n - 1:
            ax = x + bw + 6
            boxes.append(
                f'<path d="M{ax:.1f} 346 h{gap - 12} m-7 -6 l7 6 l-7 6" fill="none" stroke="{fg}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
            )
    label = f"{name} pipeline: " + ", ".join(t for t, _ in steps)
    return f"""<svg class="cover" viewBox="0 0 800 500" role="img" aria-label="{e(label)}">
  <rect width="800" height="500" fill="{bg}"/>
  <g fill="{fg}" opacity=".2">{''.join(dots)}</g>
  <text class="cv-mono" x="40" y="58" font-size="13" fill="{fg}" opacity=".8" letter-spacing="2">{i:02} / {total:02} · {e(p['kind'].upper())}</text>
  <text class="cv-name" x="38" y="{100 + name_size * 0.8:.0f}" font-size="{name_size}" fill="{fg}">{e(name)}</text>
  {''.join(boxes)}
  <text class="cv-mono" x="40" y="452" font-size="12" fill="{fg}" opacity=".7" letter-spacing="2">PIPELINE · {n} STAGES</text>
</svg>"""


def media(p, i, total, root="", light_page=False):
    """The project's visual: its real screenshot if it has one, otherwise its cover."""
    if has_shot(p):
        src, w, h = web(p)
        return f'<img src="{root}{src}" alt="{e(p["alt"])}" width="{w}" height="{h}" loading="lazy" decoding="async">'
    return render_cover(p, i, total, light_page)



# ── Architecture diagrams ─────────────────────────────────────
# Drawn from each project's source code (Architecture/<project>-diagram/).
# The SVG is inlined so it stays sharp at any zoom and its namespaced styles
# load its fonts; a copy in images/architecture/ backs the "Open full size" link.
def diagram_svg(p):
    d = p.get("diagram")
    if not d:
        return ""
    svg = (ROOT / d["source"]).read_text(encoding="utf-8")
    return re.sub(r"^\s*<\?xml[^>]*\?>\s*", "", svg)


def render_diagram_section(p):
    d = p["diagram"]
    return f"""<p class="eyebrow mono"><span>01</span>Architecture</p>
      <h2 class="case-h2" id="front-title">How it's <span class="accent">built.</span></h2>
      <p class="diagram-lede">Drawn from the project's source code, not its README: what each part actually does and how a request moves through it.</p>
      <figure class="cover-frame diagram">
        <div class="diagram-scroll" tabindex="0" role="region" aria-label="{e(p['name'])} architecture diagram (scrolls sideways on small screens)">{diagram_svg(p)}</div>
      </figure>
      <p class="diagram-meta mono">Read from the code at commit {e(d['commit'])} · <a href="../images/architecture/{p['slug']}.svg" target="_blank" rel="noopener">Open full size ↗</a></p>"""


# ── Project videos ────────────────────────────────────────────
# A short demo can replace the cover in a featured chapter (muted, looping,
# playing only while on screen) and gets its own section on the case page,
# with controls and sound. Always labelled as a demo with example values.
def chapter_visual(p):
    v = p.get("video")
    if not v:
        return f'<figure class="cover-frame chapter-window">{media(p, *POS[p["slug"]])}</figure>'
    return f"""<figure class="cover-frame chapter-window chapter-video">
              <video class="demo" data-autoplay muted loop playsinline preload="none" poster="{e(v['poster'])}?v={ASSET_VERSION}" aria-label="{e(p['name'])} demo, an animated walkthrough with example values"><source src="{e(v['src'])}?v={ASSET_VERSION}" type="video/mp4"></video>
              <figcaption class="demo-tag mono">Demo · example values</figcaption>
            </figure>"""


def render_video_section(p):
    v = p["video"]
    return f"""
  <section class="case-demo" data-tone="paper" aria-labelledby="demo-title">
    <div class="wrap">
      <p class="eyebrow mono"><span>▶</span>Demo</p>
      <h2 class="case-h2" id="demo-title">See it <span class="accent">work.</span></h2>
      <figure class="cover-frame demo-lg">
        <video controls playsinline preload="metadata" poster="../{e(v['poster'])}?v={ASSET_VERSION}" aria-label="{e(p['name'])} demo, an animated walkthrough with example values"><source src="../{e(v['src'])}?v={ASSET_VERSION}" type="video/mp4"></video>
      </figure>
      <p class="demo-note">{e(v['note'])}</p>
    </div>
  </section>
"""

# ── index.html: featured chapters ─────────────────────────────
def shape(p):
    """'wide' for very wide diagrams (laid out full-width), otherwise 'standard'."""
    return "wide" if has_shot(p) and p["w"] / p["h"] > 2.4 else "standard"


# The mascot's outfit for each featured project (falls back by position)
OUTFITS = {"zeroinject-shield": "glasses", "redteam-copilot": "beanie", "bytehunter": "headset", "spearsim": "buckethat"}


def render_chapter(p, i, featured):
    ch = p["chapter"]
    # Seb's tour: the mascot alternates sides; the project sits opposite it
    side = "left" if i % 2 else "right"
    outfit = OUTFITS.get(p["slug"], ["glasses", "beanie", "headset", "buckethat"][(i - 1) % 4])
    total = len(featured)
    stack = "".join(f"<li>{e(s)}</li>" for s in p["stack"][:5])
    links = "".join(
        f'<a class="spec-link" href="{e(l["url"])}"{link_attrs(l["url"])}>{ext_link_label(l)}</a>'
        for l in p["links"]
    )
    dots = "".join(
        f'<a href="#ch-{f["slug"]}"{" aria-current=\"true\"" if f is p else ""} aria-label="Chapter {n:02}: {e(f["name"])}">{n:02}</a>'
        for n, f in enumerate(featured, 1)
    )
    # "showcase": the visual takes the room the facts card used; facts become one
    # metadata line under the tagline and the links sit with "View case study"
    showcase = p.get("chapter_layout") == "showcase"
    nxt = featured[i] if i < total else None
    next_link = (
        f'<a class="chapter-next mono" href="#ch-{nxt["slug"]}">Next · {e(nxt["name"])} <span aria-hidden="true">↓</span></a>'
        if nxt else '<a class="chapter-next mono" href="#projects">All projects <span aria-hidden="true">↓</span></a>'
    )
    return f"""
      <section class="chapter" id="ch-{p['slug']}" data-shape="{shape(p)}"{' data-layout="showcase"' if showcase else ''} style="--c-bg:{ch['bg']};--c-fg:{ch['fg']}" data-guide="{e(ch['bubble'])}" data-name="{e(p['name'])}" data-side="{side}" data-outfit="{outfit}" aria-labelledby="ch-{p['slug']}-title">
        <div class="chapter-stage">
          <div class="wrap chapter-grid">
            <div class="chapter-head">
              <div class="chapter-bar mono">
                <p class="chapter-count"><span>Featured {i:02} / {total:02}</span><span>{e(p['kind'])}</span></p>
                <nav class="chapter-dots" aria-label="Featured projects, from {e(p['name'])}">{dots}</nav>
              </div>
              <h3 class="chapter-title" id="ch-{p['slug']}-title">{e(p['name'])}</h3>
              <p class="chapter-tagline">{e(p['tagline'])}</p>
              {f"""<p class="chapter-meta mono" aria-label="{e(p['name'])} at a glance"><span>{e(p['status'])}</span><span>{e(p['built'])}</span><span>{e(p['result'])}</span></p>""" if showcase else ''}
              <div class="chapter-actions">
                <a class="btn btn-chapter" href="work/{p['slug']}.html">View case study <span aria-hidden="true">→</span></a>
                {f'<div class="chapter-links">{links}</div>' if showcase and links else ''}
                {next_link}
              </div>
            </div>
            {chapter_visual(p)}
            {'' if showcase else f"""<aside class="spec" aria-label="{e(p['name'])} at a glance">
              <dl>
                <div><dt>Status</dt><dd>{e(p['status'])}</dd></div>
                {f'<div><dt>Problem</dt><dd>{e(p["problem"])}</dd></div>' if p.get('problem') else ''}
                <div><dt>Built with</dt><dd>{e(p['built'])}</dd></div>
                <div><dt>Result</dt><dd>{e(p['result'])}</dd></div>
              </dl>
              <ul class="spec-stack mono">{stack}</ul>
              <div class="spec-links">{links}</div>
            </aside>"""}
          </div>
        </div>
      </section>"""


# ── index.html: project rail (all projects) ───────────────────
def render_rail_card(p, i, total):
    stack = "".join(f"<li>{e(s)}</li>" for s in p["stack"][:4])
    if p["links"]:
        first = p["links"][0]
        secondary = f'<a class="btn btn-ghost" href="{e(first["url"])}"{link_attrs(first["url"])}>{ext_link_label(first)}</a>'
        note = f'<p class="rail-note mono">{e(p["note"])}</p>' if p.get("note") else ""
    else:
        # No public repository: say so plainly; never link somewhere that looks like the code
        secondary = f'<span class="rail-private mono">{e(p.get("note") or "Code not public yet")}</span>'
        note = ""
    featured = p["featured"]
    flag = '<span class="rail-flag">Featured</span>' if featured else ""
    return f"""
          <li class="rail-card{' is-featured' if featured else ''}" data-cats="{' '.join(p['categories'])}">
            <article aria-labelledby="rc-{p['slug']}">
              <p class="rail-meta mono"><span>{i:02} / {total:02}</span><span>{flag}{e(p['status'])} · {e(p['kind'])}</span></p>
              <a class="rail-media" href="work/{p['slug']}.html" tabindex="-1" aria-hidden="true">
                <span class="rail-shot">{media(p, *POS[p['slug']])}</span>
                <span class="rail-view">View</span>
              </a>
              <h3 class="rail-name" id="rc-{p['slug']}">{e(p['name'])}</h3>
              <p class="rail-desc">{e(p['summary'])}</p>
              <ul class="tags mono" aria-label="Technologies">{stack}</ul>
              {note}
              <div class="rail-actions">
                <a class="btn btn-solid" href="work/{p['slug']}.html">Case study <span class="sr-only">: {e(p['name'])}</span></a>
                {secondary}
              </div>
            </article>
          </li>"""


def render_rail_divider(start, end, title):
    return f"""
          <li class="rail-divider" aria-hidden="true"><span class="mono">{f"{start:02}–{end:02}" if end > start else f"{start:02}"}</span><span class="rail-divider-t">{title}</span></li>"""


def in_progress(p):
    return p["status"] != "Completed" and not p["featured"]


# ── work/<slug>.html ──────────────────────────────────────────
HEADER = """<a class="skip-link" href="#main">Skip to content</a>
<header class="hdr" id="hdr">
  <div class="wrap hdr-inner">
    <a class="hdr-mark mono" href="{root}index.html">Sangamesh<span>.</span>Dandin</a>
    <nav class="hdr-nav" aria-label="Primary">
      <a href="{root}index.html#work"><span>01</span>Work</a>
      <a href="{root}index.html#toolkit"><span>02</span>Toolkit</a>
      <a class="hdr-logo" href="{root}index.html" aria-label="Home">SD</a>
      <a href="{root}index.html#about"><span>03</span>About</a>
      <a href="{root}index.html#contact"><span>04</span>Contact</a>
    </nav>
    <div class="hdr-tools">
      <a class="btn btn-ghost btn-sm" href="{root}Sangamesh_Dandin_Resume.pdf" download>Résumé <span aria-hidden="true">↓</span></a>
      <button type="button" class="btn btn-ghost btn-sm menu-btn" id="menu-btn" aria-expanded="false" aria-controls="menu">Menu</button>
    </div>
  </div>
  <div class="menu" id="menu" hidden>
    <nav class="wrap" aria-label="Mobile">
      <a href="{root}index.html#work"><span>01</span>Work</a>
      <a href="{root}index.html#toolkit"><span>02</span>Toolkit</a>
      <a href="{root}index.html#about"><span>03</span>About</a>
      <a href="{root}index.html#contact"><span>04</span>Contact</a>
      <a class="btn btn-solid" href="{root}Sangamesh_Dandin_Resume.pdf" download>Download résumé <span aria-hidden="true">↓</span></a>
    </nav>
  </div>
</header>"""

FOOTER = """<footer class="site-foot">
  <div class="wrap site-foot-inner mono">
    <p>© 2026 Sangamesh Girish Dandin · Dublin, Ireland</p>
    <p><a href="mailto:sangameshs2003@gmail.com">sangameshs2003@gmail.com</a></p>
    <a href="#top">Back to top <span aria-hidden="true">↑</span></a>
  </div>
</footer>"""


def head(title, description, root, url=None):
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(description)}">
<meta name="theme-color" content="#f4f1ea">
{icons(root)}
{social(title, description, url) if url else ''}<script>document.documentElement.classList.add('js');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=Big+Shoulders+Display:wght@100..900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}styles.css?v={ASSET_VERSION}">
</head>"""


def render_case(p, i, total, nxt):
    title_words = p["name"].upper().split(" ")
    if len(title_words) > 1:
        title = e(" ".join(title_words[:-1])) + f' <span class="accent">{e(title_words[-1])}.</span>'
    else:
        title = e(title_words[0]) + '<span class="accent">.</span>'
    links = "".join(
        f'<a class="case-link" href="{e(l["url"])}"{link_attrs(l["url"])}>{ext_link_label(l)}</a>' for l in p["links"]
    )
    note = f'<span class="case-link-note">{e(p["note"])}</span>' if p.get("note") else ""
    stack = "".join(f"<li>{e(s)}</li>" for s in p["stack"])
    steps = "".join(
        f'<li class="step"><span class="step-n mono">{n:02}</span><h3 class="step-t">{e(t)}</h3><p>{e(d)}</p></li>'
        for n, (t, d) in enumerate(p["pipeline"], 1)
    )
    pipeline_note = f'<p class="pipeline-note mono">{e(p["pipeline_note"])}</p>' if p.get("pipeline_note") else ""
    problem = f'<div><dt>Problem</dt><dd>{e(p["problem"])}</dd></div>' if p.get("problem") else ""
    # "What I built": my own contribution, only where the data lists it
    work = (
        '<h2 class="case-sub mono">What I built</h2><ul class="case-work">'
        + "".join(f"<li>{e(w)}</li>" for w in p["work"])
        + "</ul>"
    ) if p.get("work") else ""
    return f"""{head(f"{p['name']} — Case study · Sangamesh Girish Dandin", p['tagline'], '../', f"{SITE_URL}work/{p['slug']}.html")}
<body id="top" class="page-case">
<!-- GENERATED by scripts/build.py from data/projects.json. Edit the data file, not this page. -->
{HEADER.format(root='../')}

<main id="main">
  <section class="case-hero" data-tone="paper">
    <div class="wrap">
      <a class="back mono" href="../index.html#work"><span aria-hidden="true">←</span> All projects</a>
      <p class="case-kicker mono"><span>Case {i:02} / {total:02}</span><span>{e(p['kind'])}</span><span class="status" data-status="{'wip' if p['status'] != 'Completed' else 'done'}">{e(p['status'])}</span></p>
      <h1 class="case-title" style="--longest:{max(len(w) for w in title_words) + (0 if len(title_words) > 1 else 1)}">{title}</h1>
      <div class="case-hero-grid">
        <div class="case-intro">
          <p class="case-tagline">{e(p['tagline'])}</p>
          <p>{e(p['description'])}</p>
          {work}
        </div>
        <dl class="case-meta">
          {problem}
          <div><dt>Built with</dt><dd>{e(p['built'])}</dd></div>
          <div><dt>Result</dt><dd>{e(p['result'])}</dd></div>
          <div><dt>Links</dt><dd class="case-links">{links}{note}</dd></div>
        </dl>
      </div>
      <ul class="tags tags-lg mono" aria-label="Technologies">{stack}</ul>
    </div>
  </section>

{render_video_section(p) if p.get('video') else ''}
  <section class="case-front" data-tone="paper" aria-labelledby="front-title">
    <div class="wrap">
      {render_diagram_section(p) if p.get('diagram') else f"""<p class="eyebrow mono"><span>01</span>{'The front' if has_shot(p) else 'Overview'}</p>
      <h2 class="case-h2" id="front-title">{'What you <span class="accent">see.</span>' if has_shot(p) else 'At a <span class="accent">glance.</span>'}</h2>
      <figure class="cover-frame cover-lg">{media(p, *POS[p['slug']], root='../', light_page=True)}</figure>"""}
    </div>
  </section>

  <section class="case-back" data-tone="ink" aria-labelledby="back-title">
    <div class="wrap">
      <p class="eyebrow mono"><span>02</span>Under the hood</p>
      <h2 class="case-h2" id="back-title">How it <span class="accent">works.</span></h2>
      <ol class="pipeline">{steps}</ol>
      {pipeline_note}
    </div>
  </section>

  <section class="case-next" data-tone="paper" aria-labelledby="next-title">
    <div class="wrap case-next-grid">
      <div>
        <p class="eyebrow mono"><span>→</span>Up next · {(i % total) + 1:02} / {total:02}</p>
        <h2 class="case-h2 next-h2" id="next-title"><a href="{nxt['slug']}.html">Next <span class="accent">project.</span></a></h2>
        <p class="next-name">{e(nxt['name'])} — {e(nxt['tagline'])}</p>
        <a class="back mono" href="../index.html#work"><span aria-hidden="true">←</span> Back to all projects</a>
      </div>
      <a class="next-media rail-media" href="{nxt['slug']}.html" tabindex="-1" aria-hidden="true">
        <span class="rail-shot">{media(nxt, *POS[nxt['slug']], root='../', light_page=True)}</span>
        <span class="rail-view">View</span>
      </a>
    </div>
  </section>
</main>

{FOOTER}
<script src="../script.js?v={ASSET_VERSION}"></script>
</body>
</html>
"""



# ── Error pages: 404 (website issue) and offline (internet issue) ──
# Relative paths, so the pages also work when opened straight from disk. Online,
# a <base href="/"> is added first: GitHub Pages serves 404.html at any missing
# address (e.g. /work/a/b) and the service worker serves offline.html at whatever
# URL failed, so relative links must resolve from the site root there.
BASE_SCRIPT = """<script>if (location.protocol !== 'file:') { const b = document.createElement('base'); b.href = '/'; document.head.appendChild(b); }</script>"""
ERRORS = {
    "404": {
        "title": "Page not found · Sangamesh Girish Dandin",
        "description": "This page doesn't exist. Head back to the portfolio of Sangamesh Girish Dandin.",
        "tag": "Error 404 · Website issue",
        "heading": "Page not found",
        "code": "404",
        "lede": "This address doesn't exist on the site. It's a broken or mistyped link, not a problem with your connection.",
        "outfit": "buckethat",
        "expr": "open",
        "say": "Hmm, I can't find that page. <b>Wrong turn</b> somewhere?",
        "actions": (
            '<a class="btn btn-paper" href="index.html">Back home <span aria-hidden="true">→</span></a>'
            '<a class="btn btn-line" href="index.html#work">See projects</a>'
        ),
        "extra": '<p class="error-note mono">Followed a link here? <a id="report-link" href="mailto:sangameshs2003@gmail.com?subject=Broken%20link%20on%20your%20portfolio">Tell me about it ↗</a></p>',
    },
    "offline": {
        "title": "You're offline · Sangamesh Girish Dandin",
        "description": "Your device lost its internet connection. The portfolio of Sangamesh Girish Dandin will load again once you're back online.",
        "tag": "No connection · Internet issue",
        "heading": "Connection lost",
        "code": "Offline",
        "lede": "Your device lost its internet connection, so this page couldn't load. The site itself is fine. Check your Wi-Fi or mobile data, then try again.",
        "outfit": "headset",
        "expr": "open",
        "say": "Looks like you're <b>offline</b>. I'll wait right here.",
        "actions": (
            '<button type="button" class="btn btn-paper" id="retry-btn">Try again <span aria-hidden="true">↻</span></button>'
            '<a class="btn btn-line" href="index.html">Back home</a>'
        ),
        "extra": '<p class="error-note mono" id="retry-note" aria-live="polite">The page reloads by itself when your connection comes back.</p>',
    },
}


def render_error(kind):
    d = ERRORS[kind]
    return f"""{head(d['title'], d['description'], '').replace('<meta charset="UTF-8">', '<meta charset="UTF-8">' + chr(10) + BASE_SCRIPT, 1)}
<body id="top" class="page-error page-{kind}">
<!-- GENERATED by scripts/build.py. Edit the ERRORS table there, not this page. -->
{HEADER.format(root='')}

<main id="main">
  <section class="hero error-hero" data-tone="blue" data-outfit="{d['outfit']}" data-expr="{d['expr']}" aria-labelledby="error-title">
    <div class="wrap hero-main">
      <div class="hero-copy">
        <p class="hero-tag mono"><span class="pulse" aria-hidden="true"></span>{e(d['tag'])}</p>
        <h1 class="error-title" id="error-title">{e(d['heading'])}</h1>
        <p class="error-code" aria-hidden="true">{e(d['code'])}</p>
        <p class="error-lede">{e(d['lede'])}</p>
        <div class="hero-actions">{d['actions']}</div>
        {d['extra']}
      </div>
    </div>
  </section>
</main>

<button type="button" class="sound" id="sound" aria-pressed="false" aria-label="Interface sounds" hidden>
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 6H4l3.5-3v10L4 10H1.5z" fill="currentColor"/><path class="sound-off" d="m10.5 6 4 4m0-4-4 4"/><path class="sound-on" d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.5 6.5 0 0 1 0 9"/></svg>
</button>
<div class="mascot-layer" aria-hidden="true">
  <canvas class="portrait mascot" data-portrait data-style="mascot"></canvas>
  <div class="mascot-handle" title="Grab me"></div>
  <p class="say mascot-say is-hidden" id="mascot-say"><span id="mascot-say-text">{d['say']}</span><span class="say-tail"></span><span class="say-tail say-tail-shadow"></span></p>
</div>

<script src="script.js?v={ASSET_VERSION}"></script>
</body>
</html>
"""


def render_sw():
    # Network first, always: the cache is only a fallback for when there's no
    # connection, so visitors never see stale pages while online.
    return f"""// GENERATED by scripts/build.py. Shows offline.html when there's no connection.
const CACHE = 'sd-offline-v{ASSET_VERSION}';
const OFFLINE = '/offline.html';
const PRECACHE = [OFFLINE, '/styles.css?v={ASSET_VERSION}', '/script.js?v={ASSET_VERSION}'];

self.addEventListener('install', (e) => {{
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
}});
self.addEventListener('activate', (e) => {{
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
}});
self.addEventListener('fetch', (e) => {{
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {{
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
  }} else if (PRECACHE.some((p) => req.url.endsWith(p))) {{
    e.respondWith(fetch(req).catch(() => caches.match(req)));
  }}
}});
"""

def replace_between(text, name, content):
    pattern = re.compile(rf"(<!-- GEN:{name} -->)(.*?)(<!-- /GEN:{name} -->)", re.S)
    if not pattern.search(text):
        raise SystemExit(f"Marker GEN:{name} not found in index.html")
    return pattern.sub(lambda m: m.group(1) + content + "\n      " + m.group(3), text)


def main():
    projects = json.loads(DATA.read_text(encoding="utf-8"))["projects"]
    featured = [p for p in projects if p["featured"]]
    # Featured first, then the rest, then work still in progress
    others = [p for p in projects if not p["featured"] and not in_progress(p)]
    wip = [p for p in projects if in_progress(p)]
    ordered = featured + others + wip
    total = len(ordered)
    POS.update({q["slug"]: (k, total) for k, q in enumerate(ordered, 1)})

    index = INDEX.read_text(encoding="utf-8")
    index = replace_between(index, "CHAPTERS", "".join(render_chapter(p, i, featured) for i, p in enumerate(featured, 1)))
    rail = ""
    for i, p in enumerate(ordered, 1):
        if others and i == len(featured) + 1:
            rail += render_rail_divider(i, len(featured) + len(others), "More <br>projects")
        if wip and i == len(featured) + len(others) + 1:
            rail += render_rail_divider(i, total, "In the <br>works")
        rail += render_rail_card(p, i, total)
    index = replace_between(index, "RAIL", rail)
    index = re.sub(r'(styles\.css|script\.js)\?v=\d+', rf'\1?v={ASSET_VERSION}', index)
    INDEX.write_text(index, encoding="utf-8")

    # Public copies of the diagrams for the "Open full size" link
    ARCH = ROOT / "images" / "architecture"
    ARCH.mkdir(parents=True, exist_ok=True)
    for q in ordered:
        if q.get("diagram"):
            (ARCH / f"{q['slug']}.svg").write_bytes((ROOT / q["diagram"]["source"]).read_bytes())

    WORK.mkdir(exist_ok=True)
    for i, p in enumerate(ordered, 1):
        nxt = ordered[i % total]
        (WORK / f"{p['slug']}.html").write_text(render_case(p, i, total, nxt), encoding="utf-8")

    for kind in ERRORS:
        (ROOT / f"{kind}.html").write_text(render_error(kind), encoding="utf-8")
    (ROOT / "sw.js").write_text(render_sw(), encoding="utf-8")

    print(f"Built {total} case studies, {len(featured)} chapters, rail of {total}, 404 + offline pages and sw.js.")


if __name__ == "__main__":
    main()
