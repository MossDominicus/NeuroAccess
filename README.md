# NeuroAccess

**AI-powered EEG Literacy Platform**

> NeuroAccess helps non-expert users understand EEG data through multi-level AI explanations while preserving scientific and non-medical boundaries.

---

## Project Overview

NeuroAccess is an open EEG literacy platform that converts raw brainwave recordings into readable, structured educational reports. Users upload EEG files (EDF, BDF, GDF, CSV), and the platform automatically extracts signal quality metrics, frequency band analysis, and AI-generated explanations at three comprehension levels — Beginner, Student, and Research.

## Core Idea

The core philosophy of NeuroAccess is **Human-Centered AI for Neuroscience Education**.

We do **not** aim to replace clinical EEG interpretation. Instead, we bridge the gap between complex electrophysiological data and human understanding by providing **multi-level AI explanations** tailored to different audiences. The same EEG recording is explained differently: in simple analogies for beginners, in structured analysis for students, and in technical detail for research learners.

AI is the translator, not the diagnostician.

## Target Users

- Non-expert users who are curious about brain activity
- Students in neuroscience, psychology, or biomedical engineering
- EEG beginners learning signal interpretation
- Educators demonstrating EEG concepts in classrooms
- Research learners exploring electrophysiology data
- EEG technicians and professional auxiliary scenarios

---

## Non-Medical Disclaimer

> ⚠️ **NeuroAccess is not a medical diagnosis tool.**

This platform is designed **solely for EEG education and literacy**. It does not:
- Provide clinical diagnosis or treatment recommendations
- Replace professional medical interpretation
- Constitute medical advice of any kind

EEG data alone cannot diagnose any disease. For health concerns, consult a qualified physician.

---

## Core Features

| Feature | Description |
|---------|-------------|
| EDF Upload & Analysis | Single and batch EDF/BDF/GDF/CSV upload, up to 500MB per file |
| Signal Quality Summary | Automatic detection of noisy channels, clipping, artifacts, high-frequency noise |
| Frequency Band Analysis | Delta, Theta, Alpha, Beta band power with PSD visualization |
| Three-level AI Explanations | Beginner / Student / Research modes — same data, different depth |
| Reports Page | Save, browse, and manage all analysis reports (localStorage) |
| PDF Export | One-click export of full 8-section report |
| Case Studies | Curated real-world EEG examples with difficulty filtering |
| EEG Literacy Guide | 10 interactive knowledge cards covering core EEG concepts |
| Local AI with Ollama | Privacy-first: all AI inference runs locally via Ollama (qwen2.5:7b) |
| Language Switching | Full bilingual support: Chinese (中文) and English |
| Intro Animation | EEG waveform drawing animation on first visit |

---

## Known Limitations

| Limitation | Detail |
|------------|--------|
| **Interpretation Uncertainty** | EEG interpretation remains inherently uncertain and subject to inter-rater variability |
| **Cross-Subject Variability** | EEG patterns vary significantly across individuals; no single "normal" template exists |
| **Recording Quality** | Consumer-grade or non-clinical EEG recordings may contain substantial environmental and physiological noise |
| **Educational, Not Diagnostic** | All AI explanations are educational in nature and must not be used for clinical decision-making |
| **Signal Quality Dependency** | Interpretation confidence is strongly affected by electrode placement, impedance, and environmental factors |
| **Scope Limitation** | This platform cannot determine disease, intelligence, personality, emotions, ADHD, depression, or health risk |
| **AI Model Variability** | Explanation quality depends on the local Ollama model; results may vary between runs |
| **Frontend Storage** | Reports are stored in browser localStorage; clearing browser data will delete reports |
| **CPU-Only Inference** | Local LLM inference is CPU-bound unless GPU acceleration is configured for Ollama |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS v4, CSS Variables (dark mode) |
| Animation | Framer Motion, SVG animation |
| Charts | Recharts |
| PDF Export | dom-to-image-more, jsPDF |
| Backend | FastAPI (Python) |
| EEG Processing | MNE-Python, NumPy, SciPy, Matplotlib |
| AI / LLM | Ollama, qwen2.5:7b |
| Storage | localStorage (frontend report persistence) |

---

## Local Setup

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- Ollama installed

### 1. Start Ollama

```bash
ollama serve                          # Start Ollama (default: localhost:11434)
ollama pull qwen2.5:7b               # Pull the AI model (one-time)
```

### 2. Start Backend

```bash
cd NeuroAccess/backend
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at `http://localhost:8000`. Verify with `GET /health`.

### 3. Start Frontend

```bash
cd NeuroAccess
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

---

## Demo Workflow

```
Upload EDF → Analyze EEG → View Explanations → Generate Report → Export PDF
```

1. Open the dashboard at `http://localhost:3000`
2. Drag-and-drop or click to upload an EDF file
3. Click "Start Analysis" and wait for processing
4. Expand the file card to see Beginner / Student / Research explanations
5. Browse Reports at `/reports` to see all saved analyses
6. Open a report detail to view the full 8-section report
7. Click "Export PDF" to download a professional report

---

## Future Roadmap

- More sample EEG datasets for educational comparison
- Better report templates with customizable layouts
- User understanding feedback study to improve explanation quality
- Optional private deployment for schools, labs, and educational institutions
- More robust signal quality metrics and artifact rejection
- Multi-file EEG comparison view
- Time-frequency (spectrogram) visualization
- Remote Ollama connection support for shared deployments

---

## Project Value

### Human-Centered AI

NeuroAccess positions AI as a **bridge**, not a barrier. Three explanation levels ensure accessibility across radically different audiences — from curious beginners to technical researchers.

### Scientific Accessibility

EEG is one of the oldest brain imaging techniques, yet its learning curve remains steep. NeuroAccess lowers that barrier: no programming required, no math background needed, and no specialized equipment beyond a browser.

### Open & Reproducible

Data sourced from PhysioNet public datasets. Analysis powered by the open-source MNE-Python ecosystem. AI driven by locally-run Ollama. Every component can be independently verified, reproduced, and improved.

---

## License

[MIT License](LICENSE)

---

<p align="center">
  <sub>Built for the EEG education community</sub>
</p>
