# Remaining public exposure of the photographs — required cleanup

Moving the images out of `public/` stops **new** requests from being served
publicly. It does **not** remove copies that are already out there. This file
lists what is still exposed and exactly what to do about it.

Nothing in this list can be fixed by code in this branch. Each item needs an
action by the repository owner.

---

## Inventory of remaining exposure

### 1. Public Git history (highest priority)

`https://github.com/danieln5s/dnlvocatio-site` is a **public** repository. All
38 photographs were committed to `main` and remain fully downloadable from
history even though the working tree no longer contains them.

Commits that added or modified the photo folders:

| Commit | Message |
| --- | --- |
| `095bad2` | feat: added 4 hobby pages with pictures |
| `2a7113d` | feat: remove HDR from photos |
| `68ac186` | feat: add Reading page and quotes |
| `c5a8c9c` | feat: add scrolltotop and Google analytics |
| `6b5e22f` | chore: remove dead code and unused assets, add .gitignore |
| `5ee23c6` | Restructure site: Journal section, wedding entry, About consolidation |

Anyone can fetch any of these blobs, for example:

```
https://github.com/danieln5s/dnlvocatio-site/raw/5ee23c6/public/wedding/primephoto-539.JPG
```

These URLs keep working after a normal commit. They stop working only after the
blobs are removed from history *and* GitHub garbage-collects them.

### 2. Previous GitHub Pages deployments

Every build published by `.github/workflows/deploy.yml` uploaded the photographs
as a Pages artifact. Old deployments are retained in the repository's deployment
history and their artifacts may still be downloadable.

### 3. Live URLs that used to work

Until the new deploy goes out, `https://dnlvocatio.com/wedding/primephoto-24.JPG`
and its 37 siblings resolve normally. Anything that fetched them may have kept a
copy.

### 4. Third-party caches

- Google / Bing image indexes
- The Wayback Machine (`web.archive.org`)
- Social preview caches (anything the URLs were ever pasted into)
- GitHub's own raw/CDN caches

### 5. Forks and clones

Any fork or clone made before the cleanup contains the full history including
the photographs. These cannot be reached at all.

---

## Required cleanup steps

### Step 1 — Finish the migration first

Do not start this until `npm run photos:verify` passes and you have a backup of
`private-photos/` somewhere off this machine. History rewriting is destructive.

### Step 2 — Decide: rewrite history, or start a clean repository

**Option A — rewrite history (keeps the repo and its URL)**

```sh
# Back up first.
git clone --mirror https://github.com/danieln5s/dnlvocatio-site.git backup.git

pip install git-filter-repo     # or: brew install git-filter-repo

git clone https://github.com/danieln5s/dnlvocatio-site.git clean-clone
cd clean-clone
git filter-repo `
  --path public/wedding --path public/cycling --path public/fishing `
  --path public/reading --path public/running --path public/travel `
  --invert-paths

git remote add origin https://github.com/danieln5s/dnlvocatio-site.git
git push --force --all
git push --force --tags
```

This rewrites every commit SHA. Coordinate it: close or rebase open pull
requests first, and re-clone afterwards rather than pulling.

**Option B — make the repository private, or publish a fresh one**

Simpler and leaves nothing to chance. Either flip the repository to private
(Settings → General → Danger Zone), or create a new public repository from the
current tree with a single initial commit and archive the old one.

> This branch deliberately does not perform either option. Rewriting published
> history and changing repository visibility are out of scope for an automated
> change.

### Step 3 — Ask GitHub to garbage-collect

After a force-push, the old blobs stay reachable via their SHAs until GitHub
prunes them. Open a support request
(<https://support.github.com/contact>) asking for garbage collection on the
repository, and state that sensitive data was removed from history. Until they
confirm, assume the old URLs still work.

### Step 4 — Clear old deployments

In the repository, **Settings → Environments → github-pages**, and the
Deployments tab: delete historical deployments so their artifacts are no longer
retrievable. Re-deploy from the cleaned `main`.

### Step 5 — Request removal from third-party caches

- **Google**: Search Console → Removals → *Remove outdated content*, one request
  per image URL. Without Search Console, use
  <https://search.google.com/search-console/remove-outdated-content>.
- **Bing**: <https://www.bing.com/webmasters/contentremoval>
- **Wayback Machine**: email `info@archive.org` from an address at the site's
  domain, asking for exclusion of the image paths.
- Re-scrape social previews for any page whose link was shared.

### Step 6 — Verify

Once the above is done, confirm each of these returns 404 or an error:

```sh
curl -I https://dnlvocatio.com/wedding/primephoto-24.JPG
curl -I https://raw.githubusercontent.com/danieln5s/dnlvocatio-site/main/public/wedding/primephoto-24.JPG
curl -I https://github.com/danieln5s/dnlvocatio-site/raw/5ee23c6/public/wedding/primephoto-539.JPG
```

The last one is the real test. If it still returns `200`, history cleanup is not
finished.

---

## What is *not* affected

`public/favicon.ico` and `public/social.png` stay public on purpose. `social.png`
is the sheep brand graphic used for link previews, not a photograph, and the
favicon is an ordinary interface icon. Neither is in the protected inventory.

---

## Honest summary

| Exposure | Removed by this branch? |
| --- | --- |
| Images served from `dnlvocatio.com/<gallery>/…` after the next deploy | Yes |
| Images in the production build output (`dist/`) | Yes, and enforced by `npm run check:build` |
| Images in the repository working tree on `main` | Yes, once merged |
| **Images in public Git history** | **No — Step 2 required** |
| **Images in previous Pages deployments** | **No — Step 4 required** |
| **Images in search / archive / social caches** | **No — Step 5 required** |
| **Copies already downloaded, or in forks and clones** | **Never recoverable** |
