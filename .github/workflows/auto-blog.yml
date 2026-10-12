name: Auto Publish BTCBRAVE Blog

on:
  schedule:
    # Three scheduled rounds each UTC day, up to three articles per topic daily.
    - cron: "17 8,14,20 * * *"
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: btcbrave-blog-auto
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    outputs:
      changed: ${{ steps.commit.outputs.changed }}
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install dependencies
        run: python -m pip install requests beautifulsoup4
      - name: Generate original articles and Gemini illustrations
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GEMINI_IMAGE_MODEL: gemini-3.1-flash-image
        run: python auto_blog.py
      - name: Commit and push articles and illustrations
        id: commit
        shell: bash
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add -- posts.json
          if [ -d imgs/auto ]; then
            git add -- imgs/auto
          fi
          if git diff --cached --quiet; then
            echo "changed=false" >> "$GITHUB_OUTPUT"
            echo "No new or updated articles or images."
            exit 0
          fi
          git commit -m "Publish BTCBRAVE Blog articles and Gemini illustrations"
          git pull --rebase origin "${GITHUB_REF_NAME}"
          git push origin "HEAD:${GITHUB_REF_NAME}"
          echo "changed=true" >> "$GITHUB_OUTPUT"

  deploy:
    needs: publish
    if: needs.publish.outputs.changed == 'true'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Checkout updated content
        uses: actions/checkout@v4
        with:
          ref: main
      - name: Provide root entry if needed
        shell: bash
        run: |
          if [ ! -f index.html ] && [ ! -f index.md ] && [ ! -f README.md ]; then
            printf '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=https://news.btcbrave.store/"></head><body><a href="https://news.btcbrave.store/">BTCBRAVE News</a></body></html>\n' > index.html
          fi
      - name: Configure GitHub Pages
        uses: actions/configure-pages@v5
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: .
      - name: Deploy GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
