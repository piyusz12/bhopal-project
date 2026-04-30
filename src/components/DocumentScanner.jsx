import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload, CheckCircle, AlertCircle, X, ShieldCheck } from 'lucide-react';
import './DocumentScanner.css';

const DocumentScanner = ({ onClose }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [mode, setMode] = useState('camera'); // 'camera' or 'upload'
  const webcamRef = useRef(null);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageBase64 = webcamRef.current.getScreenshot();
      setImageSrc(imageBase64);
    }
  }, [webcamRef]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result);
        setScanResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerify = async () => {
    if (!imageSrc) return;
    setIsProcessing(true);

    try {
      // Convert base64 to blob for multipart upload
      const fetchResponse = await fetch(imageSrc);
      const blob = await fetchResponse.blob();
      
      const formData = new FormData();
      formData.append("file", blob, "document.jpg");

      const response = await fetch('http://localhost:8000/api/ekyc/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Verification failed');

      const data = await response.json();
      setScanResult(data);
    } catch (error) {
      console.error("Verification failed", error);
      setScanResult({ 
        documentType: "Unknown", 
        name: "N/A", 
        idNumber: "N/A", 
        status: "Error: Could not process document" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setImageSrc(null);
    setScanResult(null);
  };

  return (
    <div className="scanner-overlay">
      <div className="scanner-modal">
        
        {/* Header */}
        <div className="scanner-header">
          <div className="scanner-brand">
            <div className="scanner-icon-wrap">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="scanner-title">Secure eKYC</h2>
              <p className="scanner-subtitle">AI-powered ID verification</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="scanner-close"
            aria-label="Close scanner"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Area */}
        <div className="scanner-content">
          {!imageSrc ? (
            <div className="selection-view">
              {/* Mode Toggle */}
              <div className="mode-toggle">
                <button 
                  onClick={() => setMode('camera')}
                  className={`mode-btn ${mode === 'camera' ? 'active' : ''}`}
                >
                  <Camera size={18} /> Live Camera
                </button>
                <button 
                  onClick={() => setMode('upload')}
                  className={`mode-btn ${mode === 'upload' ? 'active' : ''}`}
                >
                  <Upload size={18} /> Upload File
                </button>
              </div>

              {/* Interaction Zone */}
              <div className="viewport-container">
                {mode === 'camera' ? (
                  <div className="camera-wrap" style={{ width: '100%', height: '100%' }}>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      className="webcam-view"
                      videoConstraints={{ facingMode: "environment" }}
                    />
                    <div className="scan-frame">
                       <div className="scan-corner corner-tl"></div>
                       <div className="scan-corner corner-tr"></div>
                       <div className="scan-corner corner-bl"></div>
                       <div className="scan-corner corner-br"></div>
                       <div className="scan-line"></div>
                    </div>
                    <div className="capture-btn-wrap">
                      <button onClick={capture} className="capture-btn">
                        <div className="capture-btn-inner">
                          <Camera size={28} />
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="upload-zone">
                    <div className="upload-icon-wrap">
                      <Upload size={40} />
                    </div>
                    <p className="upload-title">Drop your ID here</p>
                    <p className="upload-hint">Supports PNG, JPG or JPEG formatted images</p>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" style={{ display: 'none' }} />
                  </label>
                )}
              </div>
            </div>
          ) : (
            <div className="preview-container">
              <div className="viewport-container">
                <img src={imageSrc} alt="Preview" className="preview-view" />
                {isProcessing && (
                  <div className="processing-overlay">
                    <div className="spinner"></div>
                    <span className="processing-text">Analyzing Document</span>
                  </div>
                )}
              </div>

              {!scanResult && !isProcessing && (
                <div className="actions-row">
                  <button onClick={reset} className="btn-secondary">Retake</button>
                  <button onClick={handleVerify} className="btn-primary">Verify ID Now</button>
                </div>
              )}

              {scanResult && (
                <div className="result-card">
                  <div className="result-header">
                    <h3 className="result-title">Verification Result</h3>
                    <span className={`status-tag ${scanResult.status.includes('Verified') ? 'status-verified' : 'status-error'}`}>
                      {scanResult.status.includes('Verified') ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      {scanResult.status}
                    </span>
                  </div>
                  
                  <div className="result-grid">
                    <div className="result-item">
                      <p className="result-label">Document Type</p>
                      <p className="result-value">{scanResult.documentType}</p>
                    </div>
                    <div className="result-item">
                      <p className="result-label">Full Name</p>
                      <p className="result-value">{scanResult.name}</p>
                    </div>
                    <div className="id-number-wrap">
                      <p className="result-label" style={{ textAlign: 'center' }}>ID Number</p>
                      <div className="id-number-box">{scanResult.idNumber}</div>
                    </div>
                  </div>

                  <button onClick={reset} className="btn-secondary" style={{ width: '100%', marginTop: '20px' }}>Verify Another</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="scanner-footer">
           <p className="security-hint">
             <ShieldCheck size={14} style={{ opacity: 0.5 }} /> Secure Data Encryption Active
           </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentScanner;
