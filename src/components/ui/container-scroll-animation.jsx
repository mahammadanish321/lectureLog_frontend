import React, { useRef, useState, useEffect } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

export const ContainerScroll = ({ titleComponent, children }) => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const scaleDimensions = () => (isMobile ? [0.7, 0.9] : [1.05, 1]);
  const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div
      ref={containerRef}
      style={{
        height: isMobile ? "60rem" : "80rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        padding: isMobile ? "0.5rem" : "5rem",
      }}
    >
      <div style={{ perspective: "1000px", width: "100%", position: "relative", paddingTop: isMobile ? "2.5rem" : "10rem", paddingBottom: isMobile ? "2.5rem" : "10rem" }}>
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({ translate, titleComponent }) => (
  <motion.div
    style={{ translateY: translate, maxWidth: "64rem", margin: "0 auto", textAlign: "center" }}
  >
    {titleComponent}
  </motion.div>
);

export const Card = ({ rotate, scale, children }) => (
  <motion.div
    style={{
      rotateX: rotate,
      scale,
      marginTop: "-3rem",
      maxWidth: "64rem",
      margin: "-3rem auto 0",
      width: "100%",
      height: "30rem",
      border: "4px solid #105934",
      padding: "0.5rem",
      background: "#0a2e1a",
      borderRadius: "30px",
      boxShadow:
        "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
    }}
  >
    <div
      style={{
        height: "100%",
        width: "100%",
        overflow: "hidden",
        borderRadius: "20px",
        background: "#111827",
      }}
    >
      {children}
    </div>
  </motion.div>
);
