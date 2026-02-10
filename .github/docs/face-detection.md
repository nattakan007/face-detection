# Face Detection & Camera

## Library

- **@vladmandic/face-api@1.7.15** (TensorFlow.js based)
- **Detection model**: TinyFaceDetector (inputSize: 224, scoreThreshold: 0.4) — fast real-time detection
- Models path: `assets/models/`
- 128-dimension face descriptors

## Thresholds

> **Important**: TinyFaceDetector typically reports scores in the **0.4–0.85** range (lower than SSD).
> All thresholds are calibrated for TinyFaceDetector. Do NOT set confidence > 85%.

> **Security Warning**: This system **does NOT include liveness detection**. It cannot prevent:
> - Photo spoofing (holding up a photo/screen)
> - Video replay attacks
> - 3D masks
> 
> **Recommended mitigation**:
> - Use in supervised environments (staff monitoring)
> - Combine with location verification
> - Review unusual attendance patterns
> - Consider adding manual verification for high-stakes scenarios

| Parameter | Value | Notes |
|-----------|-------|-------|
| Euclidean distance | 0.6 | Face match threshold (`matchDistanceThreshold`) |
| Min similarity | 50% | Minimum similarity to accept (`minSimilarityPercent`) |
| Min confidence | **75%** | Minimum face detection confidence (`minConfidence`) |
| Registration confidence | 70% | Minimum confidence for face registration |
| Auto-capture (scan) | **75%** | Trigger auto-capture in scan mode |
| Auto-capture (register) | 70% | Trigger auto-capture in register mode |
| Auto-capture cooldown | 2s | Prevent rapid captures |
| Stable frames | 3 frames | ~0.6s face must be still |
| Center tolerance | 100px | Face position from center |
| Movement threshold | 20px | Max allowed movement |
| No face timeout | 3s | Return to home if no face detected |
| Scan timeout | 30s | Max time for scan session |

### Similarity Formula

```
similarity = exp(-3.0 * euclideanDistance)
```

This exponential decay gives a natural similarity curve:
- distance 0.0 → 100%
- distance 0.2 → ~55%
- distance 0.3 → ~41%
- distance 0.4 → ~30%
- distance 0.6 → ~17%

### Preset Ranges (Admin Settings)

| Preset | Min Confidence | Match Distance | Min Similarity | Auto-Capture |
|--------|---------------|----------------|----------------|-------------|
| เข้มงวด (Strict) | 80% | 0.5 | 60% | 80% |
| **ปานกลาง (Balanced)** | **75%** | **0.6** | **50%** | **75%** |
| ยืดหยุ่น (Lenient) | 40% | 0.7 | 40% | 45% |

**Recommended**: Use **Balanced (ปานกลาง)** preset for production (**75%** confidence — optimal for TinyFaceDetector).

## Camera Rules

1. **Always** use `facingMode: 'user'` (front camera)
2. Camera **stops** after successful scan (`scanCompleted = true`)
3. Duplicate capture prevention via `isPaused` flag
4. Real-time detection interval: 200ms

## Scan Flow

```
1. startCamera() → open front camera
2. startRealTimeDetection() → detect face every 200ms
3. Face detected + centered + stable → auto-capture at 75% confidence (scan) / 70% (register)
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
