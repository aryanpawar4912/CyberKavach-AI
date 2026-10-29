# CyberKavach-AI

**An AI-Powered Framework for Detecting Cyber Threats in Digital Systems**

CyberKavach AI is a Security Operations Center (SOC) intelligence dashboard and ML threat detection platform. It features a futuristic dark cybersecurity command center interface inspired by advanced network visualization displays, paired with a modular Django REST Framework backend and Scikit-learn machine learning engine.

---

## 1. System Architecture

- **Frontend**: React 18 with Vite, Tailwind CSS (custom dark cybersecurity theme: `#080D0B`), `@xyflow/react` for interactive topology graphs, Recharts for threat waveforms & distribution, Lucide icons, Framer Motion.
- **Backend**: Python 3.11+, Django 5.x, Django REST Framework, JWT Authentication (`djangorestframework-simplejwt`), `django-cors-headers`, WhiteNoise.
- **Machine Learning**: Scikit-learn, Pandas, NumPy, Joblib for trusted application model persistence. Models supported:
  - Random Forest Classifier (baseline)
  - Decision Tree Classifier
  - Support Vector Machine (LinearSVC)
- **Database**:
  - Development: Local SQLite (`db.sqlite3`)
  - Production: Supabase PostgreSQL or Neon PostgreSQL via `DATABASE_URL` with SSL.
- **Deployment**:
  - Frontend: Vercel
  - Backend: Render

---

## 2. Directory Structure

```
CyberKavachAI/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/       # Sidebar, Topbar, AppLayout
│   │   │   ├── network/      # Interactive NetworkGraph (@xyflow/react)
│   │   │   ├── charts/       # ActivityChart, ThreatDonut, AlertIntensityChart
│   │   │   └── common/       # States, Badges, MetricPanel
│   │   ├── pages/            # Overview, NetworkMonitor, ThreatDetection, Datasets,
│   │   │                     # DetectionHistory, MLAnalytics, Explainability,
│   │   │                     # SecurityAlerts, IncidentInvestigation, Reports, AuditLogs, Settings, Login
│   │   ├── services/         # Axios API clients for each backend domain
│   │   ├── context/          # AuthContext, AppContext
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── backend/
│   ├── config/               # Django project settings, root URLs, WSGI
│   ├── accounts/             # Authentication & user profile endpoints
│   ├── datasets/             # CSV upload & adapters (CICIDS2017, NSL-KDD, UNSW-NB15)
│   ├── machine_learning/     # Training pipeline, evaluation, Joblib persistence
│   ├── detection/            # Inference engine & prediction history
│   ├── alerts/               # Security alerts tracking & status workflows
│   ├── incidents/            # Incident investigation workspace & analyst notes
│   ├── dashboard/            # Aggregated telemetry & threat activity APIs
│   ├── network/              # Topology graph nodes and edges API
│   ├── reports/              # Summary metrics and CSV export
│   ├── audit/                # Access and operational audit logging
│   ├── media/                # Uploaded datasets
│   ├── trained_models/       # Verified Joblib model bundles
│   ├── manage.py
│   ├── seed_data.py          # Legacy no-demo-data setup notice
│   └── tests.py              # Automated test suite
├── .env.example
├── .gitignore
└── README.md
```

---

## 3. Quickstart: Windows PowerShell Commands

### Terminal 1: Backend Setup & Server

```powershell
# Navigate to backend directory
cd D:\Development\CyberKavachAI\backend

# Create the virtual environment only if it does not already exist
if (-not (Test-Path .\venv\Scripts\Activate.ps1)) { py -m venv .\venv }
.\venv\Scripts\Activate.ps1

# Install backend dependencies
python -m pip install -r requirements.txt

# Copy the example configuration if you have not created a local .env yet
if (-not (Test-Path .\.env)) { Copy-Item ..\.env.example .\.env }

# Run database migrations
python manage.py migrate

# Create an operator account (interactive; no demo credentials are installed)
python manage.py createsuperuser

# Start Django Development Server on port 8000
python manage.py runserver 8000
```

### Terminal 2: Frontend Setup & Dev Server

```powershell
# Navigate to frontend directory
cd D:\Development\CyberKavachAI\frontend

# Install locked frontend dependencies
npm install

# Start Vite React server on port 5173
npm run dev
```

Open `http://localhost:5173` in your browser and sign in using the account
created above. Upload a CSV dataset before requesting model training or
predictions. The legacy `seed_data.py` entry point does not create sample
records, alerts, model metrics, or demo credentials. Previously seeded
synthetic dataset records are retained, tagged as demo data, and excluded from
normal application APIs; migrations do not delete user data.

## Data and metric definitions

- **Records analysed** counts persisted `DetectionRecord` rows.
- **Benign** counts saved predictions labelled `benign`, `normal`, or `0`.
- **Suspicious** counts saved prediction labels present in a persisted trained
  model's target classes for the same dataset and recorded model, excluding
  benign labels.
- **Unclassified** counts records not matched to either supported group;
  unknown labels are not treated as malicious.
- **Active alerts** counts persisted alerts with `new` or `investigating` status.
- **Processed datasets** counts datasets whose CSV parsing and metadata
  processing completed successfully.
- **Available model artifacts** counts trained-model rows whose artifact file
  currently exists. This does not claim that a model is currently loaded.
- **Model evaluation metrics** use labelled held-out rows during training.
  Prediction confidence is not an evaluation metric.
- **Activity charts** group saved detections in the configured timezone and
  fill empty days only between the first and last matching record.
- **Network graphs** require actual stored source and destination addresses;
  no geographic or infrastructure topology is inferred from missing fields.

---

## 4. Running Automated Tests

```powershell
cd D:\Development\CyberKavachAI\backend
if (-not (Test-Path .\venv\Scripts\Activate.ps1)) { py -m venv .\venv }
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py test tests
```

---

## 5. Dataset Schema Recognition and Current Limits

The upload processor recognizes likely CICIDS2017, NSL-KDD, and UNSW-NB15
files from column names and records dataset metadata. Model preprocessing
separates known target-label columns, keeps numeric features, one-hot encodes
categorical features, and stores the resulting feature names in the trusted
model artifact for inference alignment.

The current implementation does **not** yet have independent, schema-specific
required-column validation or label normalization rules for each benchmark.
Treat a recognized schema as a best-effort classification, not proof that the
file is a complete or canonical benchmark export. Unsupported columns and
labels may need explicit adapter rules before production model training.

---

## 6. Production Deployment Guide

### A. Database (Supabase or Neon PostgreSQL)
1. Create a PostgreSQL project on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
2. Obtain your pooled connection string with SSL:
   `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require`

### B. Backend on Render
1. Create a new **Web Service** pointing to your repository.
2. Root Directory: `backend`
3. Build Command:
   `pip install -r requirements.txt && python manage.py collectstatic --noinput`
4. Start Command:
   `gunicorn config.wsgi:application`
5. Configure a pre-deploy migration command (`python manage.py migrate`) after reviewing pending migrations; do not run database migrations during the build.
6. Add Environment Variables:
   - `DJANGO_SECRET_KEY`: `<secure random string>`
   - `DEBUG`: `False`
   - `ALLOW_PUBLIC_REGISTRATION`: `False` unless public self-registration is an intentional onboarding policy
   - `ALLOWED_HOSTS`: `.onrender.com`
   - `DATABASE_URL`: `<your-supabase-or-neon-url>`
   - `CORS_ALLOWED_ORIGINS`: `https://<your-vercel-domain>`
   - `CSRF_TRUSTED_ORIGINS`: `https://<your-vercel-domain>`
   - `SECURE_HSTS_SECONDS`: `31536000`

Uploaded datasets and generated model artifacts are stored on the backend
filesystem by default. Configure a persistent Render disk or external object
storage and update the storage settings before relying on them across deploys.
Do not treat ephemeral service storage as durable.

### C. Frontend on Vercel
1. Import repository on [Vercel](https://vercel.com).
2. Root Directory: `frontend`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://<your-render-backend-url>/api/v1`
   - `VITE_DEV_BYPASS_AUTH`: `false`
