import { Device } from '@capacitor/device';

export async function getDeviceToken() {
  // try Capacitor Device.getId if available
  try {
    if (Device && typeof Device.getId === 'function') {
      const info: any = await Device.getId();
      if (info && info.uuid) {
        return info.uuid;
      }
    }
  } catch (e) {
    // ignore
  }

  // fallback to stored token or generate one
  let token = localStorage.getItem('biovault_deviceToken');
  if (!token) {
    token = 'dev-' + Math.random().toString(36).slice(2);
    localStorage.setItem('biovault_deviceToken', token);
  }
  return token;
}
