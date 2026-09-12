# Ads policy — РСЯ / Yandex Mobile Ads (Phase 10)

## Production IDs

| Role | ID |
| --- | --- |
| App ID | `063533b3-e38c-4d3d-af67-848018520f6d` |
| Home banner | `R-M-20034045-1` |
| Modes / Progress banner | `R-M-20034045-2` |
| Learning / Achievements banner | `R-M-20034045-3` |
| Interstitial | `R-M-20034045-4` |
| Rewarded | `R-M-20034045-5` |

Central config: `src/ads/config.ts`, `app.json` → `extra.ads`.

## Banners

Allowed only on calm screens (max one per screen):

- Home → unit -1
- Modes, Progress → unit -2
- Learn, Achievements → unit -3

Never on Game, Result, Onboarding, or active sprint flows.

## Interstitial

- After Result CTA only (user already saw score)
- Not before first question / during onboarding
- `firstEligibleAfterGames = 3`
- `gamesBetweenInterstitial = 4`
- `maxPerAppSession = 1`
- Eligible modes: Classic, Mixed, Timed, No Mistake, Weak
- Excluded: Daily, Element Training, aborted sessions
- Failure / missing fill → navigate immediately

## Rewarded

- User-initiated only (+10 ⚛)
- Max 3 completions / local calendar day (30 ⚛)
- Grant only on confirmed reward callback (exactly once)
- Offline / unavailable → CTA shows unavailable, game continues

## Offline

Ads never block gameplay. Without network the app remains fully playable.
