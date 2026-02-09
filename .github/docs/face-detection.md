# Face Detection & Camera

## Library

- **@vladmandic/face-api@1.7.15** (TensorFlow.js based)
- Models path: `assets/models/`
- 128-dimension face descriptors

## Thresholds

| Parameter | Value | Notes |
|-----------|-------|-------|
| Euclidean distance | 0.6 | Face match threshold |
| Auto-capture confidence | 90% | Trigger auto-capture |
| Auto-capture cooldown | 2s | Prevent rapid captures |
| Stable frames | 3 frames | ~0.6s face must be still |
| Center tolerance | 100px | Face position from center |
| Movement threshold | 20px | Max allowed movement |
| No face timeout | 3s | Return to home if no face detected |
| Scan timeout | 30s | Max time for scan session |

## Camera Rules

1. **Always** use `facingMode: 'user'` (front camera)
2. Camera **stops** after successful scan (`scanCompleted = true`)
3. Duplicate capture prevention via `isPaused` flag
4. Real-time detection interval: 200ms

## Scan Flow

```
1. startCamera() → open front camera
2. startRealTimeDetection() → detect face every 200ms
3. Face detected + centered + stable → auto-capture at 90% confidence
4. capturePhoto() → detectFace(image) → identifyFace(descriptor)
5. Match found → emit onFaceDetected → parent navigates
6. No match → emit onMatchError → parent navigates
```

## Key Service: `FaceDetectionService`

```typescript
// Detect face from image
detectFace(imageDataUrl): Promise<{detected, confidence, descriptor, box}>

// Identify against registered faces
identifyFace(descriptor): Promise<{identified, faceData, similarity}>

// Real-time video detection
detectFaceFromVideo(video): Promise<detection>

// Draw overlay on canvas
drawFaceOverlay(canvas, video, detection, mirrored): Promise<void>
```

## Important: Scan Mode vs Register Mode

| Behavior | Scan Mode | Register Mode |
|----------|-----------|---------------|
| Alert popups | ❌ No (parent handles) | ✅ Yes |
| Auto-capture | ✅ Yes | ❌ No |
| Navigate after | Parent navigates | Parent handles |
| Error handling | Emit to parent | Show popup |
