# Evaluation: Bonded vs LLM-only

Not run yet on live data. Run:

```bash
QLOO_API_KEY=... ANTHROPIC_API_KEY=... npm run eval
```

Or run the **Warm Qloo cache & run evaluation** GitHub workflow. Either one overwrites this file with the results table and writes `data/eval-results.json`, which the `/evaluation` page displays.

The gold set has 20 hand-written synthetic pairs, 10 obviously compatible and 10 obviously not, defined in `src/lib/eval/goldset.ts`. Labels were written before any engine run.

Metrics:

- **Separation (ROC AUC):** the share of (compatible, incompatible) pairs where the compatible pair scores higher. 50% is chance.
- **Accuracy:** the share of pairs on the correct side of a score of 50.
