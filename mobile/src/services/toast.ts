export type ToastType = 'success' | 'error';

export interface ToastPayload {
  message: string;
  type?: ToastType;
  duration?: number;
}

type ToastHandler = (payload: Required<ToastPayload>) => void;

let toastHandler: ToastHandler | null = null;

export const registerToastHandler = (handler: ToastHandler | null) => {
  toastHandler = handler;
};

export const showAppToast = ({
  message,
  type = 'error',
  duration = 2600,
}: ToastPayload) => {
  toastHandler?.({
    message,
    type,
    duration,
  });
};

export const showErrorToast = (message: string, duration?: number) => {
  showAppToast({ message, type: 'error', duration });
};

export const showSuccessToast = (message: string, duration?: number) => {
  showAppToast({ message, type: 'success', duration });
};
