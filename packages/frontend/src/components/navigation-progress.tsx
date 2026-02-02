import { useEffect, useState } from 'react';
import { useNavigation } from 'react-router-dom';

/**
 * A simple NProgress-style loading bar that shows during route transitions.
 * Uses React Router's useNavigation hook to detect navigation state.
 */
export function NavigationProgress() {
  const navigation = useNavigation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (navigation.state === 'loading') {
      setVisible(true);
      setProgress(0);

      // Animate progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          // Slow down as we approach 90%
          if (prev >= 90) return prev;
          const increment = Math.random() * 10;
          return Math.min(prev + increment, 90);
        });
      }, 200);

      return () => clearInterval(interval);
    } else if (navigation.state === 'idle' && visible) {
      // Complete the progress bar
      setProgress(100);
      const timeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [navigation.state, visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page loading"
    >
      <div
        className="h-full bg-primary transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px var(--primary), 0 0 5px var(--primary)',
        }}
      />
    </div>
  );
}
