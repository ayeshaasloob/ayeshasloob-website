# Ayesha Asloob Qureshi: academic website

Personal academic website, built with [Jekyll](https://jekyllrb.com/) and published with GitHub Pages.

Live site: https://ayeshaasloob.github.io/ayeshasloob-website/

## How changes go live

```
feature/my-change  ──PR──▶  main  ──▶  live site
                     │
                     └─▶ preview at /pr-preview/pr-<number>/ (link posted on the PR)
```

1. Create a branch from `main`, make the change, open a pull request into `main`.
2. The **PR preview** workflow builds the site, checks for broken links, and posts a preview link on the PR.
   Preview pages show a "Preview build" banner and are hidden from search engines.
3. Review the preview. When the PR is merged, the **Deploy site** workflow publishes `main`, and the preview is removed.

## Where to edit things

| To change | Edit |
|---|---|
| Name, role, email, profile links, photo | `_data/profile.yml` |
| Bio, research interests, positions, education | `index.md` |
| Publications | `_data/publications.yml` |
| Students, postdocs, visitors | `_data/group.yml` |
| Grants and awards | `_data/grants.yml` |
| Invited talks | `_data/talks.yml` |
| Open positions, teaching, outreach, TÜBİTAK project | `positions.md`, `teaching.md`, `outreach.md`, `tubitak-1001.md` |
| Menu items | `_data/navigation.yml` |
| Colours, fonts, spacing | the settings at the top of `assets/css/main.css` |
| Page frame (header, footer) | `_layouts/` and `_includes/` |

### Adding a publication

Add an entry to `_data/publications.yml`. The publications page, the year groups, the counts and the BibTeX are generated from it.

```yaml
- status: published          # or: preprint, submitted
  authors: [First Author, Ayesha Asloob Qureshi]
  title: Title of the paper
  journal: Journal of Algebra
  volume: 700
  issue: 2
  pages: 1–20                # or article: "123456"
  year: 2026
  doi: 10.1016/j.jalgebra.2026.00.000
  arxiv: "2601.01234"        # optional, quote it so it stays text
```

When a preprint is published, change `status` to `published` and add the journal details.

### Adding a photo

Put the image at `assets/img/profile.jpg` (square, about 400×400 px) and set `photo: "/assets/img/profile.jpg"` in `_data/profile.yml`.

## Running locally

With Ruby 3.1 or later:

```sh
bundle install
bundle exec jekyll serve
# open http://localhost:4000/ayeshasloob-website/
```

The Ruby that ships with macOS is too old. If you do not want to install a newer one, use Docker:

```sh
docker run --rm -it -p 4000:4000 -v "$PWD":/site -w /site ruby:3.3 \
  bash -c "bundle config set --local path vendor/bundle && bundle install && bundle exec jekyll serve --host 0.0.0.0"
```

To run the same link check as CI:

```sh
bundle exec jekyll build
bundle exec htmlproofer ./_site --disable-external --no-enforce-https --swap-urls "^/ayeshasloob-website:"
```

## One-off GitHub setup

1. **Pages:** Settings → Pages → Source: *Deploy from a branch*, branch `gh-pages`, folder `/ (root)`.
   The `gh-pages` branch is created by the first workflow run.
2. **Actions permissions:** Settings → Actions → General → Workflow permissions: *Read and write permissions*.
3. **Protect `main`:** Settings → Branches (or Rules) → require a pull request and the *PR preview* check before merging.

Notes:

- Previews are public URLs, as GitHub Pages sites cannot be made private on standard plans. Do not put anything confidential in a PR.
- Pull requests from forks cannot publish previews, because they do not get write access to the repository.
- If a custom domain is added later, set `url` and `baseurl: ""` in `_config.yml` and add a `CNAME` file.
