import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const location = useLocation();

  const scrollPageToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.querySelector('.app')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  useEffect(() => {
    if (location.hash) {
      const target = document.querySelector(location.hash);

      if (target) {
        setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
        return;
      }
    }

    scrollPageToTop();
  }, [location.hash, location.key, location.pathname]);

  return null;
};

export default ScrollToTop;
