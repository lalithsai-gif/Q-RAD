# Q-RAD — Quantum Radiology 🩻⚛️
### Hybrid Classical–Quantum Intelligence for Chest X-Ray Analysis

**Q-RAD** is a full-stack chest X-ray analysis prototype that combines deep learning with quantum machine learning to explore medical-image classification, quantum feature encoding, and noise-aware quantum computation.

The platform integrates a **React frontend**, a **FastAPI inference service**, a classical deep-learning pipeline, and a quantum machine-learning workflow. It is designed to make chest X-ray analysis and the underlying quantum computation pipeline accessible through a single interactive interface.

> **Core idea:** Combine the feature-learning capabilities of classical deep learning with quantum feature maps and quantum-kernel methods, then investigate how quantum noise affects model behavior.

---

## ✨ Key Features

- 🩻 **Chest X-Ray Analysis:** Upload an image and explore model-generated findings.
- 🧠 **Deep Learning:** Use DenseNet-121 for classical image feature extraction.
- ⚛️ **Quantum Machine Learning:** Encode reduced-dimensional features into a 4-qubit quantum feature map.
- 🔬 **Quantum Kernel Learning:** Explore fidelity-based quantum kernels for classification.
- 🌐 **Full-Stack Application:** React frontend backed by FastAPI.
- 📊 **Explainability & Metrics:** Explore finding outputs, analysis information, and available evaluation metrics.
- 🛡️ **Noise-Aware Evaluation:** Compare ideal and noisy quantum execution where supported by the configured pipeline.
- 🔌 **IBM Quantum Integration:** Optional hardware execution when credentials, a supported backend, and the corresponding integration are configured.
- 📁 **Analysis History:** Access saved analyses and generated reports through the API.
- 🎨 **Responsive Visual Experience:** White/blue light theme and dark/blue theme.

## 🎯 Problem Statement

Chest X-rays are widely used in medical imaging, but interpreting them can be challenging and time-consuming. Deep learning offers a way to assist with identifying radiographic findings, while quantum machine learning provides an alternative computational approach to feature representation and similarity estimation.

Q-RAD explores the following question:

**Can a hybrid classical–quantum pipeline provide useful classification behavior for chest X-ray findings, and how does quantum execution noise influence its outputs?**

The project brings together image feature extraction, dimensionality reduction, quantum feature encoding, kernel-based classification, and noise-aware evaluation in an interactive software prototype.

This is an experimental engineering and hackathon project, not a clinically validated diagnostic system.

## 🧠 How Q-RAD Works

The overall pipeline separates classical image understanding from the quantum computation stage.

```text
             Chest X-Ray Image
                     │
                     ▼
          Image Preprocessing
                     │
                     ▼
          DenseNet-121 Backbone
          Classical Feature Extraction
                     │
                     ▼
          Feature Dimensionality Reduction
                     │
                     ▼
             4-Qubit Quantum
                Feature Map
                     │
                     ▼
             Quantum Kernel
          Fidelity-Based Similarity
                     │
                     ▼
          Classical Kernel Classifier
                (QSVC/SVM)
                     │
                     ▼
          Predicted Finding Scores
                     │
                     ▼
          React Dashboard + FastAPI
```

*The diagram represents the hybrid quantum-classical workflow. The exact inference path depends on the selected model and the application's active configuration.*

### 1. Classical deep-learning stage

DenseNet-121 extracts high-dimensional image representations from chest X-rays. These features capture patterns that can help distinguish radiographic findings.

### 2. Dimensionality reduction

The extracted features are reduced to a compact representation suitable for quantum encoding. In the experimental quantum pipeline, Principal Component Analysis (PCA) maps the feature vector to four dimensions.

### 3. Quantum feature encoding

The reduced features are encoded into a four-qubit quantum feature map, using a ZZ-style feature map in the experimental workflow.

A quantum state represents the encoded input:

\[
|\phi(x)\rangle=U_{\phi}(x)|0\rangle^{\otimes 4}
\]

Here, \(U_{\phi}(x)\) is the feature-encoding circuit and \(x\) is the reduced feature vector.

### 4. Quantum-kernel computation

The quantum kernel estimates similarity between encoded samples:

\[
K(x_i,x_j)=|\langle\phi(x_i)|\phi(x_j)\rangle|^2
\]

The resulting kernel matrix can be used by a classical kernel classifier, such as a Support Vector Classifier.

### 5. Hybrid classification

The experimental pipeline can train one binary quantum-kernel classifier per finding, while a classical SVM provides a comparison baseline. The frontend presents the findings and analysis information made available by the configured inference service.

**Important:** A quantum circuit is one component of the pipeline. Image preprocessing, deep-learning feature extraction, and portions of classification remain classical.

## ⚛️ Quantum Computing & Noise Analysis

Quantum hardware is susceptible to gate errors, decoherence, and measurement errors. These effects can change estimated kernel values and ultimately affect classification results.

Q-RAD is designed to investigate these effects through a comparison of quantum execution conditions where implemented.

| Execution condition | Purpose |
|---|---|
| Ideal simulation | Establish a reference without simulated hardware noise |
| Noisy simulation | Study how an assumed noise model affects quantum outputs |
| Hardware-like simulation | Explore device-inspired noise characteristics when configured |
| IBM Quantum hardware | Test execution on an eligible real quantum backend when configured |

### Noise-handling strategies

Depending on the configured experiment, the project can explore:

- **Circuit optimization:** Reduce unnecessary circuit depth and gate operations.
- **Measurement-error mitigation:** Correct measurement bias using an appropriate calibration or mitigation method.
- **Dynamical decoupling:** Apply pulse sequences where supported to reduce the effect of certain noise processes.
- **Gate twirling:** Randomize selected gate implementations to make some coherent errors easier to characterize or mitigate.
- **Runtime resilience options:** Use supported IBM Quantum Runtime error-suppression or mitigation features.
- **Quantitative comparison:** Compare kernel values, prediction behavior, and evaluation metrics across execution conditions.

These methods have different costs and applicability. They do not eliminate all quantum errors, and improvements must be demonstrated experimentally rather than assumed.

**Hardware note:** Real-backend execution is optional and depends on credentials, service access, backend availability, and the installed Qiskit Runtime configuration. Do not interpret a simulated result as a real quantum hardware result.

## 🗂️ Dataset

The experimental machine-learning workflow uses the **NIH ChestX-ray14** dataset.

- **Dataset:** NIH ChestX-ray14
- **Images:** 112,120 frontal chest X-rays
- **Patients:** 30,805
- **Labels:** 14 radiographic findings
- **Input resolution:** 224 × 224 pixels in the described training workflow

Dataset access and usage are subject to the original dataset's terms.

### Findings covered

1. Atelectasis
2. Cardiomegaly
3. Consolidation
4. Edema
5. Effusion
6. Emphysema
7. Fibrosis
8. Hernia
9. Infiltration
10. Mass
11. Nodule
12. Pleural Thickening
13. Pneumonia
14. Pneumothorax

The dataset contains multi-label annotations: a single image may be associated with more than one finding.

The model's output scores should not be interpreted as calibrated clinical probabilities. The local application may use a configured inference model, and its supported outputs depend on the assets and configuration supplied with the project.

## 🏗️ System Architecture

Q-RAD consists of three principal layers.

### Frontend — React

- Image-upload interface
- Analysis results and finding landscape
- Quantum analysis and circuit information
- Explainability and technical workflow sections
- Light and dark visual themes
- API-driven analysis history and reports

### Backend — FastAPI

- Image-analysis endpoint
- Health and readiness checks
- Model and configuration information
- Quantum-circuit information
- Evaluation metrics
- Analysis history
- Report and asset delivery

### Machine-learning layer

- Image preprocessing
- DenseNet-121 feature extraction
- Dimensionality reduction
- Quantum feature encoding
- Fidelity-based quantum-kernel computation
- Classical or quantum-kernel classification
- Optional quantum simulation and hardware execution

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Backend API | FastAPI, Python |
| Image processing | Pillow / compatible image-processing libraries |
| Deep learning | PyTorch, Torchvision |
| Feature extraction | DenseNet-121 |
| Dimensionality reduction | Scikit-learn, PCA |
| Classical baseline | Scikit-learn, SVM |
| Quantum computing | Qiskit |
| Quantum simulation | Qiskit Aer, where configured |
| Quantum classification | Quantum-kernel / QSVC workflow |
| Optional quantum hardware | IBM Quantum, Qiskit Runtime |
| Dataset | NIH ChestX-ray14 |

*The exact installed packages and supported integrations depend on the project's environment and configuration.*

## 🚀 Getting Started on Windows

### Prerequisites

- Windows 10 or Windows 11
- Python version supported by the backend dependencies
- Node.js version supported by the frontend dependencies, if required by the launcher
- The project source code and required model assets

### Option 1 — Quick launch

1. Download or clone this repository.
2. Extract the project if you downloaded a ZIP archive.
3. Open the project directory.
4. Double-click `RUN_WINDOWS.bat`.
5. Wait for the frontend and backend services to start.
6. Open the application in your browser at:

   **http://127.0.0.1:5173**

7. Upload a chest X-ray image in PNG, JPG, JPEG, or WEBP format.
8. Explore the available findings, quantum analysis, explainability, and technical workflow sections.

### Option 2 — Inspect the API

The FastAPI service is expected at:

**http://127.0.0.1:8000**

Interactive API documentation:

**http://127.0.0.1:8000/docs**

Check the service health before testing the analysis pipeline.

```bash
curl http://127.0.0.1:8000/api/health
```

If a command-line request is unavailable or the service uses a different host or port, inspect the active backend configuration.

## 🔌 API Reference

The application exposes the following routes according to the current project interface.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Service health check |
| GET | `/api/readiness` | Readiness status |
| POST | `/api/reload` | Reload supported resources |
| GET | `/api/config` | Active configuration |
| GET | `/api/info` | Application information |
| GET | `/api/models` | Model information |
| GET | `/api/metrics` | Available evaluation metrics |
| GET | `/api/quantum/circuit` | Quantum circuit information |
| POST | `/api/analyze` | Analyze an uploaded image |
| GET | `/api/history` | List analysis history |
| GET | `/api/history/{analysis_id}` | Retrieve an analysis |
| DELETE | `/api/history` | Clear analysis history |
| GET | `/api/report/{analysis_id}` | Retrieve a generated report |
| GET | `/api/assets/{name}` | Retrieve a supported application asset |

For request formats, response schemas, and error details, refer to the running service's `/docs` page.

## 📊 Evaluation & Testing

A meaningful evaluation should examine both the machine-learning pipeline and the quantum component.

### Classical model evaluation

- AUROC and per-finding discrimination
- Precision, recall, and F1-score at specified thresholds
- Class-wise and macro-averaged metrics
- Performance on a held-out test set
- Patient-level separation between training, validation, and test splits

### Quantum evaluation

- Ideal versus noisy quantum-kernel values
- Kernel-matrix stability under noise
- Classification performance under comparable evaluation conditions
- Effect of circuit depth and measurement shots
- Impact of applicable error-suppression and mitigation strategies
- Hardware execution results, job IDs, and backend information when real hardware is used

Comparisons should use consistent splits, evaluation procedures, and clearly documented experimental settings. Any numerical results reported in the project should include their evaluation conditions and must be measured rather than estimated.

## 🔐 Optional IBM Quantum Setup

Real quantum execution is optional. To enable it, configure access through the supported IBM Quantum service and the Qiskit Runtime version used by the project.

If the notebook or backend supports environment-based credentials, the expected secret names may include:

```text
IBM_QUANTUM_TOKEN
IBM_QUANTUM_INSTANCE   # Optional, if required by the configured service
```

Keep credentials in environment variables or a secure secrets manager. Never commit API tokens, private credentials, or `.env` files containing secrets to GitHub.

Before running a hardware experiment, verify service access, available backends, supported instructions, transpilation settings, shot limits, and applicable Runtime options.

## 📁 Repository Structure

The exact directory structure depends on the supplied project bundle. A typical organization is:

```text
Q-RAD/
├── frontend/              # React application
├── backend/               # FastAPI service
├── models/                # Model assets, if distributed
├── notebooks/             # Training and quantum experiments, if included
├── RUN_WINDOWS.bat        # Windows launcher
├── README.md
└── requirements.txt       # Python dependencies, if supplied
```

Use the actual folder names from the repository when documenting or extending this structure.

## ⚠️ Limitations & Responsible Use

- **Not a medical device:** Q-RAD is a hackathon prototype and is not intended for diagnosis, treatment decisions, or emergency medical use.
- **Not clinically validated:** The application has not been established as safe or effective for clinical deployment.
- **Scores are not calibrated probabilities:** Model outputs may not represent the likelihood of disease.
- **Dataset limitations:** Dataset composition, label quality, and distribution shifts may affect model behavior.
- **Quantum limitations:** Small-qubit demonstrations do not establish quantum advantage over classical methods.
- **Noise mitigation limitations:** Error suppression and mitigation may improve some measurements but cannot guarantee better classification.
- **Hardware limitations:** Actual quantum execution depends on backend availability, access permissions, and hardware noise.
- **Model availability:** Inference requires the appropriate model weights and configuration. A successful frontend launch alone does not guarantee that every model or quantum integration is ready.

Use appropriately authorized data and follow relevant privacy and dataset-use requirements.

## 🔮 Future Improvements

- Expand reproducible experiments across ideal simulation, noisy simulation, and real quantum hardware.
- Add automated reports comparing classical and quantum-kernel baselines.
- Improve noise-aware evaluation and document mitigation overhead.
- Provide clearer per-finding metrics and explainability.
- Add robust input validation and model-readiness diagnostics.
- Package the application for easier installation and reproducible deployment.
- Evaluate generalization on independent datasets before considering any clinical use.

## 🏆 Project Context

**Built for a 24-hour Quantique Hackathon at IIIT Nuzvid.**

Q-RAD explores how classical deep learning and quantum machine learning can be combined in a practical application, with particular attention to the quantum feature map, kernel-based classification, and the effects of noise on quantum computation.

The objective is to build a demonstrable, technically transparent prototype—not to claim that quantum computing already outperforms classical medical-image analysis.

## 👥 Contributors

#D.Lalith Sai 

## 📄 License

This Project is under MIT License.

---

**Q-RAD — Exploring the intersection of radiology, deep learning, and quantum computing.** 🩻⚛️
