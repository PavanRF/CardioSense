# CardioSense

Academic machine-learning prototype for heart disease prediction on the real **UCI Cleveland Heart Disease** dataset (303 records). Educational and research demonstration only — not a diagnosis.

## What's inside
- **Overview** — dataset and held-out test summaries, live cohort scoring.
- **Live prediction** — 13 validated inputs, instant re-scoring, server-verified analysis, plain-language explanation, model confidence vs clinical risk, feature impact, CSV report.
- **Model performance** — accuracy, precision, recall, F1, ROC-AUC, CV ROC-AUC, ROC curves and confusion matrices for Logistic Regression, Random Forest, Extra Trees and Gradient Boosting.
- **Dataset explorer** — filter/browse real records, load any into the predictor, feature codebook.
- English, Español, हिन्दी; light/dark mode.

## Retraining
```
pip install scikit-learn pandas
python3 scripts/train_model.py
bunx vitest run
```
The script uses a stratified 80/20 split (random_state 42) and writes `src/data/*.json`.

## Data citation
Janosi, A., Steinbrunn, W., Pfisterer, M., & Detrano, R. (1988). Heart Disease. UCI Machine Learning Repository. https://doi.org/10.24432/C52P4X (CC BY 4.0).
