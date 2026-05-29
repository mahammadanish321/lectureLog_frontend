import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from './ToastContext';
import api from '../api';

const RegistrationQueueContext = createContext();

export const RegistrationQueueProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const { addToast } = useToast();
  
  const isProcessing = useRef(false);
  const cancelSet = useRef(new Set());
  
  const addRegistration = useCallback((taskPayload) => {
    const newTask = {
      ...taskPayload,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      status: 'queued',
      progress: { current: 0, steps: [], label: 'Waiting...' }
    };
    setQueue(prev => [...prev, newTask]);
    addToast(`${taskPayload.name} added to registration queue.`, 'info');
  }, [addToast]);

  const cancelTask = useCallback((taskId) => {
    cancelSet.current.add(taskId);
    setQueue(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const cancelAllTasks = useCallback(() => {
    if (activeTask) {
      cancelSet.current.add(activeTask.id);
    }
    setQueue(prev => {
      prev.forEach(t => cancelSet.current.add(t.id));
      return [];
    });
  }, [activeTask]);
  
  const processNext = useCallback(async () => {
    if (isProcessing.current || queue.length === 0) return;
    
    isProcessing.current = true;
    const task = queue[0];
    setActiveTask(task);
    setQueue(prev => prev.slice(1));
    
    if (cancelSet.current.has(task.id)) {
      isProcessing.current = false;
      setActiveTask(null);
      return;
    }
    
    const updateProgress = (current, steps, label) => {
      setActiveTask(prev => {
        if (!prev || prev.id !== task.id) return prev;
        return { ...prev, progress: { current, steps, label } };
      });
    };

    try {
      // For Vite frontend, sometimes window.process is not fully mocked, 
      // but in typical electron setups we check userAgent or process
      const isElectron = navigator.userAgent.toLowerCase().includes('electron') || (window.process && window.process.type);
      const AI_SERVICE_URL = 'http://127.0.0.1:8001';
      
      const steps = ['Saving profile', ...task.selectedAngles.map(a => `Processing ${a.label}`), 'Complete'];
      updateProgress(0, steps, steps[0]);
      
      let embeddingsArray = null;
      let failedAngles = [];
      let verifiedAngles = {};
      
      // Initialize all selected angles to true
      task.selectedAngles.forEach(a => {
        verifiedAngles[a.key] = true;
      });

       if (isElectron) {
         embeddingsArray = [];
         for (let i = 0; i < task.selectedAngles.length; i++) {
            if (cancelSet.current.has(task.id)) throw new Error('Cancelled');
            
            const a = task.selectedAngles[i];
            const fd = new FormData();
            fd.append('file', task.files[a.key]);
            
            updateProgress(i + 1, steps, steps[i + 1]);
            
            const r = await fetch(`${AI_SERVICE_URL}/embed`, { method: 'POST', body: fd });
            const d = await r.json();
            
            if (!r.ok || d.error || d.face_detected === false || !d.embedding) {
              console.warn(`Face not detected for ${a.label}: ${d.error || 'No embedding returned'}`);
              embeddingsArray.push(null); // Soft-fail: record null for this angle
              failedAngles.push(a.label);
              verifiedAngles[a.key] = false;
              continue;
            }
            embeddingsArray.push(d.embedding);
          }
      }
      
      if (cancelSet.current.has(task.id)) throw new Error('Cancelled');
      
      updateProgress(steps.length - 1, steps, 'Saving to server...');
      
      const data = new FormData();
      if (task.data instanceof FormData) {
          for (let [key, value] of task.data.entries()) {
            data.append(key, value);
          }
      } else {
          Object.keys(task.data).forEach(k => data.append(k, task.data[k]));
      }
      
      data.append('image', task.files['front']);
      task.selectedAngles.forEach(a => {
        if (a.key !== 'front') data.append('image_' + a.key, task.files[a.key]);
      });

       if (embeddingsArray) {
         const validEmbeddings = embeddingsArray.filter(e => e !== null);
         data.append('face_embeddings', JSON.stringify(validEmbeddings));
       }
       
       data.append('verified_angles', JSON.stringify(verifiedAngles));
      
      const endpoint = task.type === 'teacher' ? '/teachers' : '/students';
      await api.post(endpoint, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      
       updateProgress(steps.length, steps, '✅ Registered successfully!');
       if (isElectron && embeddingsArray && failedAngles.length > 0) {
         addToast(`${task.name} registered but face not detected in: ${failedAngles.join(', ')}. Please update these photos later.`, 'warning', 8000);
       } else {
         addToast(`${task.name} registered successfully!`, 'success');
       }
      
      await new Promise(r => setTimeout(r, 2000));
      
    } catch (err) {
      if (err.message === 'Cancelled') {
        addToast(`${task.name} registration cancelled.`, 'info');
      } else {
        const msg = err.response?.data?.message || err.message;
        updateProgress(0, [], `❌ ${msg}`);
        addToast(`Failed to register ${task.name}: ${msg}`, 'error');
        await new Promise(r => setTimeout(r, 4000));
      }
    } finally {
       cancelSet.current.delete(task.id);
       isProcessing.current = false;
       setActiveTask(null);
    }
  }, [queue, addToast]);

  useEffect(() => {
    if (!activeTask && queue.length > 0) {
      processNext();
    }
  }, [activeTask, queue, processNext]);

  // Prevent accidental tab close/refresh if queue is active
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (activeTask || queue.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Standard way to trigger the browser's warning dialog
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeTask, queue]);

  return (
    <RegistrationQueueContext.Provider value={{ queue, activeTask, addRegistration, cancelTask, cancelAllTasks }}>
      {children}
    </RegistrationQueueContext.Provider>
  );
};

export const useRegistrationQueue = () => useContext(RegistrationQueueContext);
