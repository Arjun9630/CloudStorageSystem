import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import { MobileSidebar } from './MobileSidebar';
import { motion } from 'motion/react';
import DitherBackground from './DitherBackground';

export function Layout() {
  return (
    <div className="relative min-h-screen overflow-hidden text-gray-200">
      {/* Premium subtle background accents */}
      <div className="absolute inset-0 z-0 bg-black">
        <DitherBackground />
      </div>

      <MobileSidebar />
      <div className="flex relative z-10">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <main className="flex-1 p-4 sm:p-6 lg:p-10 lg:mt-0 mt-16 max-h-screen overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
