import React from 'react';
import { motion } from 'framer-motion';

// Colors based on the GDK Nexus theme (Industrial Greys + Safety Orange)
const colors = {
  orange: '#f97316', // A bright safety orange
  darkGrey: '#334155', // Slate 700
  midGrey: '#64748b',  // Slate 500
  lightGrey: '#94a3b8', // Slate 400
  dust: '#cbd5e1',      // Slate 300 (for dust)
};

// Animation physics for the "Slam" effect
const slamTransition = {
  type: "spring",
  stiffness: 300,
  damping: 20,
  mass: 1,
};

// Dust particle component
const DustParticle: React.FC<{ delay: number; x: number; y: number; scale?: number }> = ({ delay, x, y, scale = 1 }) => (
  <motion.circle
    cx={x}
    cy={y}
    r={3 * scale}
    fill={colors.dust}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: [0, 0.8, 0], scale: [0.5, 1.5, 2], x: x + (Math.random() * 20 - 10), y: y - 15 }}
    transition={{ duration: 0.8, delay: delay, ease: "easeOut" }}
  />
);

// A single Isometric Slab layer
const SlabLayer: React.FC<{ dTop: string; dSideL: string; dSideR: string; colorTop: string; colorSide: string; delay: number; zIndex: number }> = ({ dTop, dSideL, dSideR, colorTop, colorSide, delay, zIndex }) => {
    return (
        <motion.g
            initial={{ y: -150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ ...slamTransition, delay }}
            style={{ zIndex }}
        >
         {/* Left Side Face */}
        <path d={dSideL} fill={colorSide} style={{ filter: 'brightness(0.8)'}}/>
         {/* Right Side Face */}
        <path d={dSideR} fill={colorSide} style={{ filter: 'brightness(0.6)'}}/>
         {/* Top Face */}
        <path d={dTop} fill={colorTop} />
      </motion.g>
    )
}

// Renamed to 'Loader' to match your existing App import
export const Loader: React.FC = () => {
  // We loop the whole build process every few seconds
  const [key, setKey] = React.useState(0);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setKey(prev => prev + 1);
    }, 3500); // Restart build every 3.5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-[#F1F5F9] font-mono overflow-hidden">
      <div className="relative w-64 h-64 mb-8">
        {/* The SVG container needs overflow-visible so dust can fly out */}
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible" key={key}>
          
          {/* --- DUST CLOUDS (Triggered at impact times: 0.2s, 0.4s, 0.6s) --- */}
          <g>
             {/* Bottom Layer Impact Dust */}
            <DustParticle delay={0.2} x={60} y={140} />
            <DustParticle delay={0.22} x={140} y={140} />
            <DustParticle delay={0.25} x={100} y={160} scale={1.5} />
            
             {/* Middle Layer Impact Dust */}
            <DustParticle delay={0.4} x={60} y={120} />
            <DustParticle delay={0.45} x={140} y={120} />

             {/* Top Layer Impact Dust (Larger puff) */}
            <DustParticle delay={0.6} x={50} y={90} scale={1.2} />
            <DustParticle delay={0.6} x={150} y={90} scale={1.2} />
            <DustParticle delay={0.6} x={100} y={110} scale={2} />
          </g>

          {/* --- THE CONSTRUCTION LAYERS (Bottom up) --- */}
          {/* Layer 1: Base Foundation (Dark Grey) */}
          <SlabLayer 
            zIndex={1} delay={0.2}
            colorTop={colors.midGrey} colorSide={colors.darkGrey}
            dTop="M 100 100 L 160 130 L 100 160 L 40 130 Z"
            dSideL="M 40 130 L 100 160 L 100 180 L 40 150 Z"
            dSideR="M 160 130 L 100 160 L 100 180 L 160 150 Z"
          />

          {/* Layer 2: Middle Structure (Light Grey) - Shifted up by 20 units */}
          <SlabLayer 
            zIndex={2} delay={0.4}
            colorTop={colors.lightGrey} colorSide={colors.midGrey}
            dTop="M 100 80 L 160 110 L 100 140 L 40 110 Z"
            dSideL="M 40 110 L 100 140 L 100 160 L 40 130 Z"
            dSideR="M 160 110 L 100 140 L 100 160 L 160 130 Z"
          />

          {/* Layer 3: The Nexus Cap (Safety Orange) - Shifted up another 20 units */}
          <SlabLayer 
            zIndex={3} delay={0.6}
            colorTop={colors.orange} colorSide={colors.orange} // Using orange for sides too, but brightness filter will darken them
            dTop="M 100 60 L 160 90 L 100 120 L 40 90 Z"
            dSideL="M 40 90 L 100 120 L 100 140 L 40 110 Z"
            dSideR="M 160 90 L 100 120 L 100 140 L 160 110 Z"
          />
        </svg>
      </div>

      {/* GDK Themed Text */}
      <div className="flex flex-col items-center gap-2 z-10">
        <motion.div 
          className="text-2xl font-bold tracking-widest"
          style={{ color: colors.orange }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          CONSTRUCTING NEXUS
        </motion.div>
        <motion.div className="h-1 w-32 bg-slate-300 rounded-full overflow-hidden">
          <motion.div 
            className="h-full"
            style={{ backgroundColor: colors.orange }}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity }}
           />
        </motion.div>
        <p className="text-slate-500 text-xs mt-2">GDK SYSTEM 2442 // FABRICATION PROTOCOL</p>
      </div>
    </div>
  );
};
