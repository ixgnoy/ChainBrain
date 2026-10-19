# Joins the technical docs into one HTML book (book.html), ready for pdf.cjs.
# Usage (from the repo root), twice so the contents page gets page numbers:
#   python docs/submission/build/book.py && node docs/submission/build/pdf.cjs
#   python docs/submission/build/book.py --pages && node docs/submission/build/pdf.cjs
import datetime, html, os, re, subprocess, sys
import markdown

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
REPO = "https://github.com/ixgnoy/Fintechathon-LianAiNao/blob/main/"
DOCS = [  # (path, part title shown in the contents)
    ("docs/technical-document.md", "Technical document"),
    ("docs/09-technical-reference/README.md", "Technical reference"),
    ("docs/09-technical-reference/01-overview-and-architecture.md", None),
    ("docs/09-technical-reference/02-smart-contracts.md", None),
    ("docs/09-technical-reference/03-wallet-server.md", None),
    ("docs/09-technical-reference/04-agent-and-ai-brain.md", None),
    ("docs/09-technical-reference/05-security-and-monitoring.md", None),
    ("docs/09-technical-reference/06-frontends.md", None),
    ("docs/09-technical-reference/07-built-in-network.md", None),
    ("docs/09-technical-reference/08-chain-and-deployment.md", None),
    ("docs/09-technical-reference/09-testing.md", None),
    ("docs/09-technical-reference/10-configuration.md", None),
    ("docs/ai-brain.md", "AI brain"),
    ("docs/security-self-assessment.md", "Security"),
    ("docs/submission/redteam/report.md", None),
    ("docs/fisco-ehkd-chain.md", "Chain and evidence"),
    ("docs/evidence-fisco.md", None),
]
PDF = os.path.join(os.path.dirname(__file__), "..", "ChainBrain-technical-documentation.pdf")
IDS = {p: f"d{i:02d}" for i, (p, _) in enumerate(DOCS)}

def slug(text, sep="-"):  # GitHub's heading anchors
    text = re.sub(r"<[^>]+>", "", text).strip().lower()
    return re.sub(r"[^\w\- ]", "", text, flags=re.UNICODE).replace(" ", "-")

def fix_links(body, path, did):
    here = os.path.dirname(path)
    def href(m):
        url = html.unescape(m.group(1))
        if re.match(r"^(https?:|mailto:)", url):
            return m.group(0)
        if url.startswith("#"):
            return f'href="#{did}-{url[1:]}"'
        target, _, frag = url.partition("#")
        rel = os.path.normpath(os.path.join(here, target)).replace("\\", "/")
        if rel in IDS:
            return f'href="#{IDS[rel]}-{frag}"' if frag else f'href="#{IDS[rel]}"'
        return f'href="{html.escape(REPO + rel + ("#" + frag if frag else ""))}"'
    body = re.sub(r'href="([^"]*)"', href, body)
    return re.sub(r'id="([^"]*)"', lambda m: f'id="{did}-{m.group(1)}"', body)

def bare_tables(body):  # "| | |" tables have an empty header row
    return re.sub(r"<thead>\s*<tr>(\s*<th[^>]*>\s*</th>)+\s*</tr>\s*</thead>", "", body)

def page_numbers():  # first page of each doc, read from the outline of the previous build
    if "--pages" not in sys.argv:
        return {}
    import fitz
    tops = [t[2] for t in fitz.open(PDF).get_toc() if t[0] == 1][1:]  # [0] is the cover
    assert len(tops) == len(DOCS), "outline does not match the doc list"
    return {p: n for (p, _), n in zip(DOCS, tops)}

def mermaid(body):
    return re.sub(r'<pre><code class="language-mermaid">(.*?)</code></pre>',
                  lambda m: f'<pre class="mermaid">{m.group(1)}</pre>', body, flags=re.S)

parts, toc, pages = [], [], page_numbers()
for path, part in DOCS:
    did = IDS[path]
    src = open(os.path.join(ROOT, path), encoding="utf-8").read()
    md = markdown.Markdown(extensions=["tables", "fenced_code", "toc", "sane_lists"],
                           extension_configs={"toc": {"slugify": slug}})
    body = bare_tables(mermaid(fix_links(md.convert(src), path, did)))
    title = re.search(r"^#\s+(.+)$", src, re.M).group(1)
    if part:
        toc.append(f'<li class="part">{html.escape(part)}</li>')
    toc.append(f'<li><a href="#{did}">{html.escape(re.sub(r"[`*]", "", title))}<small>{path}</small></a><b>{pages.get(path, "")}</b></li>')
    parts.append(f'<section class="doc" id="{did}"><div class="src">{path}</div>{body}</section>')

commit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
today = datetime.date.today().strftime("%-d %B %Y") if os.name != "nt" else datetime.date.today().strftime("%#d %B %Y")
css = open(os.path.join(os.path.dirname(__file__), "book.css"), encoding="utf-8").read()
out = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ChainBrain technical documentation</title><style>{css}</style></head><body>
<section class="cover">
  <div class="kicker">FinTechathon 2026 · International AI Track · Topic F (Agent Wallet)</div>
  <h1>链AI脑 ChainBrain</h1>
  <p class="tag">Give your AI a pocket, not your wallet.</p>
  <p class="what">Technical documentation: architecture, smart contracts, wallet server, AI brain, security and red-team results, frontends, chain, deployment, testing, configuration and on-chain evidence.</p>
  <div class="meta">Compiled {today} from <code>main</code> at commit <code>{commit}</code><br>Runs on FISCO BCOS 3.16.4 with Mock e-HKD, a demo token shown as HK$. It is not the HKMA e-HKD and not money.<br>Source: {REPO.replace('/blob/main/', '')}</div>
</section>
<section class="toc"><h2>Contents</h2><ol>{''.join(toc)}</ol></section>
{''.join(parts)}
<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>
</body></html>"""
dst = os.path.join(os.path.dirname(__file__), "book.html")
open(dst, "w", encoding="utf-8").write(out)
print(dst)
