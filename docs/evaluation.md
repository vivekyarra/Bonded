# Evaluation: Bonded vs LLM-only

Run 2026-10-30T15:45:28.202Z · Qloo live · baseline model gemini-3.8-flash

Twenty hand-labelled pairs (`src/lib/eval/goldset.ts`): ten obviously compatible, ten obviously not. Labels were written before any engine run.

- **Separation** = share of (compatible, incompatible) pairs where the compatible pair scored higher (ROC AUC; 50% = chance).
- **Accuracy** = share of pairs on the right side of a score of 50.

| | Separation | Accuracy |
|---|---|---|
| Bonded (Qloo taste graph) | 94% | 85% |
| LLM-only (raw favourites) | — | — |

| Pair | Label | Bonded | LLM-only |
|---|---|---|---|
| g01 Ranchera grandmother, regional-Mexican caregiver | compatible | 64 | — |
| g02 Jazz era vs modern vocal jazz | compatible | 72 | — |
| g03 Outlaw country across generations | compatible | 73 | — |
| g04 Soul then and now | compatible | 39 | — |
| g05 Crooners | compatible | 94 | — |
| g06 Cooking television | compatible | 58 | — |
| g07 Cosy mysteries | compatible | 31 | — |
| g08 Classic and modern country women | compatible | 97 | — |
| g09 Sixties rock and its heirs | compatible | 94 | — |
| g10 Musicals | compatible | 53 | — |
| g11 Lawrence Welk vs nu-metal | incompatible | 50 | — |
| g12 Westerns vs reality dating and EDM | incompatible | 25 | — |
| g13 Big band vs metal | incompatible | 43 | — |
| g14 Golden Girls vs prestige crime and drill | incompatible | 17 | — |
| g15 Ranchera vs EDM club | incompatible | 3 | — |
| g16 Jazz and Jeopardy vs metal and zombies | incompatible | 23 | — |
| g17 Little House vs club | incompatible | 18 | — |
| g18 Musicals vs action and metal | incompatible | 5 | — |
| g19 Antiques and crooners vs EDM | incompatible | 21 | — |
| g20 Classic Hollywood vs nu-metal | incompatible | 46 | — |
