# Gesture Drawing Game

A high-performance drawing application with gesture recognition and GPU acceleration using WebGL.

## Features

### 🎨 Drawing Tools
- **Pen Tool**: Smooth drawing with pressure sensitivity
- **Eraser Tool**: Clean erasing with smooth edges
- **Brush Size Control**: Adjustable from 1-50 pixels
- **Color Palette**: 10 predefined colors with easy selection

### 👆 Gesture Recognition
- **Touch Gestures**: Natural finger/stylus movement for drawing
- **Tap Gestures**: Tap to select tools and colors
- **Palm Detection**: Automatic eraser mode when palm touches screen
- **Pressure Sensitivity**: Varies line opacity and thickness based on pressure

### 📹 Camera Gesture Detection
- **Hand Tracking**: Real-time hand detection using MediaPipe
- **Air Drawing**: Draw in the air with your finger
- **Gesture Recognition**: Multiple hand poses for different tools
- **No-Touch Control**: Control the app without touching the screen

### ⚡ Performance
- **GPU Acceleration**: WebGL-powered rendering for smooth performance
- **Real-time Processing**: 60fps drawing with anti-aliasing
- **Optimized Shaders**: Custom fragment shaders for brush and eraser effects
- **Double Buffering**: Smooth stroke rendering without flickering

### 📱 Cross-Platform Support
- **Touch Devices**: Full gesture support for tablets and phones
- **Desktop**: Mouse support with keyboard shortcuts
- **Responsive Design**: Adapts to different screen sizes
- **Multi-touch**: Handles multiple touch points intelligently

## Getting Started

1. Open `index.html` in a modern web browser
2. The app will automatically initialize with GPU acceleration
3. Start drawing with your finger, stylus, or mouse

## Controls

### Touch Gestures
- **Single finger drag**: Draw with current tool
- **Tap**: Select UI elements
- **Palm touch**: Switch to eraser mode temporarily

### Camera Gestures
- **👉 Point (Index finger)**: Ready to draw mode
- **✌️ Two fingers close**: Active drawing mode
- **🖐️ Open hand**: Eraser tool activation
- **✊ Fist**: Stop drawing/cancel current stroke

### Mouse Controls
- **Left click + drag**: Draw
- **Click**: Select UI elements

### Keyboard Shortcuts
- `P`: Select pen tool
- `E`: Select eraser tool
- `C`: Clear canvas
- `[`: Decrease brush size
- `]`: Increase brush size
- `1-9`: Select colors 1-9
- `Esc`: Cancel current stroke

## Technical Details

### Architecture
- **WebGL Rendering**: GPU-accelerated drawing with custom shaders
- **Gesture Recognition**: Advanced touch and mouse event handling
- **Smooth Interpolation**: Bezier curve smoothing for natural strokes
- **Pressure Simulation**: Touch size and force-based pressure calculation

### Browser Requirements
- WebGL support (WebGL 2.0 preferred)
- Modern JavaScript (ES6+)
- Touch events support for mobile devices
- Camera access for gesture detection (optional)
- MediaPipe support for hand tracking

### Performance Features
- Custom vertex and fragment shaders
- Texture-based double buffering
- Optimized stroke rendering
- Efficient memory management
- 60fps target framerate

## File Structure

```
drawing/
├── index.html          # Main HTML file with MediaPipe integration
├── styles.css          # UI styles and responsive design
├── webgl-utils.js      # WebGL utility functions
├── drawing-engine.js   # GPU-accelerated drawing engine
├── gesture-handler.js  # Touch/mouse gesture recognition
├── camera-gesture.js   # Camera-based hand gesture detection
├── main.js            # Application controller
└── README.md          # This file
```

## Customization

### Adding New Colors
Edit the color palette in `index.html`:
```html
<button class="color-btn" data-color="#YOUR_COLOR" style="background-color: #YOUR_COLOR"></button>
```

### Adjusting Gesture Sensitivity
Modify parameters in `gesture-handler.js`:
```javascript
this.tapThreshold = 200; // Tap duration in ms
this.palmThreshold = 50; // Palm detection size
```

### Performance Tuning
Adjust rendering settings in `drawing-engine.js`:
```javascript
this.smoothingFactor = 0.3; // Stroke smoothing (0-1)
```

## Troubleshooting

### WebGL Not Supported
- Use a modern browser (Chrome, Firefox, Safari, Edge)
- Enable hardware acceleration in browser settings
- Update graphics drivers

### Poor Performance
- Close other browser tabs
- Reduce brush size for better performance
- Check if hardware acceleration is enabled

### Touch Not Working
- Ensure the device supports touch events
- Check if touch events are being blocked by other elements
- Try refreshing the page

### Camera Gestures Not Working
- Allow camera permissions when prompted
- Ensure good lighting for hand detection
- Keep your hand within the camera view
- Try different hand positions if gestures aren't recognized
- Check browser console for MediaPipe errors

## Browser Compatibility

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- [ ] Save/Load drawings
- [ ] Undo/Redo functionality
- [ ] Layer support
- [ ] More brush types
- [ ] Image import/export
- [ ] Collaborative drawing
- [ ] Vector graphics support

## License

This project is open source and available under the MIT License.
