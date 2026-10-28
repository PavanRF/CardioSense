# CardioSense roadmap

- [x] Train real model on UCI Cleveland dataset (scripts/train_model.py)
- [x] App shell, overview, live prediction, performance, dataset explorer, EN/ES/HI, dark mode
- [x] Prediction flow: validation, loading/error states, disclaimer, plain-language, confidence vs clinical risk
- [ ] Bulk CSV screening: template, drag-drop upload (5MB), per-row validation, server scoring with real progress, KPIs, histogram, searchable paginated table, scored CSV + error log downloads
- [ ] Sign-in: Lovable Cloud email/password, profiles (name, from the brief's registration form), sign-up, login, forgot/reset password, protected app pages + protected server functions, settings page, sign-out
- [ ] Use the user's own joblib model — blocked: needs heart_disease_pipeline.joblib and evaluation.json uploaded
