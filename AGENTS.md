<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## CardioSense architecture rules

- The model is trained offline by `scripts/train_model.py` on the real UCI Cleveland file in `scripts/data/`; it writes `src/data/*.json`. Never hand-edit those JSON artifacts or show metrics not produced by that script — honesty about real data/metrics is a core requirement.
- `src/lib/model.ts` re-implements the fitted scikit-learn Logistic Regression pipeline; `src/test/model.test.ts` asserts parity with sklearn `predict_proba` (`src/data/parity.json`). Re-run the script and the test after any model change.
- Feature codes follow the original UCI codebook (cp 1–4, slope 1–3, thal 3/6/7) defined in `src/lib/features.ts`; a user-supplied joblib model with different encodings needs a mapping layer, not a codebook change.
- Live scoring runs in the browser for instant feedback; "verified analysis" goes through `src/lib/predict.functions.ts`, which re-validates with the shared zod schema in `src/lib/validation.ts`. Inputs are never logged or stored.
- UI text lives in `src/locales/{en,es,hi}.json` (flat keys) via `src/lib/i18n.tsx`; every key must exist in all three files (enforced by a test).
- Model output UI must keep "model confidence" (max(p, 1−p)) visually separate from "clinical risk", which the app never estimates; never introduce low/medium/high risk categories.
