import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      const mainContainer = document.querySelector('main');
      if (mainContainer) {
        mainContainer.scrollTo(0, 0);
      }
    };

    // Execute immediately
    resetScroll();
    
    // Execute after a tick for React Router updates
    requestAnimationFrame(resetScroll);
    
    // Execute after a short delay for async fetches
    const timer = setTimeout(resetScroll, 100);
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}
