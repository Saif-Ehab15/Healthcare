import React, { useState } from "react";
import "./LiverModel.css";
import axios from "axios";
import axiosInstance from "../../../Config/axios";

const LiverModel = () => {
  const [formData, setFormData] = useState({
    age: "",
    gender: "Male",
    tb: "",
    db: "",
    alkphos: "",
    sgpt: "",
    sgot: "",
    tp: "",
    alb: "",
    ag_Ratio: "",
  });

  const [predictionResult, setPredictionResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Validate form data
  const validateForm = () => {
    const requiredFields = [
      "age",
      "gender",
      "tb",
      "db",
      "alkphos",
      "sgpt",
      "sgot",
      "tp",
      "alb",
      "ag_Ratio",
    ];

    for (let field of requiredFields) {
      if (!formData[field] && formData[field] !== 0) {
        setError(`Please fill in ${field} field`);
        return false;
      }
    }
    return true;
  };

  // Submit form to API
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // Prepare data for API
      const apiData = {
        age: parseFloat(formData.age),
        gender: formData.gender,
        tb: parseFloat(formData.tb),
        db: parseFloat(formData.db),
        alkphos: parseFloat(formData.alkphos),
        sgpt: parseFloat(formData.sgpt),
        sgot: parseFloat(formData.sgot),
        tp: parseFloat(formData.tp),
        alb: parseFloat(formData.alb),
        ag_Ratio: parseFloat(formData.ag_Ratio),
      };

      // Try calling Python API directly on port 5000
      let response;
      try {
        console.log("Attempting direct connection to Python API on port 5000...");
        response = await axios.post("http://127.0.0.1:5000/", apiData);
      } catch (directErr) {
        console.warn("Direct connection failed, falling back to backup API:", directErr);
        // Fallback to .NET backend if direct connection fails
        response = await axiosInstance.post("/api/AIModels/PredictLiverDisease", apiData);
      }

      setPredictionResult(response.data);
    } catch (err) {
      console.error("Prediction error:", err);
      setError(err.response?.data?.message || "Failed to get prediction. Please check your API connection.");
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      age: "",
      gender: "Male",
      tb: "",
      db: "",
      alkphos: "",
      sgpt: "",
      sgot: "",
      tp: "",
      alb: "",
      ag_Ratio: "",
    });
    setPredictionResult(null);
    setError(null);
  };

  // Get result card color based on prediction
  const getResultCardClass = () => {
    if (!predictionResult) return "";

    // Handle both old format and new string format
    const resultText = predictionResult.result || predictionResult.prediction || "";
    const isPositive = resultText.toLowerCase().includes("likely") || resultText.toLowerCase().includes("positive");
    const isNegative = resultText.toLowerCase().includes("unlikely") || resultText.toLowerCase().includes("negative");

    if (isPositive) return "result-positive";
    if (isNegative) return "result-negative";
    return "result-warning";
  };

  return (
    <div className="liver-model-container">
      <div className="liver-model-header">
        <h1>
          <i className="fas fa-liver"></i> Liver Disease Prediction Model
        </h1>
        <p className="subtitle">
          Enter patient parameters to predict liver disease risk
        </p>
      </div>

      <div className="content-wrapper">
        {/* Input Form */}
        <div className="form-section">
          <h2>
            <i className="fas fa-notes-medical"></i> Patient Data Input
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* Age */}
              <div className="form-group">
                <label htmlFor="age">
                  Age <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="Enter age in years"
                  step="1"
                  min="0"
                  max="120"
                  required
                />
              </div>

              {/* Gender */}
              <div className="form-group">
                <label htmlFor="gender">
                  Gender <span className="required">*</span>
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Total Bilirubin (TB) */}
              <div className="form-group">
                <label htmlFor="tb">
                  Total Bilirubin (TB) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="tb"
                  name="tb"
                  value={formData.tb}
                  onChange={handleChange}
                  placeholder="mg/dL"
                  step="0.1"
                  required
                />
                <small>Normal range: 0.3 - 1.2 mg/dL</small>
              </div>

              {/* Direct Bilirubin (DB) */}
              <div className="form-group">
                <label htmlFor="db">
                  Direct Bilirubin (DB) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="db"
                  name="db"
                  value={formData.db}
                  onChange={handleChange}
                  placeholder="mg/dL"
                  step="0.1"
                  required
                />
                <small>Normal range: 0.1 - 0.3 mg/dL</small>
              </div>

              {/* Alkaline Phosphatase (ALP) */}
              <div className="form-group">
                <label htmlFor="alkphos">
                  Alkaline Phosphatase (ALP) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="alkphos"
                  name="alkphos"
                  value={formData.alkphos}
                  onChange={handleChange}
                  placeholder="IU/L"
                  step="1"
                  required
                />
                <small>Normal range: 44 - 147 IU/L</small>
              </div>

              {/* SGPT (ALT) */}
              <div className="form-group">
                <label htmlFor="sgpt">
                  SGPT (ALT) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="sgpt"
                  name="sgpt"
                  value={formData.sgpt}
                  onChange={handleChange}
                  placeholder="IU/L"
                  step="1"
                  required
                />
                <small>Normal range: 7 - 56 IU/L</small>
              </div>

              {/* SGOT (AST) */}
              <div className="form-group">
                <label htmlFor="sgot">
                  SGOT (AST) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="sgot"
                  name="sgot"
                  value={formData.sgot}
                  onChange={handleChange}
                  placeholder="IU/L"
                  step="1"
                  required
                />
                <small>Normal range: 5 - 40 IU/L</small>
              </div>

              {/* Total Proteins (TP) */}
              <div className="form-group">
                <label htmlFor="tp">
                  Total Proteins (TP) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="tp"
                  name="tp"
                  value={formData.tp}
                  onChange={handleChange}
                  placeholder="g/dL"
                  step="0.1"
                  required
                />
                <small>Normal range: 6.0 - 8.3 g/dL</small>
              </div>

              {/* Albumin (ALB) */}
              <div className="form-group">
                <label htmlFor="alb">
                  Albumin (ALB) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="alb"
                  name="alb"
                  value={formData.alb}
                  onChange={handleChange}
                  placeholder="g/dL"
                  step="0.1"
                  required
                />
                <small>Normal range: 3.5 - 5.0 g/dL</small>
              </div>

              {/* A/G Ratio */}
              <div className="form-group">
                <label htmlFor="ag_Ratio">
                  A/G Ratio <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="ag_Ratio"
                  name="ag_Ratio"
                  value={formData.ag_Ratio}
                  onChange={handleChange}
                  placeholder="Ratio"
                  step="0.1"
                  required
                />
                <small>Normal range: 1.0 - 2.5</small>
              </div>
            </div>

            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i> {error}
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-pulse"></i> Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-chart-line"></i> Predict Liver Disease
                  </>
                )}
              </button>
              <button type="button" className="btn-reset" onClick={handleReset}>
                <i className="fas fa-undo-alt"></i> Reset Form
              </button>
            </div>
          </form>
        </div>

        {/* Results Section */}
        <div className="results-section">
          <h2>
            <i className="fas fa-chart-bar"></i> Prediction Results
          </h2>

          {predictionResult ? (
            <div className={`result-card ${getResultCardClass()}`}>
              <div className="result-header">
                <i className="fas fa-microscope"></i>
                <h3>Analysis Result</h3>
              </div>

              <div className="result-content">
                <div className="result-item large">
                  <label>Analysis Outcome:</label>
                  <span className={`prediction-value ${getResultCardClass()}`}>
                    {predictionResult.result || predictionResult.prediction}
                  </span>
                </div>

                {predictionResult.confidence && (
                  <div className="result-item">
                    <label>Confidence Score:</label>
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{ width: `${(predictionResult.confidence || 0) * 100}%` }}
                      ></div>
                      <span>{((predictionResult.confidence || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                {predictionResult.riskLevel && (
                  <div className="result-item">
                    <label>Risk Level:</label>
                    <span className="risk-level">{predictionResult.riskLevel}</span>
                  </div>
                )}

                {predictionResult.recommendation && (
                  <div className="result-item">
                    <label>Recommendation:</label>
                    <p>{predictionResult.recommendation}</p>
                  </div>
                )}
              </div>

              <div className="result-footer">
                <small>
                  <i className="fas fa-info-circle"></i>
                  This prediction is based on machine learning model. Please consult a healthcare professional for accurate diagnosis.
                </small>
              </div>
            </div>
          ) : (
            <div className="placeholder-card">
              <i className="fas fa-chart-line"></i>
              <p>Enter patient data and click "Predict Liver Disease" to see results</p>
              <small>All fields are required for accurate prediction</small>
            </div>
          )}

          {/* Reference Ranges */}
          <div className="reference-ranges">
            <h3>
              <i className="fas fa-book-medical"></i> Reference Ranges
            </h3>
            <div className="reference-grid">
              <div className="reference-item">
                <strong>TB:</strong> 0.3 - 1.2 mg/dL
              </div>
              <div className="reference-item">
                <strong>DB:</strong> 0.1 - 0.3 mg/dL
              </div>
              <div className="reference-item">
                <strong>ALP:</strong> 44 - 147 IU/L
              </div>
              <div className="reference-item">
                <strong>SGPT:</strong> 7 - 56 IU/L
              </div>
              <div className="reference-item">
                <strong>SGOT:</strong> 5 - 40 IU/L
              </div>
              <div className="reference-item">
                <strong>TP:</strong> 6.0 - 8.3 g/dL
              </div>
              <div className="reference-item">
                <strong>ALB:</strong> 3.5 - 5.0 g/dL
              </div>
              <div className="reference-item">
                <strong>A/G Ratio:</strong> 1.0 - 2.5
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiverModel;