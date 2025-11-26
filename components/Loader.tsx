import React from 'react';
import { motion } from 'framer-motion';

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950 text-white">
      <div className="relative w-48 h-48 mb-8">
        {/* Abstract Isometric Building Construction Animation */}
        <svg viewBox="0 0 100 100" className="w-full h-full stroke-safety-500 fill-none stroke-[2px]">
          {/* Base Grid */}
          <motion.path
            d="M50 90 L10 70 L10 30 L50 10 L90 30 L90 70 Z"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.2 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="stroke-slate-600"
          />
          
          {/* Building Up - Animated Lines */}
          <motion.path
            d="M50 90 L50 50 M10 70 L50 50 M90 70 L50 50 M50 50 L50 10"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut", delay: 0.2 }}
          />

          {/* Top Hexagon completion */}
          <motion.path
             d="M10 30 L50 10 L90 30"
             initial={{ pathLength: 0 }}
             animate={{ pathLength: 1 }}
             transition={{ duration: 0.8, ease: "easeInOut", delay: 0.8 }}
          />
          
          {/* Moving 'Crane' element */}
          <motion.circle 
            cx="50" cy="10" r="2" 
            className="fill-safety-500 stroke-none"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: [0, 1, 1, 0], y: 0 }}
            transition={{ duration: 1.5, times: [0, 0.2, 0.8, 1], repeat: Infinity, repeatDelay: 1 }}
          />
        </svg>
      </div>
      
      <div className="flex flex-col items-center gap-2">
        <motion.div 
          className="text-2xl font-mono font-bold tracking-widest text-safety-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          INITIALIZING
        </motion.div>
        <motion.div 
          className="h-1 w-32 bg-slate-800 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <motion.div 
            className="h-full bg-safety-500"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </motion.div>
        <p className="text-slate-500 text-xs font-mono mt-2">GDK NEXUS 2442 SYSTEM</p>
      </div>
    </div>
  );
};