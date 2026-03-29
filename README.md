# Cookie-Monster

2026 KHE Project

## Inspiration

Browser cookies are a privacy minefield. While some are essential for keeping you logged in, others quietly track your behavior across the web. Most built-in browser tools offer a nuclear option: clear everything and log yourself out of every website, or clear nothing and let the trackers thrive. We wanted to build a fun, visual, and intelligent tool that could automatically distinguish the "good" cookies from the "bad" ones, giving users their privacy back without breaking their browsing experience. Plus, who better to eat your unwanted cookies than a Cookie Monster?

## What it does

Cookie Monster is a smart Chrome extension and interactive web dashboard that analyzes, categorizes, and safely clears your browser cookies. Intelligent Scoring: It scans your cookies and assigns them a risk level (High Risk, Watch, or Keep) based on security flags, expiration dates, and tracking signatures. Targeted Cleanup: Instead of clearing everything, it offers an ability to clear only the cookies that are useless bloat or potentially malicious. Safety Net (Recycle Bin): If you accidentally delete an essential cookie and a website breaks, Cookie Monster backs up your deleted batches. You can restore them with a single click right from the extension popup. Interactive Dashboard: A connected Next.js web dashboard that provides a rich visual interface to filter cookies by domain, flag individual trackers, and watch the Cookie Monster literally "eat" your selected cookies.

## How we built it

We split the project into two main environments: the Chrome Extension and a Next.js Web Application. To make the web app and extension talk to each other, we created page-bridge.js. It uses window.postMessage and chrome.runtime.sendMessage to seamlessly sync state. When you flag cookies on the website, it sends a payload to the extension to execute the deletion and updates the UI in real time.

## Challenges we ran into

Browsers don't natively tell you what a cookie does. We solved this by mapping common cookie name signatures to categories (essential, functional, analytics, advertising) and combining that with a risk point system. Some cookies are also encrypted so it is impossible to understand what those cookies do.

## Accomplishments that we're proud of

The Recycle Bin Feature: The ability to undo cookie deletions is incredibly rare in privacy tools. We are really proud of how smoothly the batch restoration works.

Selective Deletion: We are really proud of the ability to delete only cookies that are harmful or useless.

Animation Polish: We are really proud of our animations that add a little touch of personality to our extension. We created cookie monster animations and cookie jars and cookies that make the user experience very interesting!

## What we learned

Deep-dived into the Chrome Extension Manifest V3 architecture, specifically how service workers operate and handle cross-origin messaging. Gained a thorough understanding of web security fundamentals by analyzing cookie attributes like HttpOnly, SameSite (Strict vs. Lax vs. None), and HostOnly flags. Learned how to effectively bridge communication between an isolated React application and a browser extension's background script.

## What's next for Cookie Monster

AI-Powered Categorization: Moving beyond static keyword lists to use a lightweight machine learning model to better classify obscure cookies. Cross-Browser Support: Porting the extension to Firefox and Safari. Auto-Diet Mode: A feature that runs silently in the background, automatically eating trackers and expired crumbs every 24 hours without user intervention.
