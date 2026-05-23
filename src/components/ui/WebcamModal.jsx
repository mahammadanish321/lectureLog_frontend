import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Camera, X, RefreshCw, Check, Settings } from 'lucide-react';
import './WebcamModal.css';

const WebcamModal = ({ isOpen, onClose, onCapture, angleLabel }) => {
  const videoRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [photoURL, setPhotoURL] = useState(null);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [error, setError] = useState('');
  const [useFallback, setUseFallback] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  // Enumerate devices when modal opens
  useEffect(() => {
    if (isOpen && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(deviceInfos => {
        const videoDevices = deviceInfos.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
        
        // Default to a real camera (avoid OBS/Virtual by default)
        if (videoDevices.length > 0 && !selectedDeviceId) {
          const realCam = videoDevices.find(d => !d.label.toLowerCase().includes('virtual') && !d.label.toLowerCase().includes('obs'));
          if (realCam) {
            setSelectedDeviceId(realCam.deviceId);
          } else {
            setSelectedDeviceId(videoDevices[0].deviceId);
          }
        }
      }).catch(err => console.log('Error enumerating devices', err));
    }
  }, [isOpen]);

  // Ref to track if we are currently mounted or if a new request superseded this one
  const startRequestRef = useRef(0);

  useEffect(() => {
    if (isOpen && !photoURL) {
      startCamera(selectedDeviceId);
    }
    return () => {
      startRequestRef.current += 1; // invalidate any pending requests
      stopCamera();
    };
  }, [isOpen, photoURL, selectedDeviceId]);

  const startCamera = async (deviceId) => {
    const requestId = ++startRequestRef.current;
    
    setError('');
    setUseFallback(false);
    
    // Stop any existing stream
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported natively. Falling back to AI Stream.');
      }
      
      const constraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // RACECONDITION CHECK: If the component unmounted, or if another startCamera was called
      // while we were awaiting userMedia, we must stop THIS orphaned stream immediately!
      if (startRequestRef.current !== requestId) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      
      // Stop again just in case someone injected a stream synchronously
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      if (startRequestRef.current !== requestId) return;
      console.warn("Native camera failed (likely locked by AI service). Switching to MJPEG fallback.", err);
      setUseFallback(true);
      setFallbackLoading(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setUseFallback(false);
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    let sourceElement = null;
    let isMirrored = false;

    if (useFallback && imgRef.current) {
      sourceElement = imgRef.current;
      canvas.width = sourceElement.naturalWidth || 640;
      canvas.height = sourceElement.naturalHeight || 480;
    } else if (!useFallback && videoRef.current) {
      sourceElement = videoRef.current;
      canvas.width = sourceElement.videoWidth;
      canvas.height = sourceElement.videoHeight;
      isMirrored = true;
    } else {
      return;
    }

    const ctx = canvas.getContext('2d');
    
    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(sourceElement, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhotoBlob(file);
        const url = URL.createObjectURL(blob);
        setPhotoURL(url);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  const retakePhoto = () => {
    if (photoURL) URL.revokeObjectURL(photoURL);
    setPhotoURL(null);
    setPhotoBlob(null);
    startCamera(selectedDeviceId);
  };

  const confirmPhoto = () => {
    if (photoBlob) {
      onCapture(photoBlob);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    if (photoURL) URL.revokeObjectURL(photoURL);
    setPhotoURL(null);
    setPhotoBlob(null);
    onClose();
  };

  // Keyboard shortcuts (Space to capture, Enter to confirm)
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      // Don't trigger if they are typing in an input (though there shouldn't be one here)
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!photoURL && !error && !(useFallback && fallbackLoading)) {
          capturePhoto();
        }
      } else if (e.code === 'Enter') {
        e.preventDefault();
        if (photoURL && photoBlob) {
          confirmPhoto();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="webcam-modal-overlay">
      <div className="webcam-modal-content animate-pop-in">
        <div className="webcam-modal-header">
          <div className="webcam-modal-title">
            <Camera size={18} color="var(--primary)" />
            <h2>Take Photo: {angleLabel}</h2>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {devices.length > 1 && !photoURL && !useFallback && (
              <select 
                value={selectedDeviceId} 
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
              >
                {devices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${devices.indexOf(device) + 1}`}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className="webcam-modal-close" onClick={handleClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="webcam-modal-body">
          {error && !useFallback ? (
            <div className="webcam-error">
              <p>{error}</p>
              <button className="webcam-btn secondary" onClick={() => startCamera(selectedDeviceId)}>Try Again</button>
            </div>
          ) : (
            <div className="webcam-viewfinder">
              {!photoURL ? (
                <>
                  {useFallback ? (
                    <img 
                      ref={imgRef}
                      src="http://127.0.0.1:8001/video_feed?cam=0" 
                      alt="AI Camera Feed" 
                      className="webcam-video" 
                      crossOrigin="anonymous"
                      onLoad={() => setFallbackLoading(false)}
                      onError={() => setError("AI Camera stream offline or unreachable.")}
                      style={{ display: fallbackLoading ? 'none' : 'block' }}
                    />
                  ) : (
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="webcam-video"
                      style={{ transform: 'scaleX(-1)' }} 
                    />
                  )}
                  {useFallback && fallbackLoading && <div style={{ color: 'white' }}>Connecting to AI camera...</div>}
                  {error && useFallback && <div className="webcam-error"><p>{error}</p></div>}
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </>
              ) : (
                <img src={photoURL} alt="Captured" className="webcam-preview-img" />
              )}
            </div>
          )}
        </div>

        <div className="webcam-modal-footer">
          {!photoURL ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button 
                className="webcam-btn primary capture-btn" 
                onClick={capturePhoto}
                disabled={!!error || (useFallback && fallbackLoading)}
              >
                <Camera size={18} />
                Capture Photo
              </button>
              <span style={{ fontSize: '0.75rem', color: '#64748b', userSelect: 'none' }}>
                Press <kbd style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>Space</kbd> to capture
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="webcam-btn secondary" onClick={retakePhoto}>
                  <RefreshCw size={16} />
                  Retake
                </button>
                <button className="webcam-btn primary confirm-btn" onClick={confirmPhoto}>
                  <Check size={16} />
                  Use Photo
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', userSelect: 'none' }}>
                Press <kbd style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>Enter</kbd> to confirm
              </span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WebcamModal;
