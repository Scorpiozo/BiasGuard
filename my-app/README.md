# BiasGuard

BiasGuard is a machine-learning fairness and bias analysis platform.

It combines a Python data-analysis backend with a Next.js dashboard.

## Current backend capabilities

### Dataset handling

- CSV upload
- Dataset preview
- Dataset profiling
- Data types
- Missing-value analysis
- Duplicate-row detection
- Unique-value analysis
- Numerical statistics
- Categorical distributions

### Bias detection

BiasGuard currently analyses:

- Protected-group representation
- Representation imbalance
- Observed positive outcome rates
- Positive outcome rate gaps
- Disparate impact
- Missingness differences across protected groups
- Target-class imbalance
- Group-level outcome imbalance

The detector reports these as potential bias signals. A statistical disparity alone does not establish discriminatory intent or causality.

### Mitigation

Implemented methods:

1. Oversampling
2. Undersampling
3. Reweighting
4. SMOTE/SMOTENC

The original dataset is retained when a mitigation method is applied. A new dataset ID is generated for the mitigated result.

### Fairness evaluation

Implemented:

- Demographic parity
- Selection-rate gap
- Statistical parity difference
- Disparate impact
- Equal opportunity
- Equalized odds

### Performance evaluation

Implemented:

- Accuracy
- Precision
- Recall
- F1
- ROC-AUC

Performance evaluation requires a true-outcome column and prediction column.

## API

The backend exposes:

GET `/api/health`

POST `/api/upload`

GET `/api/datasets/{dataset_id}/profile`

GET `/api/datasets/{dataset_id}/preview`

POST `/api/detect`

POST `/api/fairness`

POST `/api/performance`

POST `/api/mitigate`

GET `/api/datasets/{dataset_id}/chart-data`

## Running the backend

From the `biasguard` directory:

```bash
pip install -r requirements.txt