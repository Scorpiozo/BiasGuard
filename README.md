<div align="center">

# ⚖️ BiasGuard

### Find the bias in your data before it finds its way into your model.

BiasGuard scans a dataset the moment you upload it — no need to already know your
"target variable" — and surfaces representation gaps, outcome disparities, and
fairness metrics in plain language. Then it lets you train a small model to see
if the bias carries through, and mitigate it with one of four rebalancing
strategies.

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.5%2B-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white)](https://scikit-learn.org/)

</div>

<br/>

## 📚 Table of Contents

- [Why BiasGuard](#-why-biasguard)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [How It Works](#-how-it-works)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [Frontend Setup](#2-frontend-setup)
  - [Environment Variables](#environment-variables)
- [API Reference](#-api-reference)
- [Mitigation Methods](#-mitigation-methods)
- [Building for Production](#-building-for-production)
- [Troubleshooting](#-troubleshooting)
- [Scope & Limitations](#-scope--limitations)
- [Contributing](#-contributing)
- [License](#-license)

<br/>

## 🎯 Why BiasGuard

Most bias-auditing tools assume you already know your dataset has a binary
target and can confidently name your protected attribute. In practice, that's
often not true — you may not know your outcome column yet, and plenty of real
datasets have a multiclass or continuous outcome, or no outcome column at all.

BiasGuard flips the workflow: **upload first, scan automatically, decide
later.** Binary classification is treated as *one supported shape*, not a
prerequisite for using the tool.

<br/>

## ✨ Key Features

| | Feature | Description |
|---|---|---|
| 🔍 | **Automatic dataset scan** | Upload a CSV and BiasGuard immediately profiles every column — missingness, cardinality, likely outcome columns, likely protected-attribute columns — before asking you to configure anything. |
| 💡 | **Plain-language recommendations** | Findings are turned into sentences like *"'gender' looks like a protected attribute — it's split 82% / 18%"*, not just raw statistics. |
| 📊 | **Bias & representation detection** | Group representation, missingness-by-group, and outcome-by-group comparisons for binary, multiclass, and continuous outcomes alike. |
| ⚖️ | **Fairness metrics** | Demographic parity, equal opportunity, and equalized odds for binary outcomes, with disparate-impact ratios and interpreted gaps. |
| 🤖 | **Trained-model fairness check** | Trains a logistic-regression classifier on your data and evaluates whether *its own predictions* inherit the dataset's bias — a real, interpretable ML component, not just statistics. |
| 🛠️ | **Four mitigation strategies** | Oversampling, undersampling, reweighting, and SMOTE — each with a before/after comparison and a downloadable, rebalanced CSV. |
| 🌍 | **Works beyond binary outcomes** | Mitigation (minus SMOTE, which is mathematically binary-only) works with multiclass, continuous, or no outcome at all. |
| 📱 | **Responsive, themed UI** | A Next.js dashboard with light/dark mode and a layout that holds up from desktop down to narrow mobile screens. |

<br/>

## 🧰 Tech Stack

<table>
<tr>
<td valign="top" width="50%">

**Backend**
- Python 3 + [FastAPI](https://fastapi.tiangolo.com/)
- [pandas](https://pandas.pydata.org/) / [NumPy](https://numpy.org/) for data handling
- [scikit-learn](https://scikit-learn.org/) for the logistic-regression classifier
- [imbalanced-learn](https://imbalanced-learn.org/) for SMOTE
- [Pydantic](https://docs.pydantic.dev/) for request validation
- [Uvicorn](https://www.uvicorn.org/) as the ASGI server

</td>
<td valign="top" width="50%">

**Frontend**
- [Next.js 16](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Vercel Analytics](https://vercel.com/analytics)
- ESLint (`eslint-config-next`)

</td>
</tr>
</table>

<br/>

## 🧠 How It Works

```
 ┌──────────────┐      ┌───────────────┐      ┌────────────────────┐
 │ 1. Upload CSV│ ───► │ 2. Auto-scan  │ ───► │ 3. Pick what to     │
 │              │      │ (no config    │      │    investigate      │
 │              │      │  required)    │      │ (group + optional   │
 │              │      │               │      │  outcome)           │
 └──────────────┘      └───────────────┘      └─────────┬───────────┘
                                                          │
                       ┌──────────────────────────────────┼──────────────────────┐
                       ▼                                  ▼                      ▼
             ┌───────────────────┐          ┌─────────────────────────┐ ┌──────────────────┐
             │ 4. Bias detection │          │ 5. Fairness metrics +   │ │ 6. Mitigation     │
             │ (representation,  │          │    trained-model check  │ │ (oversample /     │
             │  missingness,     │          │    (binary outcomes)    │ │  undersample /     │
             │  outcome gaps)    │          │                          │ │  reweight / SMOTE) │
             └───────────────────┘          └─────────────────────────┘ └─────────┬─────────┘
                                                                                   ▼
                                                                      ┌─────────────────────────┐
                                                                      │ 7. Download the          │
                                                                      │    rebalanced dataset    │
                                                                      └─────────────────────────┘
```

The outcome column (if any) is classified into one of five shapes by
`utils/validation.py::infer_task_type()` — `binary_classification`,
`multiclass_classification`, `continuous`, `identifier`, or `unknown` — and
that classification decides which features are available:

| Outcome | Representation & missingness | Fairness metrics | Trained-model panel | Mitigation | SMOTE |
|---|:---:|:---:|:---:|:---:|:---:|
| None selected | ✅ | — | — | ✅ | — |
| Binary | ✅ | ✅ | ✅ | ✅ | ✅ |
| Multiclass | ✅ | — | — | ✅ | — |
| Continuous | ✅ | — | — | ✅ | — |

<br/>

## 🗂️ Project Structure

```text
biasguard/
├── api.py                      # FastAPI app — every HTTP endpoint lives here
├── requirements.txt
│
├── detector/                   # Scanning, profiling & recommendations
│   ├── scan.py                   # Heuristics: "does this column look like an outcome / group?"
│   ├── profiler.py               # Per-column profile (type, missingness, cardinality)
│   ├── representation.py         # Group sizes / representation stats
│   ├── imbalance.py              # Outcome imbalance within & across groups
│   ├── missingness.py            # Missing-value patterns by group
│   ├── outcome.py                # Multiclass / continuous outcome-vs-group comparisons
│   └── recommendations.py        # Turns findings into plain-language suggestions
│
├── evaluation/                 # Metrics
│   ├── fairness.py                # Demographic parity, equal opportunity, equalized odds
│   ├── performance.py             # Accuracy / precision / recall / F1 / ROC-AUC
│   ├── model.py                   # Trains & evaluates the logistic-regression classifier
│   └── comparison.py              # Before/after comparison used by mitigation
│
├── optimizer/                  # Mitigation strategies
│   ├── oversampling.py
│   ├── undersampling.py
│   ├── reweighting.py
│   ├── smote.py
│   └── optimizer.py               # BiasOptimizer — unified interface over the above
│
├── utils/
│   ├── validation.py              # Input validation, task-type inference
│   └── preprocessing.py           # Binary-label encoding helpers
│
├── visualization/
│   └── charts.py                  # Chart-data builders consumed by the frontend
│
└── my-app/                     # Next.js frontend
    ├── app/                        # Routes (landing page, layout)
    ├── components/
    │   ├── bias/                    # Dashboard, scan, detection, fairness, mitigation UI
    │   ├── landing/                 # Hero, feature grid, how-it-works
    │   ├── layout/                  # Navbar, Footer
    │   └── ui/                      # Button, Card, Badge, ThemeToggle
    ├── lib/api.ts                   # Typed API client for the backend
    └── .env.local.example
```

<br/>

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 18.18+** (required by Next.js 16)
- `pip` and `npm`

### 1. Backend Setup

```bash
cd biasguard

# (recommended) create a virtual environment
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# install dependencies
pip install -r requirements.txt

# run the API
uvicorn api:app --reload --port 8000
```

The API is now live at **http://127.0.0.1:8000**, with interactive docs at
**http://127.0.0.1:8000/docs** (FastAPI's built-in Swagger UI) and a health
check at `GET /api/health`.

### 2. Frontend Setup

```bash
cd biasguard/my-app

# install dependencies
npm install

# configure the API URL (see below)
cp .env.local.example .env.local

# run the dev server
npm run dev
```

Open **http://localhost:3000** in your browser.

### Environment Variables

The frontend reads a single environment variable, defined in
`my-app/.env.local.example`:

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `my-app/.env.local` | `http://127.0.0.1:8000` | Base URL the frontend uses to reach the FastAPI backend |

```bash
# my-app/.env.local
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

The backend has one optional environment variable:

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `ALLOWED_ORIGINS` | shell / process env | unset (falls back to a localhost-only dev policy) | Comma-separated list of origins allowed to call the API in production, e.g. `https://app.example.com,https://staging.example.com` |

No database, API keys, or secrets are required to run BiasGuard locally —
uploaded datasets are held in memory for the lifetime of the backend process.

<br/>

## 🔌 API Reference

All endpoints are served from the FastAPI app in `api.py`. Full interactive
docs are auto-generated at `/docs` once the backend is running.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/upload` | Upload a CSV, get back a `dataset_id` and a preview |
| `GET` | `/api/datasets/{dataset_id}/profile` | Per-column profile |
| `GET` | `/api/datasets/{dataset_id}/scan` | Automatic scan + plain-language recommendations |
| `GET` | `/api/datasets/{dataset_id}/preview` | Row preview |
| `GET` | `/api/datasets/{dataset_id}/download` | Download the (possibly mitigated) dataset as CSV |
| `POST` | `/api/detect` | Representation, missingness, and outcome-gap analysis for chosen group(s) |
| `POST` | `/api/fairness` | Demographic parity / equal opportunity / equalized odds (binary outcome) |
| `POST` | `/api/performance` | Accuracy, precision, recall, F1, ROC-AUC between a true and predicted column |
| `POST` | `/api/mitigate` | Apply a mitigation method and return a before/after comparison + new dataset |
| `POST` | `/api/model/evaluate` | Train & evaluate a logistic-regression classifier for fairness |
| `GET` | `/api/datasets/{dataset_id}/chart-data` | Chart-ready representation & outcome-rate data |

<details>
<summary><strong>Example — upload then scan</strong></summary>

```bash
curl -X POST http://127.0.0.1:8000/api/upload \
  -F "file=@your_dataset.csv"
# → { "dataset_id": "…", "rows": …, "columns": …, "column_names": […] }

curl http://127.0.0.1:8000/api/datasets/<dataset_id>/scan
```

</details>

<details>
<summary><strong>Example — mitigate without naming an outcome</strong></summary>

```bash
curl -X POST http://127.0.0.1:8000/api/mitigate \
  -H "Content-Type: application/json" \
  -d '{
    "dataset_id": "<dataset_id>",
    "protected_attribute": "gender",
    "method": "oversampling"
  }'
```

</details>

<br/>

## 🛠️ Mitigation Methods

| Method | Mechanism | Changes row count? | Needs a binary outcome? |
|---|---|:---:|:---:|
| **Oversampling** | Duplicates rows from underrepresented groups until every group matches the largest group's size | Grows | No |
| **Undersampling** | Removes rows from overrepresented groups until every group matches the smallest group's size | Shrinks | No |
| **Reweighting** | Leaves every row untouched; adds a per-row weight column for a later training step to use | No | No |
| **SMOTE** | Generates synthetic minority-group rows by interpolating between real neighbors | Grows | **Yes** |

Only SMOTE requires a binary outcome — it has to interpolate between exactly
two classes. The other three methods only ever look at the protected
attribute, so mitigation works even with a multiclass outcome, a continuous
outcome, or no outcome selected at all.

<br/>

## 📦 Building for Production

```bash
# Frontend
cd my-app
npm run build
npm run start      # serves the production build

# Backend — run behind a production ASGI setup, e.g.:
uvicorn api:app --host 0.0.0.0 --port 8000
```

Set `ALLOWED_ORIGINS` on the backend and `NEXT_PUBLIC_API_URL` on the
frontend to your real deployed URLs before going live — the backend's
development CORS default only allows `localhost`/`127.0.0.1`.

<br/>

## 🩺 Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Upload fails silently in the browser | `NEXT_PUBLIC_API_URL` doesn't match where the backend is actually running, or the origin isn't allowed by CORS | Check `.env.local`, restart `npm run dev` after changing it, and set `ALLOWED_ORIGINS` if deploying |
| `Unable to process CSV` on upload | File isn't a valid, non-empty CSV, or has no columns | Confirm the file opens cleanly in a spreadsheet tool first |
| SMOTE option is disabled in Mitigation | No outcome was selected, or the selected outcome isn't binary | Choose a binary outcome, or use oversampling / undersampling / reweighting instead |
| Trained-model panel doesn't appear | The chosen outcome isn't binary | The model-training feature requires a binary outcome column |
| `404` on API calls from the frontend | Backend isn't running, or is on a different port than `NEXT_PUBLIC_API_URL` | Start the backend with `uvicorn api:app --reload --port 8000` and confirm the URL matches |

<br/>

## 📏 Scope & Limitations

- Uploaded datasets are stored **in memory only** — restarting the backend
  clears everything. There is no database or persistence layer.
- **CSV is the only supported input format.**
- The trained-model panel and SMOTE both require a binary outcome — a real
  mathematical constraint of those two features, not an oversight.
- The model-evaluation component is intentionally a single, interpretable
  logistic regression; the project's emphasis is on detection and
  mitigation, with the model serving as a concrete demonstration that a
  trained classifier can inherit dataset-level bias.

<br/>

## 🤝 Contributing

This is currently a solo/course project without a formal contribution
process. If you'd like to suggest a change, open an issue describing the
problem or enhancement before submitting a pull request.

<br/>

## 📄 License

No license file is currently included in this repository. Add one (e.g.
MIT, Apache-2.0) if you intend to make this project open source.

<br/>

<div align="center">

Built with FastAPI, scikit-learn, and Next.js.

</div>