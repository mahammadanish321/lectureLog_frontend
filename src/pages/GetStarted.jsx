import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Users, BookOpen, ShieldCheck, ArrowRight, Video, Calendar, Activity, CheckCircle2 } from 'lucide-react';
import { MouseFollowingEyes } from '../components/MouseFollowingEyes';
import './GetStarted.css';

const GetStarted = () => {
  const navigate = useNavigate();

  return (
    <div className="get-started-container">
      {/* Background decoration */}
      <div className="bg-blob bg-blob-1"></div>
      <div className="bg-blob bg-blob-2"></div>

      <div className="gs-content-wrapper">
        <header className="gs-header">
          <div className="gs-badge">Getting Started</div>
          <h1 className="gs-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ marginRight: '12px' }}>Welcome to</span>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              LectureL<MouseFollowingEyes />
            </span>
          </h1>
          <p className="gs-subtitle">
            The next-generation AI-powered platform for seamless attendance, real-time classroom monitoring, and intelligent schedule management.
          </p>
        </header>

        <div className="gs-grid">
          {/* Admin Card */}
          <div className="gs-card">
            <div className="gs-icon-wrapper">
              <ShieldCheck size={32} />
            </div>
            <h3 className="gs-card-title">For Administrators</h3>
            <p className="gs-card-text">
              Command central for your institution. Manage infrastructure, users, and oversee the entire academic routine with absolute precision.
            </p>
            <ul className="gs-feature-list">
              <li className="gs-feature-item"><CheckCircle2 className="gs-feature-icon" size={18} /> Monitor all active sessions</li>
              <li className="gs-feature-item"><CheckCircle2 className="gs-feature-icon" size={18} /> Manage student and teacher registries</li>
              <li className="gs-feature-item"><CheckCircle2 className="gs-feature-icon" size={18} /> Design the master routine</li>
            </ul>
          </div>

          {/* Teacher Card */}
          <div className="gs-card">
            <div className="gs-icon-wrapper">
              <BookOpen size={32} />
            </div>
            <h3 className="gs-card-title">For Teachers</h3>
            <p className="gs-card-text">
              Focus on teaching while our AI handles the attendance. Manage your daily classes and schedule custom sessions effortlessly.
            </p>
            <ul className="gs-feature-list">
              <li className="gs-feature-item"><CheckCircle2 className="gs-feature-icon" size={18} /> Start and manage live classes</li>
              <li className="gs-feature-item"><CheckCircle2 className="gs-feature-icon" size={18} /> AI-driven automatic attendance</li>
              <li className="gs-feature-item"><CheckCircle2 className="gs-feature-icon" size={18} /> Schedule custom one-off sessions</li>
            </ul>
          </div>

          {/* Student Card */}
          <div className="gs-card">
            <div className="gs-icon-wrapper">
              <Users size={32} />
            </div>
            <h3 className="gs-card-title">For Students</h3>
            <p className="gs-card-text">
              Stay on top of your academic life. Track your attendance records instantly and never miss an update on your daily schedule.
            </p>
            <ul className="gs-feature-list">
              <li className="gs-feature-item"><CheckCircle2 className="gs-feature-icon" size={18} /> View real-time attendance status</li>
              <li className="gs-feature-item"><CheckCircle2 className="gs-feature-icon" size={18} /> Access personalized daily timetables</li>
              <li className="gs-feature-item"><CheckCircle2 className="gs-feature-icon" size={18} /> Watch live classroom streams</li>
            </ul>
          </div>
        </div>

        <div className="gs-action-area">
          <button className="gs-cta-btn" onClick={() => navigate('/login')}>
            Enter LectureLog <ArrowRight size={20} />
          </button>
          <p className="gs-footer-text">Secure, intelligent, and designed for modern education.</p>
        </div>
      </div>
    </div>
  );
};

export default GetStarted;
