import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import api from '../api';

const NotificationContext = createContext();

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (err) {
      console.error('[NotificationContext] Fetch error:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      if (socket) socket.close();
      return;
    }

    fetchNotifications();

    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      auth: { token: localStorage.getItem('token') }
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected. Authenticating user:', user.id);
      newSocket.emit('authenticate', {
        id: user.id,
        role: user.role,
        organization_id: user.organization_id,
        year: user.year,
        stream: user.stream
      });
    });

    newSocket.on('unread_sync', (data) => {
      console.log('[Socket] Unread Sync Received:', data);
      if (data && data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    });

    const handleIncomingNotification = (notif) => {
      console.log('[Socket] New Notification Arrived:', notif);

      setNotifications(prev => {
        if (prev.some(n => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });

      setUnreadCount(prev => prev + 1);

      // Trigger rich toast notification
      const toastType = notif.priority === 'critical' ? 'error' : 'info';
      const onClickAction = notif.redirect_url ? () => navigate(notif.redirect_url) : null;

      addToast({
        title: notif.title || 'New Notification',
        message: notif.message,
        image: notif.sender_image,
        type: toastType,
        priority: notif.priority,
        onClick: onClickAction
      });

      // Electron Native OS Notification
      if (window.ipcRenderer) {
        window.ipcRenderer.send('show-notification', {
          title: notif.title || 'Merge Notification',
          body: notif.message
        });
      } else if (window.Notification && Notification.permission === 'granted' && notif.priority !== 'silent') {
        new Notification(notif.title || 'Merge Notification', {
          body: notif.message,
          icon: notif.sender_image || '/favicon.ico'
        });
      }
    };

    newSocket.on('notification', handleIncomingNotification);
    newSocket.on('cohort_notification', handleIncomingNotification);
    newSocket.on('role_notification', handleIncomingNotification);

    newSocket.on('ai_status_update', (status) => {
      if (status.isError && user.role === 'admin') {
        addToast({
          title: 'AI System Alert',
          message: status.displayStatus,
          type: 'error',
          priority: 'critical'
        });
      }
    });

    setSocket(newSocket);

    // Request browser notification permission if available
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      newSocket.close();
    };
  }, [user, fetchNotifications, addToast, navigate]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[NotificationContext] Mark as read error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationContext] Mark all as read error:', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const notifToDelete = notifications.find(n => n.id === id);
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (notifToDelete && !notifToDelete.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('[NotificationContext] Delete notification error:', err);
    }
  };

  const clearAllReadNotifications = async () => {
    try {
      await api.delete('/notifications/clear-read');
      setNotifications(prev => prev.filter(n => !n.is_read));
    } catch (err) {
      console.error('[NotificationContext] Clear read notifications error:', err);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllReadNotifications,
      refreshNotifications: fetchNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
