import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Monitor, Users, BookOpen, Clock, Calendar, Settings, FileText, CornerDownLeft, Loader2, History, X } from 'lucide-react';
import api from '../api';
import './CommandPalette.css';

const LOCAL_COMMANDS = [
  { id: 'nav-students', title: 'Students', icon: <Users size={16} />, path: '/students', group: 'Navigation' },
  { id: 'nav-teachers', title: 'Teachers', icon: <Users size={16} />, path: '/teachers', group: 'Navigation' },
  { id: 'nav-subjects', title: 'Subjects', icon: <BookOpen size={16} />, path: '/subjects', group: 'Navigation' },
  { id: 'nav-classrooms', title: 'Classrooms', icon: <Monitor size={16} />, path: '/classrooms', group: 'Navigation' },
  { id: 'nav-routine', title: 'Routine / Timetable', icon: <Calendar size={16} />, path: '/routine', group: 'Navigation' },
  { id: 'nav-dashboard', title: 'Dashboard', icon: <Monitor size={16} />, path: '/dashboard', group: 'Navigation' },
  { id: 'nav-settings', title: 'Settings', icon: <Settings size={16} />, path: '/settings', group: 'Navigation' },
  { id: 'action-student', title: 'Create Student', icon: <FileText size={16} />, path: '/students', group: 'Actions' },
  { id: 'action-teacher', title: 'Create Teacher', icon: <FileText size={16} />, path: '/teachers', group: 'Actions' },
  { id: 'action-subject', title: 'Create Subject', icon: <FileText size={16} />, path: '/subjects', group: 'Actions' },
];

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Load recent searches
  useEffect(() => {
    try {
      const stored = localStorage.getItem('merge_recent_searches');
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Save recent search
  const saveRecentSearch = (item) => {
    try {
      const newRecent = [item, ...recentSearches.filter(r => r.title !== item.title)].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem('merge_recent_searches', JSON.stringify(newRecent));
    } catch (e) {
      console.error(e);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // It's handled by Layout usually to open it, but if it's already mounted:
          // Wait, CommandPalette is conditional in Layout. Layout handles the shortcut to open.
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults(getInitialResults());
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const getInitialResults = () => {
    const initial = [];
    if (recentSearches.length > 0) {
      initial.push({ group: 'Recent', items: recentSearches.map(r => ({ ...r, isRecent: true })) });
    }
    initial.push({ group: 'Navigation', items: LOCAL_COMMANDS.filter(c => c.group === 'Navigation') });
    return initial;
  };

  // Search logic (Debounced)
  useEffect(() => {
    if (!isOpen) return;

    if (query.trim().length < 2) {
      setResults(getInitialResults());
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      
      // Local commands filter
      const q = query.toLowerCase();
      const localMatches = LOCAL_COMMANDS.filter(cmd => cmd.title.toLowerCase().includes(q));
      
      try {
        const { data } = await api.get(`/search/global?q=${encodeURIComponent(query)}`);
        
        const newResults = [];
        
        if (localMatches.length > 0) {
          newResults.push({ group: 'Commands', items: localMatches });
        }
        
        if (data.students?.length > 0) {
          newResults.push({
            group: 'Students',
            items: data.students.map(s => ({
              id: `student-${s.id}`,
              title: s.name,
              subtitle: `Roll: ${s.roll || 'N/A'} • ${s.stream || ''} Year ${s.year || ''}`,
              icon: <Users size={16} />,
              path: `/students`, // Could go to specific profile if routing existed
            }))
          });
        }

        if (data.teachers?.length > 0) {
          newResults.push({
            group: 'Teachers',
            items: data.teachers.map(t => ({
              id: `teacher-${t.id}`,
              title: t.name,
              subtitle: t.email,
              icon: <Users size={16} />,
              path: `/teachers`
            }))
          });
        }

        if (data.subjects?.length > 0) {
          newResults.push({
            group: 'Subjects',
            items: data.subjects.map(s => ({
              id: `subject-${s.id}`,
              title: s.name,
              subtitle: s.code,
              icon: <BookOpen size={16} />,
              path: `/subjects`
            }))
          });
        }

        if (data.classrooms?.length > 0) {
          newResults.push({
            group: 'Classrooms',
            items: data.classrooms.map(c => ({
              id: `classroom-${c.id}`,
              title: c.name,
              subtitle: c.camera_name,
              icon: <Monitor size={16} />,
              path: `/classrooms`
            }))
          });
        }

        if (data.sessions?.length > 0) {
          newResults.push({
            group: 'Sessions',
            items: data.sessions.map(s => ({
              id: `session-${s.id}`,
              title: s.subject_name,
              subtitle: `${s.teacher_name || 'N/A'} • ${s.status}`,
              icon: <Clock size={16} />,
              path: `/dashboard` // or routine
            }))
          });
        }

        setResults(newResults);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Flatten results for keyboard navigation
  const flatItems = results.flatMap(group => group.items);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (flatItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % (flatItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems.length > 0) {
        handleSelect(flatItems[selectedIndex]);
      }
    }
  };

  const handleSelect = (item) => {
    saveRecentSearch({ title: item.title, path: item.path, iconType: item.group });
    onClose();
    if (item.path) {
      navigate(item.path);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette-modal" onClick={e => e.stopPropagation()}>
        <div className="command-palette-input-wrapper">
          <Search size={20} />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="Search students, sessions, commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {isLoading && <Loader2 size={18} className="search-loading-spinner text-muted-foreground" />}
          {query.length > 0 && !isLoading && (
            <button className="circle-btn" style={{ width: 24, height: 24 }} onClick={() => setQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="command-palette-body">
          {flatItems.length === 0 && !isLoading ? (
            <div className="command-palette-empty">
              <Search size={40} className="command-palette-empty-icon" />
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            results.map((group, gIdx) => (
              <div key={gIdx} className="command-palette-group">
                <div className="command-palette-group-title">{group.group}</div>
                {group.items.map((item) => {
                  const itemIndex = results.slice(0, gIdx).reduce((acc, g) => acc + g.items.length, 0) + group.items.indexOf(item);
                  const isSelected = itemIndex === selectedIndex;
                  
                  return (
                    <div
                      key={item.id}
                      className="command-palette-item"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(itemIndex)}
                    >
                      <div className="command-palette-item-icon">
                        {item.isRecent ? <History size={16} /> : item.icon}
                      </div>
                      <div className="command-palette-item-content">
                        <div className="command-palette-item-title">
                          {item.title}
                          {isSelected && <CornerDownLeft size={14} className="text-muted-foreground" />}
                        </div>
                        {item.subtitle && <div className="command-palette-item-subtitle">{item.subtitle}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
