# Project notes — Химический спринт

## Source of truth

- GitHub: https://github.com/alex1c/chemicalSprintGameRuStore
- Branch: `main`
- Remote Cursor workspace: `D:\PetProject\chemicalSprintGameRuStore`
- Local Codex/AVD workspace: `D:\petProject\chemicalSprintGameRuStore`

## Product constraint

From app launch to the first quiz question: **maximum 2 actions**.

## Chemistry classification strategy

Documented in `src/data/chemistry/types.ts` header comments.

Summary:

- Categories are normalized for gameplay (`alkali-metal` … `actinide`).
- Top-level classification is `metal` | `nonmetal` | `metalloid`.
- `group` is IUPAC 1–18, or `null` for f-block Ce–Lu / Th–Lr (quiz engine excludes `null` from `NAME_TO_GROUP`).
- Permanent IUPAC names only (Nh, Mc, Ts, Og — never Unun*).

## Signing

- No production keystore in this repository.
- Future signing material path: `D:\secure\android-signing\chemicalSprintGameRuStore\`
- Never commit secrets.

## Safe area

Architecture uses `SafeAreaProvider` + screen-level `SafeAreaView` edges including bottom.
Final bottom inset QA requires a **real device** (AVD is insufficient).
