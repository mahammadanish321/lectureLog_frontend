import React, { useState, useRef, useEffect } from "react";
import "./MouseFollowingEyes.css";

export const MouseFollowingEyes = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const eye1Ref = useRef(null);
  const eye2Ref = useRef(null);

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="eyes-container">
      <Eye
        mouseX={mousePos.x}
        mouseY={mousePos.y}
        selfRef={eye1Ref}
        otherRef={eye2Ref}
      />
      <Eye
        mouseX={mousePos.x}
        mouseY={mousePos.y}
        selfRef={eye2Ref}
        otherRef={eye1Ref}
        isG={true}
      />
    </div>
  );
};

const Eye = ({ mouseX, mouseY, selfRef, otherRef, isG }) => {
  const pupilRef = useRef(null);
  const [center, setCenter] = useState({ x: 0, y: 0 });

  const updateCenter = () => {
    if (!selfRef.current) return;
    const rect = selfRef.current.getBoundingClientRect();
    setCenter({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  };

  useEffect(() => {
    updateCenter();
    window.addEventListener("resize", updateCenter);
    window.addEventListener("scroll", updateCenter, true);
    return () => {
      window.removeEventListener("resize", updateCenter);
      window.removeEventListener("scroll", updateCenter, true);
    };
  }, []);

  useEffect(() => {
    updateCenter();

    const isInside = (ref) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return false;
      return (
        mouseX >= rect.left &&
        mouseX <= rect.right &&
        mouseY >= rect.top &&
        mouseY <= rect.bottom
      );
    };

    if (isInside(selfRef) || isInside(otherRef)) return;

    const dx = mouseX - center.x;
    const dy = mouseY - center.y;
    const angle = Math.atan2(dy, dx);

    let maxMove = 8;
    if (selfRef.current && pupilRef.current) {
      const outerR = selfRef.current.clientWidth / 2;
      const innerR = pupilRef.current.clientWidth / 2;
      maxMove = outerR - innerR - 2; // 2px padding
    }
    
    const pupilX = Math.cos(angle) * maxMove;
    const pupilY = Math.sin(angle) * maxMove;

    if (pupilRef.current) {
      pupilRef.current.style.transform = `translate(${pupilX}px, ${pupilY}px)`;
    }
  }, [mouseX, mouseY, center.x, center.y]);

  return (
    <div ref={selfRef} className="eye-outer">
      <div ref={pupilRef} className="eye-pupil">
        <div className="eye-reflection"></div>
      </div>
      {isG && <div className="g-tail"></div>}
    </div>
  );
};
