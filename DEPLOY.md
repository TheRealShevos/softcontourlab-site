# Deploying softcontourlab.me

Static site, no build step. GitHub Pages serves the repository root of `main`. `CNAME` already contains
`softcontourlab.me`, and `.nojekyll` stops Jekyll from processing the files.

## 0. Where things stand (measured 23 Sep 2026)

| Check | Result | Meaning |
|---|---|---|
| `dig softcontourlab.me A` | 185.199.108–111.153 (all four) | Apex already points at GitHub Pages ✅ |
| `dig www.softcontourlab.me` | CNAME → `softcontourlab.me.` | Works, but GitHub recommends `<user>.github.io` (step 4) |
| `dig softcontourlab.me AAAA` | none | Optional IPv6, add in step 4 |
| `dig softcontourlab.me MX` | `eforward1–5.registrar-servers.com` + SPF TXT | Namecheap email forwarding is switched on; **delivery not yet tested** |
| `curl http://softcontourlab.me` | GitHub **"Site not found" (404)** | **No GitHub repo has claimed the domain yet.** This is the blocker |
| TLS on `https://softcontourlab.me` | presents `*.github.io` cert | HTTPS cert is issued only after step 3 |

**So DNS is basically done. What's left is on the GitHub side (steps 1–3).**

## 1. Put the repo on github.com

GitHub Pages with a custom domain needs a repo on **github.com**. A GitHub Enterprise instance or
the Cursor origin can't serve a public custom domain. On a free account the repo must be **public**;
Pages from a private repo needs GitHub Pro.

```bash
cd ~/cs24/softcontourlab-site
gh repo create softcontourlab-site --public --source . --remote github --push
```

If the Cursor origin is your canonical remote, push there as well:

```bash
git remote add origin https://origin.cursor.com/git/shevaan/tmp-48dec6b8b06af401.git
git push origin main
```

## 2. Turn on Pages

Repo → **Settings → Pages**

1. **Source:** Deploy from a branch → `main` → `/ (root)` → Save.
2. **Custom domain:** `softcontourlab.me` → Save. It should already be filled in from `CNAME`.
3. Wait for the DNS check to show a green tick.

## 3. HTTPS

Once the DNS check passes, tick **Enforce HTTPS**. GitHub issues a Let's Encrypt certificate.
This usually takes minutes, but can take up to 24 h. The checkbox stays greyed out until the
certificate exists.

## 4. Namecheap tidy-up (Domain List → Manage → Advanced DNS)

Keep the four existing `A @` records. Then:

| Type | Host | Value | Why |
|---|---|---|---|
| CNAME | `www` | `<your-github-username>.github.io.` | Replace the current `softcontourlab.me.` target so GitHub can redirect www → apex and cover it with the certificate |
| AAAA | `@` | `2606:50c0:8000::153` | IPv6 (optional) |
| AAAA | `@` | `2606:50c0:8001::153` | |
| AAAA | `@` | `2606:50c0:8002::153` | |
| AAAA | `@` | `2606:50c0:8003::153` | |

Delete any **URL Redirect Record** or parking-page record for `@` or `www` if one exists; it will
shadow the A records. Leave the MX and SPF (`v=spf1 include:spf.efwd.registrar-servers.com ~all`)
records alone, because email forwarding needs them.

**Recommended: verify the domain** so nobody else can attach it to their Pages site.
Go to github.com → your avatar → **Settings → Pages → Add a verified domain** → `softcontourlab.me`.
GitHub gives you a TXT record (`_github-pages-challenge-<username>`). Add it in Namecheap as
`TXT` with host `_github-pages-challenge-<username>`, then click Verify.

## 5. Check it's live

```bash
dig +short softcontourlab.me A
dig +short www.softcontourlab.me
curl -sI https://softcontourlab.me | head -3
curl -sI https://www.softcontourlab.me | head -3
curl -s -o /dev/null -w "%{http_code}\n" https://softcontourlab.me/research.html
```

Expect `HTTP/2 200` for the apex, a `301` from www to the apex, and `200` for each page.

## 6. shevaan@softcontourlab.me (do this before go-live)

The site lists `shevaan@softcontourlab.me`. The MX records show Namecheap's free forwarding is
switched on, but an address only works once its alias exists:

1. Namecheap → Domain List → Manage → **Email Forwarding** (Mail Settings must say *Email Forwarding*).
2. Add alias `shevaan` → your real inbox. Optionally add a catch-all so misspellings still arrive.
3. **Test it:** from a different account, send an email to `shevaan@softcontourlab.me` and confirm
   it arrives. Check spam too.

Forwarding is receive-only. To reply *from* shevaan@ you need a mailbox (for example Zoho Mail's
free plan, or Google Workspace). Heads-up: Google's startup program excludes some Workspace benefits
if the domain was put on a paid Workspace plan within 31 days of applying.

## Troubleshooting

- **Still "Site not found" after step 2:** confirm Settings → Pages shows the custom domain and a
  finished deployment (Actions tab → *pages build and deployment*).
- **"Domain's DNS record could not be retrieved":** wait a few minutes and click *Check again*.
  Namecheap changes usually propagate within 30 minutes.
- **Enforce HTTPS greyed out:** the certificate is still being issued. Remove and re-add the custom
  domain to retry.
- **Custom domain vanished after a push:** make sure `CNAME` is still in the repo root.

## 7. Google for Startups Cloud Program, readiness

Checked against <https://cloud.google.com/startup/pre-funded> and <https://cloud.google.com/startup/benefits>
on 23 Sep 2026. Acceptance is at Google's discretion.

**Which tier:** *Start* (pre-funded) gives up to **US$2,000**. *Scale* gives up to US$200,000, or
**US$350,000 for AI-first startups**, but needs institutional/VC funding (pre-seed or seed within 5
years, Series A within 12 months). Angel, grant, prize and friends-and-family money don't qualify. The
"$5,000" on that page is a Scale *eligibility cap* (you must not have received more than $5,000 in
credits already), not an amount you receive.

| Start-tier requirement | Status |
|---|---|
| Publicly available company website | ⏳ Ready in this repo; live after steps 1–3 |
| Apply with a company email on the website's domain | ⏳ `shevaan@softcontourlab.me` after step 6 |
| Google Cloud billing account ID (18 characters) | ❓ Create one under the shevaan@ Google account |
| Founded within the last 24 months | ❓ Decide and record a founding date |
| No Google Cloud credits beyond the free trial | ❓ Check honestly for the company's account |
| Digital-native tech startup with a **working MVP** | ❌ The site's viewer is a concept. Build the MVP first |
| **Clear business model** | ✅ Per-scan pricing is on the home page (`#pricing`) |
| Plans to seek venture funding | Application answer |
| Not an educational institution, agency or consultancy | Apply as the startup |

`privacy.html` and `terms.html` are plain-English starting points, not legal advice. Have them
reviewed once the company is incorporated or starts handling user data.
