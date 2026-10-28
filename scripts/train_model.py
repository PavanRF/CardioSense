"""
CardioSense — reproducible training script.

Trains on the real UCI Cleveland Heart Disease dataset (303 records,
scripts/data/processed.cleveland.data) and writes three JSON artifacts used
by the web app:
  src/data/cleveland.json   — the dataset (UCI codebook, target binarized num>0)
  src/data/model.json       — the Logistic Regression pipeline parameters used by the live in-browser scorer
  src/data/evaluation.json  — held-out test metrics, ROC curves, confusion matrices, model comparison
  src/data/parity.json      — sklearn predict_proba fixtures used by the JS parity test

Run:  python3 scripts/train_model.py
"""
import json, os
import numpy as np, pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, roc_curve, confusion_matrix

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data")
COLS = ["age","sex","cp","trestbps","chol","fbs","restecg","thalach","exang","oldpeak","slope","ca","thal","num"]
NUMERIC = ["age","trestbps","chol","thalach","oldpeak","ca"]
BINARY = ["sex","fbs","exang"]
CATEG = ["cp","restecg","slope","thal"]
FEATURES = ["age","sex","cp","trestbps","chol","fbs","restecg","thalach","exang","oldpeak","slope","ca","thal"]
SEED = 42

df = pd.read_csv(os.path.join(ROOT, "scripts", "data", "processed.cleveland.data"), header=None, names=COLS, na_values="?")
df["target"] = (df["num"] > 0).astype(int)
X, y = df[FEATURES], df["target"]

def make_pre():
    return ColumnTransformer([
        ("num", Pipeline([("imp", SimpleImputer(strategy="median")), ("sc", StandardScaler())]), NUMERIC),
        ("bin", SimpleImputer(strategy="most_frequent"), BINARY),
        ("cat", Pipeline([("imp", SimpleImputer(strategy="most_frequent")),
                          ("oh", OneHotEncoder(handle_unknown="ignore", sparse_output=False))]), CATEG),
    ])

models = {
    "Logistic Regression": LogisticRegression(max_iter=5000, C=1.0),
    "Random Forest": RandomForestClassifier(n_estimators=300, random_state=SEED),
    "Extra Trees": ExtraTreesClassifier(n_estimators=300, random_state=SEED),
    "Gradient Boosting": GradientBoostingClassifier(random_state=SEED),
}
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=SEED)
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)

results, fitted = [], {}
for name, est in models.items():
    pipe = Pipeline([("pre", make_pre()), ("clf", est)])
    cv_auc = cross_val_score(pipe, Xtr, ytr, cv=cv, scoring="roc_auc")
    pipe.fit(Xtr, ytr)
    fitted[name] = pipe
    p = pipe.predict_proba(Xte)[:, 1]
    yhat = (p >= 0.5).astype(int)
    fpr, tpr, thr = roc_curve(yte, p)
    tn, fp, fn, tp = confusion_matrix(yte, yhat).ravel()
    results.append({
        "name": name,
        "accuracy": accuracy_score(yte, yhat), "precision": precision_score(yte, yhat),
        "recall": recall_score(yte, yhat), "f1": f1_score(yte, yhat), "roc_auc": roc_auc_score(yte, p),
        "cv_roc_auc_mean": float(cv_auc.mean()), "cv_roc_auc_std": float(cv_auc.std()),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "roc_curve": [{"fpr": float(a), "tpr": float(b)} for a, b in zip(fpr, tpr)],
    })

LIVE = "Logistic Regression"
lr = fitted[LIVE]
pre, clf = lr.named_steps["pre"], lr.named_steps["clf"]
num_imp, num_sc = pre.named_transformers_["num"].named_steps["imp"], pre.named_transformers_["num"].named_steps["sc"]
bin_imp = pre.named_transformers_["bin"]
cat_imp, cat_oh = pre.named_transformers_["cat"].named_steps["imp"], pre.named_transformers_["cat"].named_steps["oh"]
coef = clf.coef_[0].tolist()
i = 0
model = {"name": LIVE, "source": "scikit-learn " + __import__("sklearn").__version__, "intercept": float(clf.intercept_[0]),
         "numeric": [], "binary": [], "categorical": []}
for j, f in enumerate(NUMERIC):
    model["numeric"].append({"feature": f, "median": float(num_imp.statistics_[j]), "mean": float(num_sc.mean_[j]), "scale": float(num_sc.scale_[j]), "coef": coef[i]}); i += 1
for j, f in enumerate(BINARY):
    model["binary"].append({"feature": f, "mode": float(bin_imp.statistics_[j]), "coef": coef[i]}); i += 1
for j, f in enumerate(CATEG):
    cats = cat_oh.categories_[j].tolist()
    model["categorical"].append({"feature": f, "mode": float(cat_imp.statistics_[j]), "levels": [{"value": float(c), "coef": coef[i + k]} for k, c in enumerate(cats)]}); i += len(cats)
assert i == len(coef)

ev = {
    "dataset": {"name": "UCI Heart Disease — Cleveland (processed.cleveland.data)", "url": "https://archive.ics.uci.edu/dataset/45/heart+disease",
                "rows": int(len(df)), "features": len(FEATURES), "positive": int(y.sum()), "negative": int((1 - y).sum()),
                "missing": {c: int(df[c].isna().sum()) for c in FEATURES if df[c].isna().sum() > 0}},
    "split": {"test_size": 0.2, "stratified": True, "random_state": SEED, "train_rows": int(len(Xtr)), "test_rows": int(len(Xte))},
    "live_model": LIVE,
    "best_by_test_roc_auc": max(results, key=lambda r: r["roc_auc"])["name"],
    "models": results,
}
rows = []
for idx, r in df.iterrows():
    rows.append({"id": int(idx) + 1, **{f: (None if pd.isna(r[f]) else float(r[f])) for f in FEATURES}, "num": int(r["num"]), "target": int(r["target"]),
                 "split": "test" if idx in Xte.index else "train"})
parity = [{"input": {f: (None if pd.isna(X.loc[k, f]) else float(X.loc[k, f])) for f in FEATURES}, "proba": float(lr.predict_proba(X.loc[[k]])[0, 1])} for k in list(X.index[:10]) + list(X.index[X.isna().any(axis=1)])]

def dump(name, obj):
    with open(os.path.join(OUT, name), "w") as fh: json.dump(obj, fh, indent=1 if name != "cleveland.json" else None)
dump("cleveland.json", rows); dump("model.json", model); dump("evaluation.json", ev); dump("parity.json", parity)
for r in results: print(f"{r['name']:22s} acc={r['accuracy']:.3f} auc={r['roc_auc']:.3f} cv={r['cv_roc_auc_mean']:.3f}")
