# Cookie Monster Chrome Extension

This folder contains the unpacked Chrome extension for Cookie Monster.

## Load locally

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this `extension/` directory

## Current workflow

### 1. Scan

- The extension reads cookies locally through `chrome.cookies.getAll`
- Every cookie is classified into a category:
  - `essential`
  - `functional`
  - `analytics`
  - `advertising`
  - `unknown`
- Every cookie also gets:
  - risk level
  - reasoning hints
  - cleanup preset membership

### 2. Build feed presets

The scan turns into monster-ready cleanup batches:

- `balanced`: low-regret starter cleanup
- `expired`: already expired cookies
- `highRisk`: strongest risk signals
- `trackers`: analytics + advertising cookies
- `longLived`: persistent non-essential cookies

These presets are safe for the website to preview because they contain only sanitized summary data.

### 3. Website bridge

The website can:

- ping the extension
- fetch the latest sanitized summary report
- fetch feed/cleanup preview data
- fetch redacted cookie metadata for local inspection
- request a cookie feed preset or selected-cookie review

The website cannot directly delete cookies. A website request creates a pending feed request that must be confirmed locally inside the extension dashboard.

### 4. Execute cleanup

When a preset is confirmed:

- matching cookies are re-evaluated from the live browser state
- matching cookies are removed
- successfully removed cookies are backed up locally first
- a new summary report is generated immediately

### 5. Restore / export

- Every cleanup creates a recycle-bin batch
- The latest batch can be restored
- `report.json` exports the sanitized summary
- `backup.json` exports raw restore data and should stay on a trusted device

## Companion website bridge

- Stable extension ID baked into the manifest: `fkgahfgnfpnmnkbamedpjkeciljakheb`
- Website communication now runs through a local page/content-script bridge inside the browser
- The companion site no longer depends on `externally_connectable` origin allowlists

If you change the manifest `key`, the extension ID will also change and the website bridge should be updated through `NEXT_PUBLIC_EXTENSION_ID`.
