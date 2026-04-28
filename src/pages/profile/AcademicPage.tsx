import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Upload, FileText, Plus } from 'lucide-react';
import '../Profile.css';

interface CategoryPageProps {
  categoryId: string;
  categoryTitle?: string;
  categoryEmoji?: string;
  onBack: () => void;
}

const ITEMS = [
  { id: '10th', title: '10th / 12th Marks', icon: '📊', description: 'Scanned marksheet', methods: ['camera', 'upload'] },
  { id: 'semester', title: 'Semester Marksheets', icon: '📋', description: 'All semester documents', methods: ['camera', 'upload'] },
  { id: 'degree', title: 'Degree Certificates', icon: '🎓', description: 'Final degree or diploma', methods: ['camera', 'upload'] },
  { id: 'college-id', title: 'College ID', icon: '🆔', description: 'Currently enrolled college ID', methods: ['camera', 'upload'] }
];

export default function AcademicPage({ categoryTitle = 'Academic', categoryEmoji = '🎓', onBack }: CategoryPageProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'camera' | 'upload' | 'text' | null>(null);
  const [textValue, setTextValue] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentItem = ITEMS.find(item => item.id === selectedItem);

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      alert('Camera access denied');
    }
  };

  const handleCapture = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (context) {
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      console.log('✅ Image captured:', selectedItem);
      setCameraActive(false);
      stopCamera();
      setUploadMethod(null);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('✅ File selected:', file.name);
      setUploadMethod(null);
    }
  };

  const handleSaveText = () => {
    if (textValue.trim()) {
      console.log('✅ Text saved:', textValue);
      setUploadMethod(null);
      setTextValue('');
    }
  };

  return (
    <div className="category-page">
      <motion.div 
        className="category-page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <div className="header-content">
          <h1>{categoryEmoji} {categoryTitle}</h1>
          <p>Add and manage your {categoryTitle.toLowerCase()} documents</p>
        </div>
      </motion.div>

      {!selectedItem ? (
        <motion.div 
          className="items-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {ITEMS.map((item, index) => (
            <motion.div
              key={item.id}
              className="item-card"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedItem(item.id)}
            >
              <div className="item-icon">{item.icon}</div>
              <h3 className="item-title">{item.title}</h3>
              <p className="item-desc">{item.description}</p>
              <div className="item-methods">
                {item.methods.map(method => (
                  <span key={method} className={`method-badge ${method}`}>
                    {method === 'camera' && '📸'}
                    {method === 'upload' && '📁'}
                    {method === 'text' && '📝'}
                  </span>
                ))}
              </div>
              <button className="add-btn">
                <Plus size={20} /> Add
              </button>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div 
          className="item-detail-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="detail-header">
            <button className="back-link" onClick={() => setSelectedItem(null)}>
              ← Back to {categoryTitle}
            </button>
            <h2>{currentItem?.icon} {currentItem?.title}</h2>
            <p>{currentItem?.description}</p>
          </div>

          {!uploadMethod ? (
            <div className="upload-methods">
              <p className="methods-label">Choose how to add this document:</p>
              <div className="methods-grid">
                {currentItem?.methods.includes('camera') && (
                  <motion.button
                    className="method-button camera"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setUploadMethod('camera');
                      setTimeout(handleStartCamera, 100);
                    }}
                  >
                    <Camera size={32} />
                    <span>Take Photo</span>
                    <small>Use your camera</small>
                  </motion.button>
                )}
                {currentItem?.methods.includes('upload') && (
                  <motion.button
                    className="method-button upload"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setUploadMethod('upload');
                      fileInputRef.current?.click();
                    }}
                  >
                    <Upload size={32} />
                    <span>Upload File</span>
                    <small>From your device</small>
                  </motion.button>
                )}
                {currentItem?.methods.includes('text') && (
                  <motion.button
                    className="method-button text"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setUploadMethod('text')}
                  >
                    <FileText size={32} />
                    <span>Add Text</span>
                    <small>Type or paste</small>
                  </motion.button>
                )}
              </div>
            </div>
          ) : uploadMethod === 'camera' && cameraActive ? (
            <div className="camera-view">
              <video ref={videoRef} autoPlay playsInline className="camera-stream" />
              <canvas ref={canvasRef} width={640} height={480} style={{ display: 'none' }} />
              <div className="camera-controls">
                <motion.button className="capture-button" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleCapture}>
                  📸 Capture
                </motion.button>
                <button className="cancel-button" onClick={() => { stopCamera(); setUploadMethod(null); }}>✕ Cancel</button>
              </div>
            </div>
          ) : uploadMethod === 'upload' ? (
            <div className="upload-area">
              <input ref={fileInputRef} type="file" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }} />
              <div className="upload-box" onClick={() => fileInputRef.current?.click()}>
                <Upload size={48} />
                <p>Click to select or drag your file here</p>
                <small>Supports images, PDFs, and documents</small>
              </div>
              <button className="done-button" onClick={() => setUploadMethod(null)}>✅ Done</button>
            </div>
          ) : uploadMethod === 'text' ? (
            <div className="text-input-area">
              <textarea value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder="Enter text, link, or details here..." className="text-area" rows={6} />
              <div className="text-controls">
                <motion.button className="save-button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSaveText} disabled={!textValue.trim()}>💾 Save</motion.button>
                <button className="cancel-button" onClick={() => { setUploadMethod(null); setTextValue(''); }}>✕ Cancel</button>
              </div>
            </div>
          ) : null}
        </motion.div>
      )}

      <div className="bottom-spacing"></div>
    </div>
  );
}
