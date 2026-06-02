import React, { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import CustomToast from '../components/CustomToast';
import { registerToastHandler, ToastPayload, ToastType } from '../services/toast';

interface ToastContextType {
  showToast: (payload: ToastPayload) => void;
  showError: (message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  showError: () => {},
  showSuccess: () => {},
});

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('error');
  const [duration, setDuration] = useState(2600);

  const showToast = useCallback((payload: ToastPayload) => {
    setMessage(payload.message);
    setType(payload.type ?? 'error');
    setDuration(payload.duration ?? 2600);
    setVisible(true);
  }, []);

  useEffect(() => {
    registerToastHandler(({ message: nextMessage, type: nextType, duration: nextDuration }) => {
      showToast({
        message: nextMessage,
        type: nextType,
        duration: nextDuration,
      });
    });

    return () => registerToastHandler(null);
  }, [showToast]);

  const value = useMemo(
    () => ({
      showToast,
      showError: (nextMessage: string, nextDuration?: number) =>
        showToast({ message: nextMessage, type: 'error', duration: nextDuration }),
      showSuccess: (nextMessage: string, nextDuration?: number) =>
        showToast({ message: nextMessage, type: 'success', duration: nextDuration }),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.container}>
        {children}
        <CustomToast
          message={message}
          type={type}
          visible={visible}
          duration={duration}
          onHide={() => setVisible(false)}
        />
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
