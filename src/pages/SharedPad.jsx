import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, LogIn } from 'lucide-react';
import api from '../api';
import './WritingPad.css';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';

const SharedPad = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Excalidraw Theme Sync
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const [initialData, setInitialData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSharedPad = async () => {
      try {
        setLoading(true);
        // Note: this calls the public endpoint
        const res = await api.get(`/pads/shared/${id}`);
        if (!isMounted) return;

        setTitle(res.data.title || 'Shared Pad');
        
        let loadedData = { elements: [], appState: {} };
        if (res.data.content_json) {
          try {
            const parsed = typeof res.data.content_json === 'string' 
              ? JSON.parse(res.data.content_json) 
              : res.data.content_json;
            if (parsed.html === undefined) {
              loadedData = parsed;
            }
          } catch (e) {
             console.error("Parse error", e);
          }
        }
        
        setInitialData(loadedData);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to fetch shared pad:', error);
        addToast('Pad is not available or not public', 'error');
        navigate('/login'); // Redirect to login or home if not found
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSharedPad();

    return () => {
      isMounted = false;
    };
  }, [id, addToast, navigate]);

  const handleSaveToDesk = async () => {
    try {
      const res = await api.post('/pads', {
        title: `${title} (Copy)`,
        content_json: initialData
      });
      addToast('Pad copied to your account!', 'success');
      navigate(`/pads/${res.data.id}`);
    } catch (err) {
      console.error('Failed to copy pad:', err);
      addToast('Failed to save pad', 'error');
    }
  };

  if (loading || !initialData) {
    return (
      <div className="pad-editor-container animate-fade-in" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const padContent = (
    <div className="pad-editor-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      
      {/* Editor Header */}
      <div className="pad-editor-header" style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="pad-header-left">
          <button className="icon-btn-ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div className="pad-title-input" style={{ pointerEvents: 'none', border: 'none', background: 'transparent' }}>
            {title} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '8px', background: 'var(--surface-bg)', padding: '2px 8px', borderRadius: '12px' }}>Read Only</span>
          </div>
        </div>
      </div>

      {/* Editor Canvas (Excalidraw) */}
      <div className="pad-editor-canvas" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Excalidraw 
          initialData={initialData}
          theme={isDark ? 'dark' : 'light'}
          viewModeEnabled={true}
          UIOptions={{
            canvasActions: {
              toggleTheme: false,
              changeViewBackgroundColor: false,
              clearCanvas: false,
              export: false,
              loadScene: false,
              saveToActiveFile: false,
            }
          }}
          renderTopRightUI={() => (
            <div style={{ display: 'flex', alignItems: 'center', marginRight: '8px' }}>
              {!user ? (
                <button 
                  onClick={() => navigate('/login')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'var(--surface-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-bg)'}
                >
                  <LogIn size={14} /> Log in to Merge
                </button>
              ) : (
                <button 
                  onClick={handleSaveToDesk}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'var(--surface-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-bg)'}
                >
                  <Save size={14} /> Save to your Pads
                </button>
              )}
            </div>
          )}
        >
          <MainMenu>
            <MainMenu.DefaultItems.Help />
          </MainMenu>
        </Excalidraw>
      </div>
    </div>
  );

  // If user is logged in, wrap in the standard app layout
  if (user) {
    return (
      <Layout>
        <div className="smart-pad-wrapper" style={{ display: 'flex', height: '100%' }}>
          {padContent}
        </div>
      </Layout>
    );
  }

  // If guest, show full screen presentation view
  return (
    <div className="smart-pad-wrapper" style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {padContent}
    </div>
  );
};

export default SharedPad;
