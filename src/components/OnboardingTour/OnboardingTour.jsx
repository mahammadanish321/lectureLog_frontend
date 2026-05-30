import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './OnboardingTour.css';

/**
 * OnboardingTour — Guided walkthrough with spotlight overlay + tooltips
 *
 * Props:
 *  - steps: Array of step objects from tourSteps.js
 *  - isActive: Boolean to show/hide the tour
 *  - onComplete: Called when user finishes the tour
 *  - onSkip: Called when user skips the tour
 */
const OnboardingTour = ({ steps, isActive, onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightStyle, setSpotlightStyle] = useState({});
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [arrowClass, setArrowClass] = useState('');
  const [arrowStyle, setArrowStyle] = useState({});
  const tooltipRef = useRef(null);
  const resizeTimerRef = useRef(null);

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const isCentered = !step?.target || step?.placement === 'center';

  // ─── Find target element (supports comma-separated fallback selectors) ───
  const findTargetElement = useCallback((selector) => {
    if (!selector) return null;
    const selectors = selector.split(',').map((s) => s.trim());
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }, []);

  // ─── Calculate spotlight & tooltip position ────────────────────────────
  const calculatePosition = useCallback(() => {
    if (!step || isCentered) {
      setSpotlightStyle({ display: 'none' });
      setTooltipStyle({});
      setArrowClass('');
      return;
    }

    const targetEl = findTargetElement(step.target);
    if (!targetEl) {
      // Target not found — fall back to centered
      setSpotlightStyle({ display: 'none' });
      setTooltipStyle({});
      setArrowClass('');
      return;
    }

    // Scroll target into view
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Wait a tick for scroll to settle
    requestAnimationFrame(() => {
      const rect = targetEl.getBoundingClientRect();
      const padding = 8;

      // Spotlight position
      setSpotlightStyle({
        display: 'block',
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
      });

      // Tooltip position — calculate based on placement
      const tooltipWidth = 380;
      const tooltipHeight = 220;
      const gap = 16;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let placement = step.placement || 'bottom';
      let top, left;

      // Auto-correct placement if tooltip would overflow
      if (placement === 'bottom' && rect.bottom + gap + tooltipHeight > vh) {
        placement = 'top';
      } else if (placement === 'top' && rect.top - gap - tooltipHeight < 0) {
        placement = 'bottom';
      } else if (placement === 'right' && rect.right + gap + tooltipWidth > vw) {
        placement = 'left';
      } else if (placement === 'left' && rect.left - gap - tooltipWidth < 0) {
        placement = 'right';
      }

      switch (placement) {
        case 'bottom':
        case 'bottom-end':
          top = rect.bottom + gap;
          left = placement === 'bottom-end'
            ? rect.right - tooltipWidth
            : rect.left + rect.width / 2 - tooltipWidth / 2;
          setArrowClass('arrow-bottom');
          setArrowStyle({
            left: placement === 'bottom-end'
              ? Math.min(tooltipWidth - 40, tooltipWidth / 2)
              : tooltipWidth / 2 - 8,
          });
          break;

        case 'top':
          top = rect.top - gap - tooltipHeight;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          setArrowClass('arrow-top');
          setArrowStyle({ left: tooltipWidth / 2 - 8 });
          break;

        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + gap;
          setArrowClass('arrow-right');
          setArrowStyle({ top: tooltipHeight / 2 - 8 });
          break;

        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - gap - tooltipWidth;
          setArrowClass('arrow-left');
          setArrowStyle({ top: tooltipHeight / 2 - 8 });
          break;

        default:
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          setArrowClass('arrow-bottom');
          setArrowStyle({ left: tooltipWidth / 2 - 8 });
      }

      // Clamp tooltip to viewport
      left = Math.max(12, Math.min(left, vw - tooltipWidth - 12));
      top = Math.max(12, Math.min(top, vh - tooltipHeight - 12));

      setTooltipStyle({ top, left });
    });
  }, [step, isCentered, findTargetElement]);

  // ─── Recalculate on step change ────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    // Small delay to let the DOM render the target
    const timer = setTimeout(calculatePosition, 150);
    return () => clearTimeout(timer);
  }, [currentStep, isActive, calculatePosition]);

  // ─── Recalculate on resize ─────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    const handleResize = () => {
      clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(calculatePosition, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimerRef.current);
    };
  }, [isActive, calculatePosition]);

  // ─── Keyboard navigation ──────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleBack();
          break;
        case 'Escape':
          e.preventDefault();
          handleSkip();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, currentStep]);

  // ─── Reset step when tour starts ───────────────────────────────────────
  useEffect(() => {
    if (isActive) {
      setCurrentStep(0);
    }
  }, [isActive]);

  // ─── Navigation handlers ──────────────────────────────────────────────
  const handleNext = () => {
    if (isLastStep) {
      onComplete?.();
    } else {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  // ─── Animation variants ───────────────────────────────────────────────
  const overlayVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const tooltipVariants = {
    initial: { opacity: 0, y: 10, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.96 },
  };

  const centerModalVariants = {
    initial: { opacity: 0, scale: 0.9, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.9, y: 20 },
  };

  if (!isActive || !step) return null;

  // ─── Render centered modal (welcome / completion) ─────────────────────
  if (isCentered) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          className="tour-overlay"
          key="overlay"
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3 }}
          onClick={handleSkip}
          style={{ background: 'rgba(0, 0, 0, 0.65)' }}
        />
        <motion.div
          className="tour-center-modal"
          key={`center-${step.id}`}
          variants={centerModalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tour-tooltip-inner">
            {isLastStep ? (
              <div className="tour-celebration-icon">🎉</div>
            ) : (
              <div className="tour-step-icon">{step.icon}</div>
            )}
            <h3 className="tour-title">{step.title}</h3>
            <p className="tour-description">{step.description}</p>
          </div>

          <div className="tour-footer">
            <div className="tour-progress">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`tour-dot ${i === currentStep ? 'active' : ''} ${
                    i < currentStep ? 'completed' : ''
                  }`}
                />
              ))}
            </div>
            <div className="tour-actions">
              {!isLastStep && (
                <button className="tour-skip-btn" onClick={handleSkip}>
                  Skip Tour
                </button>
              )}
              {!isFirstStep && (
                <button className="tour-back-btn" onClick={handleBack}>
                  ← Back
                </button>
              )}
              <button className="tour-next-btn" onClick={handleNext}>
                {isLastStep ? "Let's Go! 🚀" : isFirstStep ? "Start Tour →" : 'Next →'}
              </button>
            </div>
          </div>

          <div className="tour-keyboard-hint">
            <span>
              <span className="tour-kbd">→</span> Next
            </span>
            <span>
              <span className="tour-kbd">←</span> Back
            </span>
            <span>
              <span className="tour-kbd">Esc</span> Skip
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── Render spotlight + positioned tooltip ─────────────────────────────
  return (
    <AnimatePresence mode="wait">
      {/* Dark overlay */}
      <motion.div
        className="tour-overlay"
        key="overlay"
        variants={overlayVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3 }}
        onClick={handleSkip}
        style={{ background: 'transparent' }}
      />

      {/* Spotlight cutout */}
      <motion.div
        className="tour-spotlight"
        key={`spotlight-${step.id}`}
        style={spotlightStyle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      />

      {/* Tooltip */}
      <motion.div
        ref={tooltipRef}
        className="tour-tooltip"
        key={`tooltip-${step.id}`}
        style={tooltipStyle}
        variants={tooltipVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Arrow */}
        {arrowClass && (
          <div className={`tour-arrow ${arrowClass}`} style={arrowStyle} />
        )}

        <div className="tour-tooltip-inner">
          <div className="tour-step-icon">{step.icon}</div>
          <h3 className="tour-title">{step.title}</h3>
          <p className="tour-description">{step.description}</p>
        </div>

        <div className="tour-footer">
          <div className="tour-progress">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`tour-dot ${i === currentStep ? 'active' : ''} ${
                  i < currentStep ? 'completed' : ''
                }`}
              />
            ))}
          </div>
          <div className="tour-actions">
            <button className="tour-skip-btn" onClick={handleSkip}>
              Skip
            </button>
            {!isFirstStep && (
              <button className="tour-back-btn" onClick={handleBack}>
                ← Back
              </button>
            )}
            <button className="tour-next-btn" onClick={handleNext}>
              {isLastStep ? "Finish 🎉" : 'Next →'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingTour;
