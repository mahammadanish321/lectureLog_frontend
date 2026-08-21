import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle2, Download, Sparkles, Share2, Users, Library } from 'lucide-react';
import api from '../api';
import './WritingPad.css';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import DocumentSidebar from '../components/SmartPad/DocumentSidebar';
import { AIAssistantWidget } from '../components/SmartPad/AIAssistantWidget';
import { ImmersiveAIMenu } from '../components/SmartPad/ImmersiveAIMenu';
import { SharePadModal } from '../components/SmartPad/SharePadModal';
import { Excalidraw, exportToBlob, MainMenu } from '@excalidraw/excalidraw';
import { io } from 'socket.io-client';
import '@excalidraw/excalidraw/index.css';

// Simple debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fee', color: 'red', height: '100vh', overflow: 'auto' }}>
          <h2>Something went wrong in the component.</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error && this.state.error.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const WritingPad = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [loading, setLoading] = useState(true);
  const [activeDocument, setActiveDocument] = useState(null);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [immersiveMenu, setImmersiveMenu] = useState({ isOpen: false, position: null, selectedElement: null, canvasContext: '' });
  
  // Sidebar Resize State
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing.current) return;
    const newWidth = document.body.clientWidth - e.clientX;
    if (newWidth >= 240 && newWidth <= 800) {
      setSidebarWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  // Sharing & Collaboration State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [isLiveSession, setIsLiveSession] = useState(false);
  const [collaborators, setCollaborators] = useState(1);
  const socketRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);

  // Excalidraw Theme Sync
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    // Cleanup socket on unmount
    return () => {
      observer.disconnect();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Excalidraw Initial Data
  const [initialData, setInitialData] = useState(null);
  const excalidrawAPIRef = useRef(null);

  // Use refs to access current state in debounced function without recreation
  const contentRef = useRef(null);
  const titleRef = useRef(title);
  const isFetchingRef = useRef(true);
  const menuDebounceRef = useRef(null);

  // The actual save API call
  const performSave = async (currentTitle, excalidrawData) => {
    try {
      setSaveStatus('saving');
      const payload = {
        title: currentTitle,
        content_json: excalidrawData
      };
      
      await api.put(`/pads/${id}`, payload);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus('error');
    }
  };

  const debouncedSave = useCallback(
    debounce((newTitle, newContent) => {
      performSave(newTitle, newContent);
    }, 1000),
    [id]
  );

  useEffect(() => {
    let isMounted = true;
    const fetchPad = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/pads/${id}`);
        if (!isMounted) return;

        setTitle(res.data.title || 'Untitled Pad');
        titleRef.current = res.data.title || 'Untitled Pad';
        setIsPublic(res.data.is_public || false);
        
        if (res.data.is_live_active) {
          setIsLiveSession(true);
          initSocketSession();
        }
        
        let loadedData = { elements: [], appState: {} };
        if (res.data.content_json) {
          try {
            const parsed = typeof res.data.content_json === 'string' 
              ? JSON.parse(res.data.content_json) 
              : res.data.content_json;
            
            // If it's old TipTap HTML data, ignore it or clear it
            if (parsed.html !== undefined) {
              loadedData = { elements: [], appState: {} };
            } else {
              loadedData = parsed;
            }
          } catch (e) {
             loadedData = { elements: [], appState: {} };
          }
        }
        
        contentRef.current = loadedData;
        setInitialData(loadedData);
        isFetchingRef.current = false;
        setSaveStatus('saved');
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to fetch pad:', error);
        const msg = error.response?.data?.message || error.message || 'Failed to load pad';
        addToast(msg, 'error');
        navigate('/pads');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPad();

    return () => {
      isMounted = false;
    };
  }, [id, addToast, navigate]);

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    titleRef.current = newTitle;
    setSaveStatus('saving');
    debouncedSave(newTitle, contentRef.current);
  };

  const handleExportPDF = async () => {
    if (!excalidrawAPIRef.current) return;
    
    try {
      const elements = excalidrawAPIRef.current.getSceneElements();
      if (!elements || !elements.length) {
        addToast('The canvas is empty.', 'info');
        return;
      }
      
      const blob = await exportToBlob({
        elements,
        mimeType: 'image/png',
        appState: { exportBackground: true }
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title || 'Pad'}.png`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      addToast('Exported as PNG successfully!', 'success');
    } catch (err) {
      console.error('Failed to export:', err);
      addToast('Export failed', 'error');
    }
  };

  const handlePointerUpdate = useCallback((payload) => {
    if (isLiveSession && socketRef.current) {
      socketRef.current.emit('pointer_update', {
        padId: id,
        pointer: payload.pointer,
        button: payload.button,
        username: user?.name || user?.email?.split('@')[0] || 'Collaborator'
      });
    }
  }, [id, isLiveSession, user]);

  const initSocketSession = () => {
    if (socketRef.current) return;
    
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    socketRef.current = io(`${backendUrl}/pads`, {
      transports: ['websocket', 'polling']
    });
    
    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_pad', id);
    });
    
    socketRef.current.on('collaborator_joined', () => {
      setCollaborators(prev => prev + 1);
      addToast('⚡ A collaborator joined the session!', 'info');
    });

    socketRef.current.on('collaborator_left', () => {
      setCollaborators(prev => Math.max(1, prev - 1));
    });
    
    socketRef.current.on('pad_update', (data) => {
      if (excalidrawAPIRef.current && data.elements) {
        isRemoteUpdateRef.current = true;
        excalidrawAPIRef.current.updateScene({ 
          elements: data.elements,
          ...(data.appState?.viewBackgroundColor ? { appState: { viewBackgroundColor: data.appState.viewBackgroundColor } } : {})
        });
      }
    });

    socketRef.current.on('pointer_update', (data) => {
      if (excalidrawAPIRef.current && data.pointer) {
        const currentAppState = excalidrawAPIRef.current.getAppState();
        const collaboratorsMap = new Map(currentAppState.collaborators || []);
        collaboratorsMap.set(data.socketId, {
          pointer: data.pointer,
          button: data.button || 'up',
          username: data.username || 'Collaborator',
          color: { background: '#105934', stroke: '#105934' }
        });
        excalidrawAPIRef.current.updateScene({ collaborators: collaboratorsMap });
      }
    });
  };

  const startLiveSession = async (audienceSettings = {}) => {
    setIsLiveSession(true);
    setIsPublic(true);

    try {
      await api.put(`/pads/${id}`, { 
        is_public: true,
        is_live_active: true,
        target_audience_type: audienceSettings.targetAudienceType || 'everyone',
        target_year: audienceSettings.targetYear || null,
        target_stream: audienceSettings.targetStream || null,
        invited_user_ids: audienceSettings.invitedUserIds || [],
        live_mode: audienceSettings.collabPermission || 'edit'
      });
    } catch (err) {
      console.error('Failed to mark pad as active live session in DB:', err);
    }
    
    initSocketSession();
  };

  const stopLiveSession = async () => {
    setIsLiveSession(false);
    try {
      await api.put(`/pads/${id}`, { is_live_active: false });
    } catch (err) {
      console.error('Failed to update live session state in DB:', err);
    }
    if (socketRef.current) {
      socketRef.current.emit('leave_pad', id);
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    addToast('Live session stopped', 'info');
  };

  const onExcalidrawChange = (elements, appState) => {
    if (isFetchingRef.current) return;
    
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    if (isLiveSession && socketRef.current) {
      socketRef.current.emit('pad_update', { 
        padId: id, 
        elements,
        appState: { viewBackgroundColor: appState.viewBackgroundColor }
      });
    }
    
    // Save logic
    const excalidrawData = { 
      elements, 
      appState: { 
        viewBackgroundColor: appState.viewBackgroundColor 
      } 
    };
    
    contentRef.current = excalidrawData;
    setSaveStatus('saving');
    debouncedSave(titleRef.current, excalidrawData);

    // Immersive AI Menu Logic
    // Don't show menu if user is dragging or resizing
    if (appState.draggingElement || appState.resizingElement || appState.multiElement) {
      if (immersiveMenu.isOpen) setImmersiveMenu(prev => ({ ...prev, isOpen: false }));
      return;
    }

    const selectedIds = Object.keys(appState.selectedElementIds || {}).filter(id => appState.selectedElementIds[id]);
    
    if (selectedIds.length > 0) {
      if (menuDebounceRef.current) clearTimeout(menuDebounceRef.current);
      
      menuDebounceRef.current = setTimeout(() => {
        const selectedElements = elements.filter(el => selectedIds.includes(el.id) && !el.isDeleted);
        
        if (selectedElements.length > 0) {
          // Bounding box for multiple elements
          const minX = Math.min(...selectedElements.map(el => el.x));
          const maxX = Math.max(...selectedElements.map(el => el.x + el.width));
          const minY = Math.min(...selectedElements.map(el => el.y));

          // Extract text from selected elements (if any)
          const selectedTextStr = selectedElements
            .filter(el => el.type === 'text')
            .map(el => el.text)
            .join('\\n\\n');
          
          // Manual coordinate calculation from scene to viewport
          const zoom = typeof appState.zoom === 'number' ? appState.zoom : (appState.zoom?.value || 1);
          const scrollX = appState.scrollX || 0;
          const scrollY = appState.scrollY || 0;
          
          // Top-right of the bounding box
          const sceneX = maxX;
          const sceneY = minY;
          
          // Place it to the right of the element
          const viewportX = (sceneX + scrollX) * zoom + 40;
          const viewportY = (sceneY + scrollY) * zoom + 10; 

          const safeX = isNaN(viewportX) ? 0 : viewportX;
          const safeY = isNaN(viewportY) ? 0 : viewportY;

          // Gather Canvas Context (all other text on canvas)
          const canvasContext = elements
            .filter(el => el.type === 'text' && !el.isDeleted && !selectedIds.includes(el.id))
            .map(el => el.text)
            .join('\\n\\n');

          setImmersiveMenu(prev => {
            if (prev.isOpen && prev.position?.x === safeX && prev.position?.y === safeY && prev.selectedText === selectedTextStr) {
              return prev;
            }
            return {
              isOpen: true,
              position: { x: safeX, y: safeY },
              selectedElement: selectedElements[0], // Keep primary element for anchoring
              selectedText: selectedTextStr,
              canvasContext
            };
          });
        } else {
          setImmersiveMenu(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
        }
      }, 300); // 300ms debounce to wait for selection to finish
    } else {
      if (menuDebounceRef.current) clearTimeout(menuDebounceRef.current);
      setImmersiveMenu(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
    }
  };

  const handleImmersiveActionComplete = async (newText, isReplace, isDiagram = false) => {
    if (!excalidrawAPIRef.current || !immersiveMenu.selectedElement) return;
    
    if (!newText || newText.trim() === '') {
      alert("AI returned an empty response. Check backend console for errors.");
      return;
    }

    if (isDiagram) {
      try {
        const { parseMermaidToExcalidraw } = await import('@excalidraw/mermaid-to-excalidraw');
        let cleanMermaid = newText;
        if (cleanMermaid.startsWith('```mermaid')) {
          cleanMermaid = cleanMermaid.replace(/^```mermaid\n/, '').replace(/\n```$/, '');
        }
        if (cleanMermaid.startsWith('```')) {
          cleanMermaid = cleanMermaid.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        const res = await parseMermaidToExcalidraw(cleanMermaid, { fontSize: 20 });
        const elements = excalidrawAPIRef.current.getSceneElements();
        const originalEl = immersiveMenu.selectedElement;
        
        const offsetX = originalEl.x + originalEl.width + 80;
        const offsetY = originalEl.y;
        
        const minX = Math.min(...res.elements.map(el => el.x));
        const minY = Math.min(...res.elements.map(el => el.y));

        const offsetElements = res.elements.map(el => ({
            ...el,
            x: el.x - minX + offsetX,
            y: el.y - minY + offsetY
        }));

        excalidrawAPIRef.current.updateScene({ elements: [...elements, ...offsetElements] });
      } catch (err) {
        console.error("Failed to parse mermaid diagram", err);
        alert("Failed to insert diagram. It might be too complex or invalid Mermaid syntax.");
      }
      return;
    }

    const elements = excalidrawAPIRef.current.getSceneElements();
    const originalEl = immersiveMenu.selectedElement;

    if (isReplace) {
      // Replace the text of the selected element
      const updatedElements = elements.map(el => {
        if (el.id === originalEl.id) {
          return { ...el, text: newText, originalText: newText, updated: Date.now(), version: el.version + 1 };
        }
        return el;
      });
      excalidrawAPIRef.current.updateScene({ elements: updatedElements });
    } else {
      // Spawn a new text box adjacent to the original
      const newElement = {
        ...originalEl,
        id: `ai-text-${Date.now()}`,
        x: originalEl.x + originalEl.width + 40,
        text: newText,
        originalText: newText,
        seed: Math.random() * 100000,
        version: 1,
        versionNonce: Math.random() * 100000,
        updated: Date.now(),
        boundElements: null,
      };
      excalidrawAPIRef.current.updateScene({ elements: [...elements, newElement] });
    }
  };

  if (loading || !initialData) {
    return (
      <div className="pad-editor-container animate-fade-in" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="smart-pad-wrapper" style={{ display: 'flex' }}>
      
      <div className="pad-editor-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Editor Header */}
        <div className="pad-editor-header" style={{ flexShrink: 0 }}>
          <div className="pad-header-left">
            <button className="icon-btn-ghost" onClick={() => navigate('/pads')}>
              <ArrowLeft size={20} />
            </button>
            <input 
              type="text"
              className="pad-title-input"
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled Pad"
            />
          </div>
        </div>

        {/* Editor Canvas (Excalidraw) */}
        <div className="pad-editor-canvas" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Excalidraw 
            excalidrawAPI={(api) => excalidrawAPIRef.current = api}
            initialData={initialData}
            onChange={onExcalidrawChange}
            onPointerUpdate={handlePointerUpdate}
            theme={isDark ? 'dark' : 'light'}
            UIOptions={{
              canvasActions: {
                toggleTheme: false,
                changeViewBackgroundColor: true,
              }
            }}
            renderTopRightUI={() => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '8px' }}>
                <div className="pad-save-status" style={{ fontSize: '0.8rem' }}>
                  {saveStatus === 'saved' && <span className="status-text saved" style={{ color: 'var(--text-secondary)' }}><CheckCircle2 size={14} /> Saved</span>}
                  {saveStatus === 'error' && <span className="status-text error">Error saving</span>}
                </div>
                
                <button 
                  onClick={handleExportPDF}
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
                  <Download size={14} /> Export Image
                </button>

                {!isLibraryOpen && (
                  <button
                    onClick={() => setIsLibraryOpen(true)}
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
                    <Library size={14} /> Study Sources
                  </button>
                )}
              </div>
            )}
          >
            <MainMenu>
              <MainMenu.Item onSelect={() => {
                if (excalidrawAPIRef.current) {
                  excalidrawAPIRef.current.updateScene({
                    appState: { openSidebar: { name: "default", tab: "library" } }
                  });
                }
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Library size={14} /> Library
                </div>
              </MainMenu.Item>
              <MainMenu.Separator />
              <MainMenu.DefaultItems.LoadScene />
              <MainMenu.DefaultItems.Export />
              <MainMenu.DefaultItems.SaveAsImage />
              <MainMenu.DefaultItems.Help />
              <MainMenu.DefaultItems.ClearCanvas />
              <MainMenu.Separator />
              <MainMenu.DefaultItems.ChangeCanvasBackground />
            </MainMenu>
          </Excalidraw>

          {/* Custom Bottom Right UI */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            right: '70px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 10
          }}>
            <button 
              onClick={() => setIsShareModalOpen(true)}
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isLiveSession ? '#4bce97' : 'var(--surface-bg)',
                border: isLiveSession ? 'none' : '1px solid var(--border-color)',
                color: isLiveSession ? 'white' : 'var(--text-primary)',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isLiveSession) e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
              }}
              onMouseLeave={(e) => {
                if (!isLiveSession) e.currentTarget.style.backgroundColor = 'var(--surface-bg)';
              }}
              title="Live Collaboration & Sharing"
            >
              <Share2 size={16} />
              {isLiveSession && (
                <div style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  background: '#4bce97',
                  color: '#000',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #232329'
                }}>
                  {collaborators}
                </div>
              )}
            </button>
          </div>

          <ImmersiveAIMenu 
            isOpen={immersiveMenu.isOpen}
            onClose={() => setImmersiveMenu(prev => ({ ...prev, isOpen: false }))}
            position={immersiveMenu.position}
            selectedText={immersiveMenu.selectedText || ''}
            canvasContext={immersiveMenu.canvasContext}
            onActionComplete={handleImmersiveActionComplete}
            excalidrawAPI={excalidrawAPIRef.current}
          />
        </div>

        <SharePadModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)} 
          padId={id} 
          initialIsPublic={isPublic}
          isLiveSession={isLiveSession}
          onLiveSessionStart={startLiveSession}
          onLiveSessionStop={stopLiveSession}
          userName={user?.name}
        />

      </div>

      {isLibraryOpen && (
        <>
          {/* Resize Handle */}
          <div 
            style={{
              width: '4px',
              cursor: 'col-resize',
              backgroundColor: 'var(--border-color)',
              zIndex: 10,
              flexShrink: 0
            }}
            onMouseDown={handleMouseDown}
          />
          {/* Sidebar */}
          <div style={{ width: sidebarWidth, flexShrink: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-bg)' }}>
            <DocumentSidebar 
              padId={id} 
              activeDocumentId={activeDocument?.pad_document_id} 
              onSelectDocument={setActiveDocument} 
              isOpen={isLibraryOpen}
              onClose={() => setIsLibraryOpen(false)}
              excalidrawAPI={excalidrawAPIRef.current}
            />
          </div>
        </>
      )}
    </div>
    </ErrorBoundary>
  );
};

export default WritingPad;
