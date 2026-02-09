/**
 * Script to initialize test user "ทรี" with face descriptor
 * Run this in browser console to add test employee
 */

export async function initTestUser() {
  const { StorageService } = await import("../app/services/storage.service");
  const { FaceDetectionService } = await import(
    "../app/services/face-detection.service"
  );

  // Load test image
  const response = await fetch("assets/test-employee.jpg");
  const blob = await response.blob();
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onloadend = async () => {
      const base64Image = reader.result as string;

      // Detect face from image
      const faceDetection = new FaceDetectionService(null as any);
      await faceDetection.loadModels();

      const detection = await faceDetection.detectFace(base64Image);

      if (!detection.detected || !detection.descriptor) {
        reject("ไม่พบใบหน้าในภาพทดสอบ");
        return;
      }

      // Create test user
      const testUser = {
        id: "test-tree-001",
        name: "ทรี",
        employeeId: "EMP0001",
        faceDescriptor: detection.descriptor,
        photoPath: base64Image,
        createdAt: Date.now(),
        status: "active" as const,
      };

      console.log("Test user created:", testUser);
      resolve(testUser);
    };

    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Auto-run in browser console
if (typeof window !== "undefined") {
  (window as any).initTestUser = initTestUser;
  console.log('Run initTestUser() in console to create test employee "ทรี"');
}
