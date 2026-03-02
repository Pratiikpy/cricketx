import { ReactNode, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import MobileTabBar from "./MobileTabBar";

const PageTransition = forwardRef<HTMLDivElement, { children: ReactNode; locationKey: string }>(
  ({ children, locationKey }, ref) => (
    <motion.div
      ref={ref}
      key={locationKey}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="pb-20 md:pb-0"
    >
      {children}
    </motion.div>
  )
);
PageTransition.displayName = "PageTransition";

const Layout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AnimatePresence mode="wait">
        <PageTransition locationKey={location.pathname}>
          {children}
        </PageTransition>
      </AnimatePresence>
      <MobileTabBar />
    </div>
  );
};

export default Layout;
