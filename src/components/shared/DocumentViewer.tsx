import React, { useState } from 'react';
import { Download, Eye, EyeOff, FileText, Image, File } from 'lucide-react';
import { PortfolioDocument } from '@/types/portfolio';

interface DocumentViewerProps {
  document: PortfolioDocument;
  allowDownload?: boolean;
  watermarkEnabled?: boolean;
  watermarkText?: string;
  className?: string;
}

export default function DocumentViewer({
  document,
  allowDownload = true,
  watermarkEnabled = false,
  watermarkText = "PINIT Vault Protected",
  className = ""
}: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  const isImage = document.type.startsWith('image/');
  const isPDF = document.type === 'application/pdf';

  const handleDownload = async () => {
    if (!allowDownload) {
      console.log('🚫 Download not allowed for this document');
      return;
    }

    try {
      console.log('📥 Downloading document:', document.name);
      
      // Create download link
      const link = window.document.createElement('a');
      link.href = document.file_url;
      link.download = document.name;
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      console.log('✅ Download started for:', document.name);
    } catch (error) {
      console.error('❌ Download failed:', error);
      setError('Download failed');
    }
  };

  const renderPreview = () => {
    if (!showPreview) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
          <div className="text-center">
            <EyeOff className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Preview hidden</p>
            <button
              onClick={() => setShowPreview(true)}
              className="text-blue-500 hover:text-blue-700 text-sm mt-2"
            >
              Show preview
            </button>
          </div>
        </div>
      );
    }

    if (isImage) {
      return (
        <div className="relative">
          <div className={`relative ${watermarkEnabled ? 'watermark-container' : ''}`}>
            <img
              src={document.file_url}
              alt={document.name}
              className="w-full h-auto rounded-lg shadow-lg"
              onLoad={() => {
                setIsLoading(false);
                console.log('✅ Image loaded successfully:', document.name);
              }}
              onError={() => {
                setIsLoading(false);
                setError('Failed to load image');
                console.error('❌ Image load failed:', document.name);
              }}
              style={{ 
                maxHeight: '600px',
                objectFit: 'contain'
              }}
            />
            
            {watermarkEnabled && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div 
                  className="text-blue-500/20 text-4xl font-bold rotate-45 select-none transform scale-150"
                  style={{
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                >
                  {watermarkText}
                </div>
              </div>
            )}
          </div>
          
          {watermarkEnabled && (
            <div className="absolute top-2 right-2 bg-blue-500/20 backdrop-blur-sm px-2 py-1 rounded-full">
              <Eye className="w-4 h-4 text-blue-600 inline mr-1" />
              <span className="text-xs text-blue-600">Protected</span>
            </div>
          )}
        </div>
      );
    }

    if (isPDF) {
      return (
        <div className="relative">
          <iframe
            src={document.file_url}
            title={document.name}
            className="w-full h-96 md:h-[600px] rounded-lg shadow-lg border"
            onLoad={() => {
              setIsLoading(false);
              console.log('✅ PDF loaded successfully:', document.name);
            }}
            onError={() => {
              setIsLoading(false);
              setError('Failed to load PDF');
              console.error('❌ PDF load failed:', document.name);
            }}
          />
          
          {watermarkEnabled && (
            <div className="absolute top-2 right-2 bg-blue-500/20 backdrop-blur-sm px-2 py-1 rounded-full">
              <Eye className="w-4 h-4 text-blue-600 inline mr-1" />
              <span className="text-xs text-blue-600">Protected</span>
            </div>
          )}
        </div>
      );
    }

    // For unsupported file types, show file info
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 font-medium">{document.name}</p>
          <p className="text-gray-500 text-sm">{document.type}</p>
          <p className="text-gray-400 text-xs">
            {(document.size / 1024).toFixed(1)} KB
          </p>
          {allowDownload && (
            <button
              onClick={handleDownload}
              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              Download File
            </button>
          )}
        </div>
      </div>
    );
  };

  const getFileIcon = () => {
    if (isImage) return <Image className="w-5 h-5" />;
    if (isPDF) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-gray-600">
              {getFileIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {document.name}
              </h3>
              <p className="text-xs text-gray-500">
                {document.type} • {(document.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isImage && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                title={showPreview ? "Hide preview" : "Show preview"}
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
            
            {allowDownload && (
              <button
                onClick={handleDownload}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-64 bg-red-50 rounded-lg">
            <div className="text-center">
              <p className="text-red-600 font-medium">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                }}
                className="mt-2 text-blue-500 hover:text-blue-700 text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {!isLoading && !error && renderPreview()}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t">
        <p className="text-xs text-gray-400">
          Uploaded {new Date(document.uploaded_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

// Add CSS for watermark
const style = window.document.createElement('style');
style.textContent = `
  .watermark-container {
    position: relative;
  }
  
  .watermark-container::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 1;
  }
  
  .watermark-container img {
    position: relative;
    z-index: 0;
  }
`;
window.document.head.appendChild(style);
