import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { Browser } from '@capacitor/browser';

export interface PermissionResult {
  granted: boolean;
  needsSettings?: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  constructor() { }

  async requestCameraPermission(): Promise<PermissionResult> {
    try {
      // If running on native mobile platform
      if (Capacitor.isNativePlatform()) {
        // Check and request camera permission
        const cameraPermission = await Camera.checkPermissions();

        if (cameraPermission.camera === 'denied') {
          // Try to request permission
          const result = await Camera.requestPermissions({
            permissions: ['camera']
          });

          if (result.camera === 'granted' || result.camera === 'limited') {
            return { granted: true };
          } else {
            return { granted: false, needsSettings: true };
          }
        } else if (cameraPermission.camera === 'granted' || cameraPermission.camera === 'limited') {
          return { granted: true };
        } else if (cameraPermission.camera === 'prompt') {
          // Try to request permission
          const result = await Camera.requestPermissions({
            permissions: ['camera']
          });
          return { granted: result.camera === 'granted' || result.camera === 'limited', needsSettings: result.camera === 'denied' };
        }

        // Default to false for unknown states
        return { granted: false, needsSettings: true };
      } else {
        // Web browser - check if permission API is available
        if ('permissions' in navigator) {
          try {
            const result = await navigator.permissions.query({ name: 'camera' as PermissionName });

            if (result.state === 'granted') {
              return { granted: true };
            } else if (result.state === 'prompt') {
              // Will be prompted when getUserMedia is called
              return { granted: true };
            } else if (result.state === 'denied') {
              // User has previously denied
              return { granted: false, needsSettings: true, error: 'Camera permission denied. Please enable camera in browser settings.' };
            }
          } catch (err) {
            // Some browsers don't support permissions API
            console.log('Permissions API not available for camera');
          }
        }

        // For browsers without permissions API, we'll try directly
        return { granted: true };
      }
    } catch (error: any) {
      console.error('Error checking camera permission:', error);
      return { granted: false, error: error.message || 'Failed to check camera permission' };
    }
  }

  async openAppSettings(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        // Use native API to open settings
        await Browser.open({ url: 'app-settings:' });
      } catch (err) {
        console.error('Could not open app settings:', err);
      }
    }
  }
}