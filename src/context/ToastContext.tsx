import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Snackbar, Alert, type AlertColor } from '@mui/material';

type ToastSeverity = AlertColor;

interface ToastInputObject {
  type?: ToastSeverity;
  severity?: ToastSeverity;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (messageOrOptions: string | ToastInputObject, severity?: ToastSeverity, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const noop = () => {};

const ToastCtx = createContext<ToastContextValue>({
  showToast: noop,
  success: noop,
  error: noop,
  info: noop,
  warning: noop,
});

const DEFAULT_DURATION = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<ToastSeverity>('info');
  const [duration, setDuration] = useState(DEFAULT_DURATION);

  const showToast = useCallback((messageOrOptions: string | ToastInputObject, severityArg: ToastSeverity = 'info', durationArg = DEFAULT_DURATION) => {
    if (typeof messageOrOptions === 'string') {
      setMessage(messageOrOptions);
      setSeverity(severityArg);
      setDuration(durationArg);
      setOpen(true);
      return;
    }

    const resolvedSeverity = messageOrOptions.severity || messageOrOptions.type || 'info';
    setMessage(messageOrOptions.message || '');
    setSeverity(resolvedSeverity);
    setDuration(messageOrOptions.duration ?? DEFAULT_DURATION);
    setOpen(true);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({
    showToast,
    success: (msg, ms) => showToast(msg, 'success', ms ?? DEFAULT_DURATION),
    error: (msg, ms) => showToast(msg, 'error', ms ?? DEFAULT_DURATION),
    info: (msg, ms) => showToast(msg, 'info', ms ?? DEFAULT_DURATION),
    warning: (msg, ms) => showToast(msg, 'warning', ms ?? DEFAULT_DURATION),
  }), [showToast]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={duration}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setOpen(false)} severity={severity} variant="filled" sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);