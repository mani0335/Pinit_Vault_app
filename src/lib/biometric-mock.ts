// Mock implementation of @capacitor/biometric for development/testing
export const Biometric = {
  isAvailable: async () => ({
    isAvailable: false,
    biometryType: 'none',
    strongBiometryIsAvailable: false,
  }),
  authenticate: async () => ({
    success: false,
  }),
  biometricAuthenticate: async () => ({
    success: false,
  }),
  showConfirmation: async () => ({}),
  checkBiometry: async () => ({
    isAvailable: false,
    biometryType: 'none',
  }),
};
