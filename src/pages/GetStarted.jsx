import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ContainerScroll } from "../components/ui/container-scroll-animation";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ChevronRight, ShieldCheck, Zap, BarChart3, Users,
  LayoutDashboard, CalendarDays, BookOpen, GraduationCap,
  School, MonitorPlay, UserCircle, BookMarked, Monitor, Smartphone
} from "lucide-react";
import "./GetStarted.css";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.15, ease: "easeOut" },
  }),
};
const MotionSpan = motion.span;
const MotionH1 = motion.h1;
const MotionP = motion.p;
const MotionDiv = motion.div;
const DESKTOP_BUILD_VERSION = import.meta.env.VITE_DESKTOP_APP_VERSION || "latest";
const MOBILE_BUILD_VERSION = import.meta.env.VITE_MOBILE_APP_VERSION || "latest";

const releaseDefaults = {
  windows: {
    version: DESKTOP_BUILD_VERSION,
    downloadUrl: "https://github.com/mahammadanish321/lectureLog_frontend/releases/latest",
  },
  android: {
    version: MOBILE_BUILD_VERSION,
    downloadUrl: "https://github.com/mahammadanish321/lectureLog_mobile/releases/latest",
  },
};

const releaseSources = {
  windows: "https://api.github.com/repos/mahammadanish321/lectureLog_frontend/releases/latest",
  android: "https://api.github.com/repos/mahammadanish321/lectureLog_mobile/releases/latest",
};

const findReleaseAsset = (release, matcher) => {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  return assets.find((asset) => matcher.test(asset.name || ""))?.browser_download_url;
};

export default function GetStarted() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [releases, setReleases] = useState(releaseDefaults);

  useEffect(() => {
    let active = true;

    const loadRelease = async (platform, assetMatcher) => {
      try {
        const response = await fetch(releaseSources[platform]);
        if (!response.ok) return;

        const release = await response.json();
        const downloadUrl = findReleaseAsset(release, assetMatcher) || release.html_url;

        if (active) {
          setReleases((current) => ({
            ...current,
            [platform]: {
              version: current[platform].version,
              downloadUrl: downloadUrl || current[platform].downloadUrl,
            },
          }));
        }
      } catch (error) {
        console.warn(`Could not load ${platform} release metadata`, error);
      }
    };

    loadRelease("windows", /\.exe$/i);
    loadRelease("android", /\.apk$/i);

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="gs-root">
      {/* ── Nav ─────────────────────────────────────── */}
      <nav className="gs-nav">
        <div className="gs-nav-logo">
          <img src="/favicon.svg" alt="Merge" style={{ width: 32, height: 32 }} />
          <span>Merge</span>
        </div>
        <div className="gs-nav-actions">
          {user ? (
            <>
              <button
                onClick={() => navigate(user.role === 'student' ? "/student/dashboard" : "/dashboard")}
                className="gs-btn-primary"
              >
                Go to Dashboard
              </button>
              <button onClick={handleLogout} className="gs-btn-ghost">Sign Out</button>
            </>
          ) : (
            <>
              <button onClick={() => navigate("/login")} className="gs-btn-ghost">Sign In</button>
              <button onClick={() => navigate("/activate")} className="gs-btn-ghost">Active Account</button>
              <button onClick={() => navigate("/signup")} className="gs-btn-primary">Get Started</button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero with Scroll Animation ───────────────── */}
      <ContainerScroll
        titleComponent={
          <div className="gs-hero-text">
            <MotionSpan
              variants={fadeUp} initial="hidden" animate="visible" custom={0}
              className="gs-badge"
            >
              ✦ The Future of Institutional Management
            </MotionSpan>

            <MotionH1
              variants={fadeUp} initial="hidden" animate="visible" custom={1}
              className="gs-h1"
            >
              Revolutionize your <br />
              <span className="gs-h1-accent">Institutional Monitoring</span>
            </MotionH1>

            <MotionP
              variants={fadeUp} initial="hidden" animate="visible" custom={2}
              className="gs-subtitle"
            >
              AI-powered attendance, real-time classroom analytics, and secure
              multi-tenant isolation — built for the modern campus.
            </MotionP>

            <MotionDiv
              variants={fadeUp} initial="hidden" animate="visible" custom={3}
              className="gs-cta-row"
            >
              <div className="gs-cta-group">
                <span className="gs-cta-note">Admins: Highly recommended to download for AI features</span>
                <a href={releases.windows.downloadUrl} target="_blank" rel="noopener noreferrer" className="gs-cta-primary">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/8/87/Windows_logo_-_2021.svg" alt="Windows" style={{ width: '20px', height: '20px' }} />
                  Download for Windows (v{releases.windows.version})
                </a>
              </div>
              <div className="gs-cta-group">
                <span className="gs-cta-note">Students &amp; Teachers</span>
                <a href={releases.android.downloadUrl} target="_blank" rel="noopener noreferrer" className="gs-cta-outline">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg" alt="Android" style={{ width: '22px', height: '22px' }} />
                  Download for Android (v{releases.android.version})
                </a>
              </div>
            </MotionDiv>
          </div>
        }
      >
        {/* ── Dashboard Mockup ──────────────────────── */}
        <div className="gs-mockup">
          {/* Sidebar */}
          <div className="gs-mock-sidebar">
            {/* Real Merge Logo */}
            <div className="gs-mock-logo-row">
              <img src="/favicon.svg" alt="Merge" style={{ width: 22, height: 22, borderRadius: 5 }} />
              <span style={{ color: '#86efac', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.02em' }}>Merge</span>
            </div>

            {/* Real Nav Items */}
            {[
              { icon: <LayoutDashboard size={13} />, label: 'Dashboard',   active: true  },
              { icon: <MonitorPlay    size={13} />, label: 'Sessions',     active: false },
              { icon: <CalendarDays  size={13} />, label: 'Timetable',    active: false },
              { icon: <GraduationCap size={13} />, label: 'Students',     active: false },
              { icon: <BookMarked    size={13} />, label: 'Subjects',     active: false },
              { icon: <School        size={13} />, label: 'Classrooms',   active: false },
            ].map((item, i) => (
              <div key={i} className={`gs-mock-nav-item ${item.active ? 'active' : ''}`}>
                <span className="gs-mock-nav-icon-real">{item.icon}</span>
                <span className="gs-mock-nav-label-real">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="gs-mock-main">
            {/* Top bar */}
            <div className="gs-mock-topbar">
              <div className="gs-mock-page-title">Live Classroom Monitor</div>
              <div className="gs-mock-live-badge">🔴 LIVE</div>
            </div>

            {/* Stats row */}
            <div className="gs-mock-stats">
              {[
                { label: "Students", value: "1,248", icon: "👥" },
                { label: "Active Now", value: "342",   icon: "⚡" },
                { label: "Accuracy",  value: "98.4%", icon: "🎯" },
              ].map((s, i) => (
                <div key={i} className="gs-mock-stat-card">
                  <span className="gs-mock-stat-icon">{s.icon}</span>
                  <div>
                    <div className="gs-mock-stat-value">{s.value}</div>
                    <div className="gs-mock-stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Camera feed */}
            <div className="gs-mock-camera">
              <img
                src="/classroom-feed.png"
                alt="Classroom"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }}
              />
              <div className="gs-mock-camera-overlay">
                {/* Back row - small faces high up */}
                <div className="gs-mock-face" style={{ left: "12%",  top: "8%",  width: 28, height: 28 }} />
                <div className="gs-mock-face" style={{ left: "30%",  top: "6%",  width: 28, height: 28 }} />
                <div className="gs-mock-face" style={{ left: "52%",  top: "7%",  width: 28, height: 28 }} />
                <div className="gs-mock-face" style={{ left: "72%",  top: "9%",  width: 28, height: 28 }} />
                {/* Middle row - medium faces */}
                <div className="gs-mock-face" style={{ left: "8%",   top: "33%", width: 36, height: 36 }} />
                <div className="gs-mock-face present" style={{ left: "28%",  top: "30%", width: 36, height: 36 }} />
                <div className="gs-mock-face" style={{ left: "50%",  top: "32%", width: 36, height: 36 }} />
                <div className="gs-mock-face" style={{ left: "70%",  top: "31%", width: 36, height: 36 }} />
                {/* Front row - large faces at bottom */}
                <div className="gs-mock-face present" style={{ left: "18%",  top: "62%", width: 46, height: 46 }} />
                <div className="gs-mock-face" style={{ left: "42%",  top: "60%", width: 46, height: 46 }} />
                <div className="gs-mock-face" style={{ left: "65%",  top: "62%", width: 46, height: 46 }} />
              </div>
            </div>
          </div>
        </div>
      </ContainerScroll>

      {/* ── Features ─────────────────────────────────── */}
      <section className="gs-features">
        <MotionDiv
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }} viewport={{ once: true }}
          className="gs-features-header"
        >
          <h2 className="gs-features-title">Everything your campus needs</h2>
          <p className="gs-features-sub">One platform. Full control.</p>
        </MotionDiv>

        <div className="gs-features-grid">
          {[
            { icon: <Zap size={28} />, title: "Real-time Recognition", desc: "Advanced face recognition marks attendance in milliseconds. No roll-call, no paper." },
            { icon: <ShieldCheck size={28} />, title: "Multi-Tenant Privacy", desc: "Isolated databases per institution. Your college data is fully private and secure." },
            { icon: <BarChart3 size={28} />, title: "Smart Analytics", desc: "Convert attendance into insights. Track trends, identify at-risk students, and act fast." },
            { icon: <Users size={28} />, title: "Role-Based Access", desc: "Admins, teachers, and students each have perfectly scoped dashboards and permissions." },
          ].map((f, i) => (
            <MotionDiv
              key={i}
              className="gs-feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -6 }}
            >
              <div className="gs-feature-icon">{f.icon}</div>
              <h3 className="gs-feature-title">{f.title}</h3>
              <p className="gs-feature-desc">{f.desc}</p>
            </MotionDiv>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────── */}
      <section className="gs-cta-banner">
        <MotionDiv
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="gs-cta-inner"
        >
          <h2 className="gs-cta-title">Ready to transform your campus?</h2>
          <p className="gs-cta-text">Join institutions already running smarter with Merge.</p>
          <button onClick={() => navigate("/signup")} className="gs-cta-big-btn">
            Register Your Institution <ChevronRight size={20} />
          </button>
        </MotionDiv>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="gs-footer">
        <div className="gs-footer-brand">
          <img src="/favicon.svg" alt="Merge" style={{ width: 24, height: 24 }} />
          <span>Merge</span>
        </div>
        <div className="gs-footer-dev">
          <span>Developed by</span>
          <a href="https://mahammadanish.me" target="_blank" rel="noopener noreferrer" className="gs-dev-link">
            <img src="https://github.com/mahammadanish321.png" alt="mahammadanish.me" className="gs-dev-logo" />
            <span>mahammadanish.me</span>
          </a>
        </div>
        <p className="gs-footer-copy">© 2026 Merge. All rights reserved.</p>
      </footer>
    </div>
  );
}
