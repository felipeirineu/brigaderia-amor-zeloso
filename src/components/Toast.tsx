import { useEffect } from 'react';
export function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [message, onClose]);
  return (
    <div className="feedback-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
