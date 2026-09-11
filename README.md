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

## Security / signing

Production keystore is created **only by the user** on a local PC during the release phase.

Signing files must live **outside** the repo:

`D:\secure\android-signing\chemicalSprintGameRuStore\`

Never commit credentials, keystores, or passwords.

## Release QA rule

**Bottom safe area must be verified on a real Android device; AVD is not a sufficient final check.**

## License

Private ForestMusic project unless otherwise stated.
