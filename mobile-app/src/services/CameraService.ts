import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { PermissionsAndroid, Platform } from 'react-native';
import { CONSTANTS, ERROR_CODES } from '../utils/constants';

class CameraService {
  private hasPermission: boolean = false;

  async initialize(): Promise<void> {
    if (Platform.OS === 'android') {
      await this.requestAndroidPermissions();
    }
  }

  private async requestAndroidPermissions(): Promise<void> {
    try {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]);

      this.hasPermission =
        result[PermissionsAndroid.PERMISSIONS.CAMERA] ===
        PermissionsAndroid.RESULTS.GRANTED;

      if (!this.hasPermission) {
        throw new Error(ERROR_CODES.CAMERA_PERMISSION_DENIED);
      }
    } catch (error) {
      throw new Error(`Failed to request camera permissions: ${error}`);
    }
  }

  async checkPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const result = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );
        this.hasPermission = result;
        return result;
      } catch (error) {
        return false;
      }
    }
    return true;
  }

  getCameraDevice(position: 'front' | 'back' = 'front') {
    const device = useCameraDevice(position);
    return device;
  }

  getAvailableDevices() {
    const devices = Camera.getAvailableCameraDevices();
    return devices;
  }

  isPermissionGranted(): boolean {
    return this.hasPermission;
  }

  getFrameProcessingConfig() {
    return {
      fps: CONSTANTS.CAMERA_FPS,
      workingAreaPercentage: 100,
      outputPixelFormat: 'native',
    };
  }

  getCameraResolution() {
    return {
      width: CONSTANTS.CAMERA_RESOLUTION_WIDTH,
      height: CONSTANTS.CAMERA_RESOLUTION_HEIGHT,
    };
  }
}

export default new CameraService();
