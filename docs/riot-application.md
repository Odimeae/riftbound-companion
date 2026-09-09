# Riot Developer Portal — Application Materials

**Product name:** Riftbound Companion  
**Applicant use:** Personal / local-only companion app  
**Platform:** iOS via Expo (Expo Go / personal build)  
**Distribution:** Personal use only (not App Store / not public distribution)

Use the sections below when filling the Riot Developer Portal product registration form. Adjust field labels to match the portal UI if they differ slightly.

---

## Short description (product summary)

Riftbound Companion is a **personal, local-only** companion for the Riftbound TCG. It helps me journal paper/in-person matches and manage sideboard plans and deck notes on my iPhone. It is **not** a digital client, simulator, or online play tool.

Planned Riot API use is limited to **official card metadata and card art** so I can pick and display cards correctly inside my private journal and sideboard UI. All match and sideboard data stays on the device.

---

## Detailed product description

Riftbound Companion is a mobile companion I built for myself to support **paper / tabletop** Riftbound play:

1. **Match journal** — Log Best-of-1 / Best-of-3 results, decks/legends, notes, and tags (e.g. Mulligan, Sideboard). Review recent matches and simple win-rate stats on a Home feed.
2. **Sideboard / deck manager** — Keep a 10-card sideboard per deck, create matchup plans (OUT → IN swaps), log actual swaps for Games 2/3, and compare plan vs actual after a match.

**What it is not**

- Not a digital game client, rules engine, or playable simulator  
- Not a live mid-game coach, scanner, or price tool  
- Not a public metagame site, ladder, or content platform  
- No accounts, no backend, no cloud sync for match data  
- No monetization, ads, subscriptions, or in-app purchases  

**Data & privacy**

Match logs and sideboards are stored **on-device only** (AsyncStorage). There is no user account system and no public sharing of match or metagame data.

**Riot assets**

Today, deck/card fields are free text. Once API access is approved, the app will use the **official Riot API** for card lists and card art so pickers and slots can show official assets. Assets will be attributed appropriately (including a Settings / Legal note). Unofficial scraped or redistributed Riot asset packs are not used.

---

## Intended Riot API usage

| Need | Purpose |
|------|---------|
| Card catalog / identifiers | Populate sideboard slots and card pickers with official card names/IDs |
| Card art / imagery | Display official art in sideboard and match-related UI |

No gameplay endpoints, no competitive ranking APIs, and no bulk redistribution of assets beyond what the companion displays for personal use.

---

## Platform & distribution answers (checklist)

| Question | Answer |
|----------|--------|
| Product type | Personal companion / utility (match journal + sideboard manager) |
| Platforms | iOS (Expo) |
| Distribution | Personal only — run via Expo Go or a personal build; not publicly listed |
| Monetization | None |
| Digital client / playable game? | No |
| Public metagame / community content? | No |
| User accounts / cloud? | No — local-only |
| Audience | Myself (personal use) |

---

## Compliance commitments

- Follow Riot’s developer terms, brand guidelines, and asset usage rules.  
- Credit Riot Games and Riftbound; the app is unofficial and not endorsed by Riot.  
- Do not imply official status.  
- Do not monetize Riot assets or the companion.  
- Do not ship a digital client or unauthorized game functionality.  
- Keep Settings attribution (Legal Jibber Jabber / required legal line) visible to the user.

---

## Suggested one-liner for the portal

> Personal local-only iOS (Expo) companion for Riftbound: match journal and sideboard/deck manager. Plans to use the official Riot API for card art only. No digital client, no monetization, no public metagame; personal distribution only.
