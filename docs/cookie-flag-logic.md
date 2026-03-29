# Cookie Flagging and Risk Logic

This document explains how Cookie Monster decides which cookies are likely safe to keep, which ones deserve review, and which ones are stronger cleanup candidates.

## Important framing

Cookie Monster does **not** claim that a cookie is "malicious" in a security-forensics sense.

Instead, the extension uses a **local heuristic scoring model** to answer a more practical product question:

> "Which cookies are most likely low-regret cleanup candidates, and which ones are more likely to be important for login or core site behavior?"

So when the UI says a cookie is `high risk`, that means:

- it has strong tracking-like or unsafe attribute signals
- it is more likely to be cross-site, persistent, or non-essential
- it is a stronger candidate for review or deletion

It does **not** mean the cookie is definitely harmful or malicious.

## Where the logic lives

The main analysis pipeline is implemented in:

- [extension/background-core.js](e:/Programming/1A-Personal-Projects/Cookie-Monster/extension/background-core.js)
- especially the `analyzeCookie()` function in [extension/background-core.js](e:/Programming/1A-Personal-Projects/Cookie-Monster/extension/background-core.js#L261)

The structured report and shared types live in:

- [lib/cookie-report.ts](e:/Programming/1A-Personal-Projects/Cookie-Monster/lib/cookie-report.ts)

## Step 1: Category detection

Each cookie is first assigned a rough category by checking the cookie name and domain against keyword buckets.

Current keyword buckets:

- `essential`: `session`, `auth`, `csrf`, `xsrf`, `sid`, `token`, `login`, `__host-`, `__secure-`
- `functional`: `lang`, `locale`, `theme`, `prefs`, `cart`, `remember`, `currency`, `recent`
- `analytics`: `_ga`, `_gid`, `_gat`, `analytics`, `segment`, `mixpanel`, `amplitude`, `plausible`
- `advertising`: `ad`, `ads`, `doubleclick`, `fbp`, `fr`, `ttclid`, `gcl`, `campaign`, `pixel`

If no keyword matches, the cookie is classified as `unknown`.

This is intentionally heuristic. It is designed to be understandable and fast, not perfect.

## Step 2: Risk scoring

After categorization, Cookie Monster calculates a numeric score. The higher the score, the stronger the cleanup signal.

### Positive scoring signals

These signals increase the score:

- `+5` if the cookie is already expired
- `+4` if it looks like an advertising or tracker cookie
- `+2` if it looks like an analytics cookie
- `+1` if it is **not** marked `Secure`
- `+1` if it is **not** marked `HttpOnly`
- `+2` if `SameSite=None` is used
- `+1` if it persists for longer than 30 days

### Negative scoring signal

This signal decreases the score:

- `-3` if the cookie looks like an **essential secure session cookie**

That "recommended keep" pattern is:

- category is `essential`
- `session === true`
- `secure === true`

When this pattern is matched, the extension also clears any cleanup presets that might otherwise have been attached.

## Step 3: Mapping score to risk level

After scoring, the cookie is mapped into a simple 3-level risk label:

- `high` if score `>= 5`
- `medium` if score `>= 2` and `< 5`
- `low` if score `< 2`

This is why some cookies become `high risk` even if they are not advertising cookies. For example, a cookie can accumulate score through:

- long persistence
- weak security flags
- cross-site behavior
- expired status

## Step 4: Human-readable reasons

The UI does not only show the final risk label. It also stores short reason strings so the user can understand *why* a cookie was flagged.

Examples of reasons include:

- `Already expired`
- `Matches advertising or tracker signature`
- `Matches analytics signature`
- `Not marked Secure`
- `Readable by client-side scripts`
- `SameSite=None allows cross-site usage`
- `Persists for longer than 30 days`
- `Looks like an essential secure session cookie`
- `Domain is protected`

Only the first few reasons are kept for display, so the list stays readable.

## Step 5: Cleanup preset assignment

Cookie Monster also assigns cookies into practical cleanup presets. These are not separate classifiers; they are derived from the same analysis signals.

### `expired`

Assigned when:

- the cookie is already expired
- and the domain is not marked as protected

Why it exists:

- expired cookies are usually the lowest-regret cleanup target

### `trackers`

Assigned when:

- category is `advertising` or `analytics`
- and the domain is not protected

Why it exists:

- tracking and analytics cookies are often the clearest non-essential cleanup candidates

### `longLived`

Assigned when:

- the cookie lasts longer than 30 days
- it is not on a protected domain
- it is not categorized as `essential`
- it is not a session cookie

Why it exists:

- long-lived persistent cookies often represent ongoing tracking or durable user profiling

### `highRisk`

Assigned when:

- final risk level is `high`
- the domain is not protected
- the cookie is not categorized as `essential`

Why it exists:

- this preset collects the strongest overall cleanup signals in one place

### `balanced`

Assigned as a broader "starter bundle" whenever a cookie qualifies for one of the safer cleanup groups above.

Why it exists:

- it gives the user a practical low-regret batch instead of forcing them to manually combine multiple criteria

## Protected domains

Protected domains override deletion intent, not analysis visibility.

If a domain is marked as protected:

- the cookie can still be analyzed
- reasons can still be shown
- but cleanup presets are generally not added

This is important because the extension should still explain risk signals without aggressively recommending deletion on domains the user has explicitly protected.

## Why some cookies are marked "keep"

The UI uses a separate `recommendedKeep` concept for cookies that look especially likely to be important for core functionality.

That recommendation is currently based on this pattern:

- category is `essential`
- cookie is a session cookie
- cookie is `Secure`

This usually captures cookies that resemble:

- login sessions
- auth/session tokens
- site integrity or security-related state

These are the cookies the UI is most cautious around.

## Why these signals were chosen

The model favors signals that are easy to explain to users and align with practical cleanup decisions:

- **Expired cookies** are usually easy wins.
- **Advertising and analytics signatures** often correlate with tracking or marketing behavior.
- **Long-lived cookies** are more likely to support persistent profiling.
- **Missing `Secure` or `HttpOnly`** makes a cookie less defensive from a browser-security perspective.
- **`SameSite=None`** is a useful signal for cross-site usage, which often matters for tracking workflows.
- **Essential secure session cookies** deserve caution because deleting them is more likely to log the user out or break core flows.

## What this system does not do

The model is intentionally simple. It does **not** currently:

- inspect the actual cookie value contents for secrets or PII patterns
- verify the server-side purpose of a cookie
- understand every site-specific auth flow
- detect legal compliance status
- prove that a cookie is a tracker or harmless with absolute certainty

So the output should be understood as:

- a strong local heuristic
- a prioritization and cleanup assistant
- not a forensic or legal truth engine

## Short product-safe explanation

If you need a concise English explanation for UI copy, docs, or investor/demo use, this version is safe:

> Cookie Monster uses a local heuristic model to classify cookies by likely purpose and cleanup risk. It looks at signals such as cookie name/domain patterns, expiration state, persistence length, `Secure`, `HttpOnly`, and `SameSite` attributes. Advertising, analytics, expired, cross-site, and long-lived cookies score higher and are more likely to be flagged for review or deletion. Essential secure session cookies score lower and are treated as safer to keep. The goal is not to label cookies as malicious, but to help users identify lower-regret cleanup candidates inside their own browser.

## More detailed reusable explanation

> Cookie Monster analyzes each browser cookie locally and assigns it a category, a risk level, and optional cleanup presets. The classifier is heuristic-based rather than ML-based: it uses keyword matching on cookie names and domains to infer whether a cookie looks essential, functional, analytics-related, advertising-related, or unknown. It then applies a transparent scoring model. Expired cookies, advertising/tracker signatures, analytics patterns, missing `Secure`, missing `HttpOnly`, `SameSite=None`, and very long persistence all increase the score. Cookies that look like essential secure session cookies reduce the score and are treated more conservatively. The final score is mapped into `low`, `medium`, or `high` risk, and the UI also shows short human-readable reasons so users can understand the decision. These labels are intended to guide cleanup and prioritization, not to claim that a cookie is definitely malicious.

## Current limitations and future improvements

If you want to make this explanation even stronger later, useful upgrades would be:

- maintain a richer curated signature list for common auth vs. tracking cookies
- allow per-domain learning or user feedback to tune future recommendations
- treat partitioned cookies and first-party isolated storage with more nuance
- add more conservative handling for known app-critical cookies
- expose a confidence score separately from the cleanup score

