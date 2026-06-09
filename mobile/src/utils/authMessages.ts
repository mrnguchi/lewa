type AuthAction = 'login' | 'register';

/**
 * Turns authentication failures into clear messages for students.
 */
export const getAuthErrorMessage = (
  error: any,
  action: AuthAction
): string => {
  if (error?.code === 'ECONNABORTED') {
    return 'This is taking longer than expected. Please try again.';
  }

  if (error?.request && !error?.response) {
    return 'You are offline. Check your connection and try again.';
  }

  const status = error?.response?.status;
  const serverMessage = String(error?.response?.data?.message ?? '').toLowerCase();

  if (status === 429) {
    return 'Too many attempts. Please wait a moment and try again.';
  }

  if (status && status >= 500) {
    return 'Lewa is temporarily unavailable. Please try again shortly.';
  }

  if (action === 'login') {
    if (status === 401 || serverMessage.includes('invalid matricule')) {
      return 'The matricule or password is incorrect.';
    }

    if (status === 403) {
      return 'This account is unavailable. Please contact support.';
    }

    return 'We could not sign you in. Please check your details and try again.';
  }

  if (
    status === 409 ||
    serverMessage.includes('already exists') ||
    serverMessage.includes('duplicate')
  ) {
    return 'An account already exists for this matricule or phone number. Try signing in instead.';
  }

  if (status === 400 || status === 422) {
    return 'We could not create your account with those details. Please review them and try again.';
  }

  return 'We could not create your account right now. Please try again.';
};
