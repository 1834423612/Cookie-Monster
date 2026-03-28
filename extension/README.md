# Cookie Monster Chrome Extension

This folder contains the unpacked Chrome extension for Cookie Monster.

## Load locally

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this `extension/` directory

## What it does

- scans browser cookies locally with `chrome.cookies`
- computes a sanitized `report.json` summary for charts
- deletes high-risk or expired cookies after backing them up locally
- restores the latest cleanup batch
- exports `report.json` and `backup.json`
- exposes a strict summary-only bridge to the companion website

## Companion website bridge

- Stable extension ID baked into the manifest: `fkgahfgnfpnmnkbamedpjkeciljakheb`
- Allowed dev origin: `http://localhost/*`
- Allowed production placeholders:
  - `https://cookie-monster.app/*`
  - `https://www.cookie-monster.app/*`
  - `https://cookie-monster.vercel.app/*`

If you change the manifest `key`, the extension ID will also change and the website bridge should be updated through `NEXT_PUBLIC_EXTENSION_ID`.
