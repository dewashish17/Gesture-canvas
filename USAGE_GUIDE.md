# 🎥 Camera Gesture Drawing - Usage Guide

## Quick Start

1. **Open `index.html`** in a modern browser (Chrome, Firefox, Edge, Safari)
2. **Click "Start Camera"** button in the toolbar
3. **Allow camera permissions** when prompted (this is normal!)
4. **Position your hand** in front of the camera
5. **Make gestures** to draw in the air!

## 🔧 Troubleshooting

### If Drawing Doesn't Work:

1. **Open Browser Console** (F12) to see debug messages
2. **Check the test page**: Open `debug.html` for detailed diagnostics
3. **Try the basic test**: Open `test-draw.html` to test mouse drawing

### Common Issues:

#### ❌ "Camera access denied"
- **Solution**: Allow camera permissions in browser
- **Chrome**: Click camera icon in address bar → Always allow
- **Firefox**: Click shield icon → Permissions → Camera → Allow

#### ❌ "WebGL not supported"
- **Solution**: Enable hardware acceleration
- **Chrome**: Settings → Advanced → System → Hardware acceleration
- **Firefox**: about:config → webgl.force-enabled → true

#### ❌ Gestures not recognized
- **Ensure good lighting** (natural light works best)
- **Keep hand clearly visible** in camera frame
- **Try different hand positions**
- **Check console for MediaPipe errors**

#### ❌ Drawing appears but no strokes
- **Check canvas size** in console logs
- **Try clearing canvas** and redrawing
- **Refresh page** and try again

## 🖐️ Hand Gestures Guide

### Primary Gestures:

1. **👉 Point (Index Finger)**
   - Only index finger extended
   - **Action**: Ready to draw mode
   - **Visual**: Hand skeleton shows in camera preview

2. **✌️ Peace Sign (Close Fingers)**
   - Index and middle fingers close together
   - **Action**: Active drawing mode
   - **Visual**: Draws lines following finger movement

3. **✌️ Peace Sign (Spread Fingers)**
   - Index and middle fingers spread apart
   - **Action**: Alternative drawing mode
   - **Visual**: Similar to close peace sign

4. **🖐️ Open Hand**
   - All fingers extended
   - **Action**: Eraser tool activation
   - **Visual**: Switches tool to eraser

5. **✊ Fist**
   - All fingers closed
   - **Action**: Stop drawing/cancel stroke
   - **Visual**: Ends current drawing operation

### Tips for Best Results:

- **Lighting**: Use good lighting, avoid backlighting
- **Distance**: Keep hand 1-2 feet from camera
- **Movement**: Make deliberate, smooth movements
- **Stability**: Hold gestures for 2-3 frames for recognition

## 🎮 Controls Overview

### Camera Controls:
- **Start Camera**: Begin gesture detection
- **Hide/Show Camera**: Toggle preview visibility
- **Stop Camera**: End gesture detection

### Fallback Controls:
- **Mouse**: Click and drag to draw
- **Touch**: Finger drawing on touch devices
- **Keyboard**: P (pen), E (eraser), C (clear), [/] (brush size)

## 🔍 Debug Information

### Console Messages to Look For:

```javascript
// Good signs:
"Drawing app initialized successfully with GPU acceleration"
"MediaPipe Hands initialized successfully"
"Camera active - Show your hand to start drawing"
"Gesture changed to: point"
"Started camera drawing at: X, Y"

// Issues:
"WebGL not supported"
"Camera access denied"
"Failed to initialize MediaPipe"
"Error starting stroke"
```

### Performance Monitoring:

Open browser console and type:
```javascript
// Check app status
window.drawingApp.getPerformanceStats()

// Check camera gesture status
window.drawingApp.cameraGestureDetector.getCurrentGesture()
```

## 📱 Browser Compatibility

### ✅ Fully Supported:
- **Chrome 88+** (Desktop/Mobile)
- **Firefox 85+** (Desktop/Mobile)
- **Safari 14+** (Desktop/Mobile)
- **Edge 88+** (Desktop)

### ⚠️ Limited Support:
- **Older browsers**: May lack WebGL 2.0 or MediaPipe support
- **iOS Safari < 14**: Limited camera gesture features
- **Android WebView**: May have permission issues

## 🎯 Expected Behavior

### When Everything Works:

1. **Camera starts** → Shows preview with "Allow camera" prompt
2. **Hand detected** → Green skeleton overlay appears
3. **Gesture recognized** → Status indicator shows current gesture
4. **Drawing active** → Lines appear on canvas following finger movement
5. **Smooth performance** → 30+ FPS gesture detection, 60 FPS drawing

### Performance Expectations:

- **Gesture Detection**: 30-60 FPS
- **Drawing Rendering**: 60 FPS (GPU accelerated)
- **Memory Usage**: ~50-100MB
- **CPU Usage**: Moderate (depends on device)

## 🔧 Advanced Debugging

### Debug Console Commands:

```javascript
// Test drawing engine directly
window.drawingApp.testDrawingEngine()

// Check WebGL context
window.drawingApp.drawingEngine.gl.getParameter(window.drawingApp.drawingEngine.gl.VERSION)

// Force gesture recognition
window.drawingApp.cameraGestureDetector.currentGesture = 'draw'
```

### Common Error Codes:

- **GL_OUT_OF_MEMORY**: Reduce canvas size or refresh page
- **SECURITY_ERR**: Camera permissions denied
- **NOT_SUPPORTED_ERR**: WebGL not available

## 💡 Tips for Optimal Experience

1. **Use Chrome** for best compatibility
2. **Good lighting** is crucial for hand detection
3. **Stable internet** for MediaPipe CDN loading
4. **Close other tabs** for better performance
5. **Use external webcam** if built-in camera is poor quality

## 📞 Getting Help

If you're still having issues:

1. **Check `debug.html`** for detailed diagnostics
2. **Open browser console** and look for error messages
3. **Try `test-draw.html`** to isolate drawing engine issues
4. **Check browser compatibility** and update if needed
5. **Verify camera permissions** in browser settings

The camera permission popup is **normal and expected** - it's a security feature that all web applications must request to access your camera.
