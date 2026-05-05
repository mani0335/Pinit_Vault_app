import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Upload, FileText, Plus } from 'lucide-react';
import { Camera as CapacitorCamera } from '@capacitor/camera';
import '../Profile.css';

const ITEMS = [
  { id: 'photos', title: 'Project Photos', icon: '📸', description: 'Screenshots or prototype images', methods: ['camera', 'upload'] },
  { id: 'github', title: 'GitHub Link', icon: '💻', description: 'Repository URL', methods: ['text'] },
  { id: 'video', title: 'Prototype Video', icon: '🎥', description: 'MP4 or demo video file', methods: ['upload'] },
  { id: 'report', title: 'Final Report PDF', icon: '📄', description: 'Project documentation', methods: ['upload'] }
];

export default function ProjectsPage({ categoryTitle = 'Projects', categoryEmoji = '💻', onBack }: any) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'camera' | 'upload' | 'text' | null>(null);
  const [textValue, setTextValue] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentItem = ITEMS.find(item => item.id === selectedItem);

  const handleStartCamera = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: 'base64' as any,
        source: 'camera' as any
      });
      
      if (image?.base64String) {
        console.log('✅ Image captured:', selectedItem);
        const imageData = `data:image/jpeg;base64,${image.base64String}`;
        setCameraActive(false);
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      alert('Camera access denied');
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
      <motion.div className="category-page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <button className="back-button" onClick={onBack}><ArrowLeft size={24} /></button>
        <div className="header-content">
          <h1>{categoryEmoji} {categoryTitle}</h1>
          <p>Add and manage your {categoryTitle.toLowerCase()} documents</p>
        </div>
      </motion.div>

      {!selectedItem ? (
        <motion.div className="items-grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {ITEMS.map((item: any, index: number) => (
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
                {item.methods.map((method: string) => (
                  <span key={method} className={`method-badge ${method}`}>
                    {method === 'camera' && '📸'} {method === 'upload' && '📁'} {method === 'text' && '📝'}
                  </span>
                ))}
              </div>
              <button className="add-btn"><Plus size={20} /> Add</button>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div className="item-detail-container" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="detail-header">
            <button className="back-link" onClick={() => setSelectedItem(null)}>← Back to {categoryTitle}</button>
            <h2>{currentItem?.icon} {currentItem?.title}</h2>
            <p>{currentItem?.description}</p>
          </div>

          {!uploadMethod ? (
            <div className="upload-methods">
              <p className="methods-label">Choose how to add this document:</p>
              <div className="methods-grid">
                {currentItem?.methods.includes('camera') && (
                  <motion.button className="method-button camera" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setUploadMethod('camera'); setTimeout(handleStartCamera, 100); }}>
                    <Camera size={32} /><span>Take Photo</span><small>Use your camera</small>
                  </motion.button>
                )}
                {currentItem?.methods.includes('upload') && (
                  <motion.button className="method-button upload" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setUploadMethod('upload'); fileInputRef.current?.click(); }}>
                    <Upload size={32} /><span>Upload File</span><small>From your device</small>
                  </motion.button>
                )}
                {currentItem?.methods.includes('text') && (
                  <motion.button className="method-button text" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setUploadMethod('text')}>
                    <FileText size={32} /><span>Add Text</span><small>Type or paste</small>
                  </motion.button>
                )}
              </div>
            </div>
          ) : uploadMethod === 'camera' ? (
            <div className="camera-view">
              <div className="camera-placeholder">
                <Camera size={64} />
                <p>Opening camera...</p>
              </div>
              <button className="cancel-button" onClick={() => setUploadMethod(null)}>✕ Cancel</button>
            </div>
          ) : uploadMethod === 'upload' ? (
            <div className="upload-area">
              <input ref={fileInputRef} type="file" onChange={() => setUploadMethod(null)} style={{ display: 'none' }} />
              <div className="upload-box" onClick={() => fileInputRef.current?.click()}><Upload size={48} /><p>Click or drag your file</p><small>Images, PDFs, videos</small></div>
              <button className="done-button" onClick={() => setUploadMethod(null)}>✅ Done</button>
            </div>
          ) : uploadMethod === 'text' ? (
            <div className="text-input-area">
              <textarea value={textValue} onChange={(e) => setTextValue(e.target.value)} placeholder="Enter text, link, or details..." className="text-area" rows={6} />
              <div className="text-controls">
                <motion.button className="save-button" onClick={handleSaveText} disabled={!textValue.trim()}>💾 Save</motion.button>
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
