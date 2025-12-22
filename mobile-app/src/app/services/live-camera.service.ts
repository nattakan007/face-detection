import { Injectable, ElementRef, OnDestroy } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LiveCameraService implements OnDestroy {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;

  constructor() { }

  async startCamera(videoElement: HTMLVideoElement, facingMode: 'user' | 'environment' = 'user'): Promise<void> {
    try {
      // Stop any existing stream
      this.stopCamera();

      // Check if camera permission is granted
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });

      if (permissionStatus.state === 'denied') {
        throw new Error('Camera permission denied. Please enable camera access in your browser settings.');
      }

      // Request camera with specific constraints
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.videoElement = videoElement;

        // Attach stream to video element
        videoElement.srcObject = this.stream;

        // Wait for video to be ready
        return new Promise((resolve, reject) => {
          videoElement.onloadedmetadata = () => {
            videoElement.play();
            console.log(`Camera started successfully with ${facingMode} camera`);
            resolve();
          };
          videoElement.onerror = (error) => {
            console.error('Error loading video metadata:', error);
            reject(error);
          };
        });
      } catch (mediaError: any) {
        // Handle specific media errors
        if (mediaError.name === 'NotAllowedError') {
          throw new Error('Camera permission denied. Please click "Allow" when prompted for camera access.');
        } else if (mediaError.name === 'NotFoundError') {
          throw new Error('No camera found. Please ensure your device has a working camera.');
        } else if (mediaError.name === 'NotReadableError') {
          throw new Error('Camera is already in use by another application.');
        } else if (mediaError.name === 'OverconstrainedError') {
          // Fallback: try to get any camera
          const fallbackConstraints = {
            video: true
          };

          try {
            this.stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
            videoElement.srcObject = this.stream;

            return new Promise((resolve) => {
              videoElement.onloadedmetadata = () => {
                videoElement.play();
                console.log('Camera started with fallback settings');
                resolve();
              };
            });
          } catch (fallbackError) {
            throw new Error('Unable to access camera with any settings.');
          }
        } else {
          throw mediaError;
        }
      }

    } catch (error: any) {
      console.error('Error accessing camera:', error);
      throw error;
    }
  }

  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  async switchCamera(): Promise<void> {
    if (!this.videoElement) return;

    const currentFacingMode = this.getFacingMode();
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    await this.startCamera(this.videoElement, newFacingMode);
  }

  private getFacingMode(): 'user' | 'environment' {
    // Check if we have a video track to determine current camera
    if (this.stream && this.stream.getVideoTracks().length > 0) {
      const track = this.stream.getVideoTracks()[0];
      const settings = track.getSettings();
      return (settings.facingMode as 'user' | 'environment') || 'user';
    }
    return 'user'; // Default to front camera
  }

  captureFrame(): string {
    if (!this.videoElement) return '';

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) return '';

    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;

    // Flip horizontally for front camera (mirror effect)
    const facingMode = this.getFacingMode();
    if (facingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.9);
  }

  isStreamActive(): boolean {
    return this.stream !== null && this.stream.active;
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}