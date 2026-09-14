# Химический спринт

Быстрая образовательная игра по таблице Менделеева для Android / RuStore.

## Paths

| Role | Path |
| --- | --- |
| Remote Cursor | `D:\PetProject\chemicalSprintGameRuStore` |
| Local Codex/AVD | `D:\petProject\chemicalSprintGameRuStore` |
| GitHub (source of truth) | https://github.com/alex1c/chemicalSprintGameRuStore |

## Product goal

**От запуска приложения до первого игрового вопроса — максимум 2 действия.**

## Stack

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript strict
- Android-first, portrait
- Jest + ESLint
- Local persistence (AsyncStorage), no server / Firebase

## Scripts

```bash
npm start
npm run android
npm test
npm run typecheck
npm run lint
```

## Architecture

- `src/data/chemistry` — local 118-element dataset
- `src/game` — pure quiz engine (no UI dependency)
- `src/storage` — versioned persistence foundation
- `src/navigation` + `src/screens` — screen shell for Home / Game / Modes / Progress / Learn / Achievements / Settings
- `src/theme` — centralized design tokens

- `src/ads` — Yandex Mobile Ads (banners / interstitial / rewarded)
- `src/analytics` — typed AppMetrica facade (activation waits for real API key)
- `docs/ADS_POLICY.md` — РСЯ IDs and ad policy
- `docs/privacy-policy-ru.md` — privacy draft for future GitHub Pages

## РСЯ (production)

| Role | ID |
| --- | --- |
| App ID | `063533b3-e38c-4d3d-af67-848018520f6d` |
| Home banner | `R-M-20034045-1` |
| Modes / Progress | `R-M-20034045-2` |
| Learning / Achievements | `R-M-20034045-3` |
| Interstitial | `R-M-20034045-4` |
| Rewarded (+10 ⚛, max 3/day) | `R-M-20034045-5` |

## Analytics — AppMetrica

- Package: `@appmetrica/react-native-analytics`
- Production API key configured in `src/analytics/config.ts`
- Typed facade: `src/analytics/`
- Plugin: `./plugins/withAppMetricaNoAdId` (excludes GAID identifiers module)

## Icon

- Master: `assets/icon_gpt.png` (single source of truth — see `docs/ICON_SOURCE.md`)
- Adaptive background: `#012564`

## Security / signing

Production keystore is created **only by the user** on a local PC during the release phase.

Signing files must live **outside** the repo:

`D:\secure\android-signing\chemicalSprintGameRuStore\`

Never commit credentials, keystores, or passwords.

## Release QA rule

**Bottom safe area must be verified on a real Android device; AVD is not a sufficient final check.**

## License

Private ForestMusic project unless otherwise stated.
