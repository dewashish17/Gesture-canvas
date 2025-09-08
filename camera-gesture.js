// Camera-based gesture detection using MediaPipe Hand Tracking
class CameraGestureDetector {
    constructor(drawingEngine, gestureHandler) {
        this.drawingEngine = drawingEngine;
        this.gestureHandler = gestureHandler;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.hands = null;
        this.camera = null;
        this.isActive = false;
        this.isDrawing = false;
        this.lastFingerPos = null;
        this.gestureHistory = [];
        this.confidenceThreshold = 0.7;
        
        // Gesture recognition parameters
        this.fingerTipThreshold = 0.02; // Distance threshold for fingertip detection
        this.drawingGestureThreshold = 0.03; // Movement threshold for drawing
        this.gestureStabilityFrames = 1; // Reduced for faster response
        this.palmOpenThreshold = 0.1; // Distance between fingers for palm detection
        
        // Drawing state
        this.currentGesture = 'none';
        this.gestureConfidence = 0;
        this.drawingStartTime = 0;
        this.lastDrawTime = 0;
        
        // Camera state management - prevent multiple initializations
        this.cameraInitializing = false;
        this.cameraStream = null;
        this.mediaPipeReady = false;
        this.permissionGranted = false;
        
        this.initializeMediaPipe();
    }
    
    async initializeMediaPipe() {
        try {
            // Wait for MediaPipe to load
            await this.waitForMediaPipe();
            
            // Load MediaPipe Hands
            const hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`;
                }
            });
            
            hands.setOptions({
                maxNumHands: 1, // Reduced for better performance
                modelComplexity: 1,
                minDetectionConfidence: 0.7, // Increased for better accuracy
                minTrackingConfidence: 0.5
            });
            
            hands.onResults(this.onResults.bind(this));
            this.hands = hands;
            this.mediaPipeReady = true;
            
            console.log('MediaPipe Hands initialized successfully');
        } catch (error) {
            console.error('Failed to initialize MediaPipe:', error);
            this.showFallbackMessage();
        }
    }
    
    waitForMediaPipe() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds
            
            const checkMediaPipe = () => {
                attempts++;
                
                if (typeof Hands !== 'undefined' && typeof Camera !== 'undefined') {
                    console.log('MediaPipe loaded successfully');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('MediaPipe failed to load after 5 seconds'));
                } else {
                    setTimeout(checkMediaPipe, 100);
                }
            };
            
            checkMediaPipe();
        });
    }
    
    async startCamera() {
        // Prevent multiple camera initialization attempts
        if (this.cameraInitializing) {
            console.log('Camera initialization already in progress...');
            return;
        }
        
        if (this.isActive || this.video) {
            console.log('Camera already active');
            return;
        }
        
        this.cameraInitializing = true;
        console.log('Starting camera initialization...');
        
        try {
            // Single camera permission request
            if (!this.cameraStream) {
                console.log('Requesting camera permission (single request)...');
                this.cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 640,
                        height: 480,
                        facingMode: 'user'
                    }
                });
                this.permissionGranted = true;
                console.log('Camera permission granted');
            }
            
            // Create video element
            this.video = document.createElement('video');
            this.video.srcObject = this.cameraStream;
            this.video.autoplay = true;
            this.video.muted = true;
            this.video.playsInline = true;
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.addEventListener('loadeddata', resolve, { once: true });
            });
            
            this.setupCameraCanvas();
            
            // Choose between MediaPipe or basic camera
            if (this.mediaPipeReady && this.hands) {
                console.log('Starting MediaPipe hand tracking...');
                this.startDetection();
                this.createHandCursor();
                this.updateCameraStatus('MediaPipe camera active - Show your hand');
            } else {
                console.log('Starting basic camera mode...');
                this.startBasicVideoLoop();
                this.updateCameraStatus('Basic camera active - No gesture detection');
            }
            
            this.isActive = true;
            console.log('Camera started successfully');
            
        } catch (error) {
            console.error('Camera initialization failed:', error);
            this.updateCameraStatus('Camera access denied: ' + error.message);
        } finally {
            this.cameraInitializing = false;
        }
    }
    
    setupCameraCanvas() {
        // Create camera preview canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = 240;
        this.canvas.height = 180;
        this.canvas.id = 'cameraPreview';
        this.canvas.style.cssText = `
            position: absolute;
            bottom: 20px;
            right: 20px;
            border: 2px solid #667eea;
            border-radius: 10px;
            z-index: 1000;
            background: black;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        this.ctx = this.canvas.getContext('2d');
        document.body.appendChild(this.canvas);
        
        // Add toggle button for camera preview
        this.createCameraControls();
    }
    
    createHandCursor() {
        // Create a visual cursor that follows hand movement
        this.handCursor = document.createElement('div');
        this.handCursor.id = 'handCursor';
        this.handCursor.style.cssText = `
            position: absolute;
            width: 20px;
            height: 20px;
            border: 3px solid #ff4757;
            border-radius: 50%;
            background: rgba(255, 71, 87, 0.3);
            pointer-events: none;
            z-index: 1000;
            transform: translate(-50%, -50%);
            display: none;
            box-shadow: 0 0 10px rgba(255, 71, 87, 0.5);
            transition: all 0.1s ease;
        `;
        
        // Add cursor to canvas container
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer) {
            canvasContainer.appendChild(this.handCursor);
        }
        
        // Create trail effect
        this.createCursorTrail();
    }
    
    createCursorTrail() {
        this.trailPoints = [];
        this.maxTrailPoints = 4; // Reduced for better performance
        
        for (let i = 0; i < this.maxTrailPoints; i++) {
            const trail = document.createElement('div');
            trail.className = 'cursor-trail';
            trail.style.cssText = `
                position: absolute;
                width: ${12 - i}px;
                height: ${12 - i}px;
                border-radius: 50%;
                background: rgba(255, 71, 87, ${0.6 - (i * 0.07)});
                pointer-events: none;
                z-index: ${999 - i};
                transform: translate(-50%, -50%);
                display: none;
                transition: all 0.1s ease;
            `;
            
            const canvasContainer = document.querySelector('.canvas-container');
            if (canvasContainer) {
                canvasContainer.appendChild(trail);
                this.trailPoints.push(trail);
            }
        }
    }
    
    createCameraControls() {
        const controlsDiv = document.createElement('div');
        controlsDiv.id = 'cameraControls';
        controlsDiv.style.cssText = `
            position: absolute;
            bottom: 210px;
            right: 20px;
            z-index: 1001;
            display: flex;
            gap: 5px;
        `;
        
        // Toggle camera button
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = 'Hide Camera';
        toggleBtn.className = 'camera-btn';
        toggleBtn.style.cssText = `
            background: #667eea;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            margin-right: 10px;
            font-size: 12px;
        `;
        
        toggleBtn.addEventListener('click', () => {
            const isHidden = this.canvas.style.display === 'none';
            this.canvas.style.display = isHidden ? 'block' : 'none';
            toggleBtn.textContent = isHidden ? 'Hide Camera' : 'Show Camera';
        });
        
        // Stop camera button
        const stopBtn = document.createElement('button');
        stopBtn.textContent = 'Stop Camera';
        stopBtn.className = 'camera-btn';
        stopBtn.style.cssText = toggleBtn.style.cssText + 'background: #ff4757;';
        
        stopBtn.addEventListener('click', () => {
            this.stopCamera();
        });
        
        controlsDiv.appendChild(toggleBtn);
        controlsDiv.appendChild(stopBtn);
        document.body.appendChild(controlsDiv);
    }
    
    async startDetection() {
        if (!this.hands || !this.video) return;
        
        const camera = new Camera(this.video, {
            onFrame: async () => {
                if (this.isActive) {
                    await this.hands.send({ image: this.video });
                }
            },
            width: 640,
            height: 480
        });
        
        this.camera = camera;
        camera.start();
    }
    
    onResults(results) {
        if (!this.ctx || !this.canvas) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw video frame (fix black screen issue)
        if (results.image) {
            this.ctx.save();
            this.ctx.scale(-1, 1); // Mirror the image
            this.ctx.translate(-this.canvas.width, 0);
            
            try {
                this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
            } catch (error) {
                console.warn('Error drawing camera frame:', error);
                // Draw a placeholder if image fails
                this.ctx.fillStyle = '#333';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fillStyle = 'white';
                this.ctx.font = '16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Camera Loading...', this.canvas.width/2, this.canvas.height/2);
            }
            
            this.ctx.restore();
        } else {
            // No image data - show loading placeholder
            this.ctx.fillStyle = '#222';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#667eea';
            this.ctx.font = '14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Starting Camera...', this.canvas.width/2, this.canvas.height/2);
        }
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // Process first detected hand
            const landmarks = results.multiHandLandmarks[0];
            const handedness = results.multiHandedness[0];
            
            this.drawHandLandmarks(landmarks);
            this.processGestures(landmarks, handedness);
        } else {
            // No hand detected - stop drawing if active
            if (this.isDrawing) {
                this.endDrawing();
            }
            this.currentGesture = 'none';
            this.hideHandCursor();
            this.updateGestureIndicator('No hand detected - show your hand');
            console.log('❌ No hand landmarks detected');
        }
    }
    
    drawHandLandmarks(landmarks) {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // Draw hand skeleton
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        
        // Hand connections (simplified)
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8], // Index
            [5, 9], [9, 10], [10, 11], [11, 12], // Middle
            [9, 13], [13, 14], [14, 15], [15, 16], // Ring
            [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
            [0, 17] // Palm
        ];
        
        ctx.beginPath();
        connections.forEach(([start, end]) => {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            
            ctx.moveTo(
                (1 - startPoint.x) * canvas.width,
                startPoint.y * canvas.height
            );
            ctx.lineTo(
                (1 - endPoint.x) * canvas.width,
                endPoint.y * canvas.height
            );
        });
        ctx.stroke();
        
        // Draw landmarks
        ctx.fillStyle = '#ff0000';
        landmarks.forEach((landmark, index) => {
            const x = (1 - landmark.x) * canvas.width;
            const y = landmark.y * canvas.height;
            
            ctx.beginPath();
            ctx.arc(x, y, index === 8 ? 8 : 4, 0, 2 * Math.PI); // Highlight index fingertip
            ctx.fill();
        });
    }
    
    processGestures(landmarks, handedness) {
        const gesture = this.recognizeGesture(landmarks);
        this.gestureHistory.push(gesture);
        
        // Keep only recent gesture history
        if (this.gestureHistory.length > this.gestureStabilityFrames) {
            this.gestureHistory.shift();
        }
        
        // Determine stable gesture
        const stableGesture = this.getStableGesture();
        
        if (stableGesture !== this.currentGesture) {
            this.currentGesture = stableGesture;
            this.handleGestureChange(stableGesture, landmarks);
        }
        
        // Handle hand movement for all gestures (for cursor tracking)
        // Include fist gesture for cursor positioning
        if (stableGesture !== 'none') {
            this.handleDrawingMovement(landmarks);
        }
    }
    
    recognizeGesture(landmarks) {
        // Get key points
        const indexTip = landmarks[8];
        const indexMcp = landmarks[5];
        const indexPip = landmarks[6];
        const middleTip = landmarks[12];
        const middleMcp = landmarks[9];
        const thumbTip = landmarks[4];
        const wrist = landmarks[0];
        
        // Calculate if fingers are extended (tip above middle joint)
        const indexExtended = indexTip.y < indexPip.y;
        const middleExtended = middleTip.y < landmarks[10].y;
        const ringExtended = landmarks[16].y < landmarks[14].y;
        const pinkyExtended = landmarks[20].y < landmarks[18].y;
        // Improved thumb detection - check both distance and position
        const thumbDistanceFromWrist = Math.sqrt(
            Math.pow(thumbTip.x - wrist.x, 2) + Math.pow(thumbTip.y - wrist.y, 2)
        );
        const thumbExtended = thumbDistanceFromWrist > 0.1;
        
        // Count extended fingers
        const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended, thumbExtended].filter(Boolean).length;
        
        // Debug finger detection - always show for troubleshooting
        console.log(`🖐️ Fingers: I:${indexExtended} M:${middleExtended} R:${ringExtended} P:${pinkyExtended} T:${thumbExtended} = ${extendedCount} total`);
        
        // Distance between index and middle finger tips
        const fingerDistance = Math.sqrt(
            Math.pow(indexTip.x - middleTip.x, 2) + 
            Math.pow(indexTip.y - middleTip.y, 2)
        );
        
        // Optimized gesture recognition based on MediaPipe's BEST detection capabilities
        
        // 1. PALM (BEST DETECTION) - 4+ fingers = Eraser
        if (extendedCount >= 4) {
            console.log('🖐️ PALM detected (excellent) - eraser mode');
            return 'palm';
        }
        
        // 2. POINT (VERY GOOD) - Only index finger = Draw
        else if (extendedCount === 1 && indexExtended) {
            console.log('👆 POINT detected (very good) - draw mode');
            return 'point';
        }
        
        // 3. PEACE SIGN (VERY GOOD) - Index + Middle = Draw
        else if (extendedCount === 2 && indexExtended && middleExtended) {
            console.log('✌️ PEACE detected (very good) - draw mode');
            return fingerDistance < 0.08 ? 'draw' : 'peace';
        }
        
        // 4. ROCK SIGN (GOOD) - Index + Pinky + Thumb = Cursor positioning
        else if (extendedCount === 3 && indexExtended && pinkyExtended && thumbExtended) {
            console.log('🤟 ROCK sign detected (good) - cursor positioning');
            return 'rock'; // Use rock sign instead of fist for positioning
        }
        
        // 5. THREE FINGERS (GOOD) - Index + Middle + Ring = Alternative draw
        else if (extendedCount === 3 && indexExtended && middleExtended && ringExtended) {
            console.log('🖖 THREE fingers detected (good) - alt draw');
            return 'three';
        }
        
        // 6. Fallback for partial detections
        else if (indexExtended) {
            console.log('👆 Index extended (fallback) - point mode');
            return 'point';
        }
        
        // 7. Unknown/Poor detection - no action
        else {
            console.log('❓ Unknown gesture (poor detection)');
            return 'none';
        }
        
        return 'none';
    }
    
    getStableGesture() {
        if (this.gestureHistory.length < this.gestureStabilityFrames) {
            return 'none';
        }
        
        // Check if recent gestures are consistent
        const recentGesture = this.gestureHistory[this.gestureHistory.length - 1];
        const isStable = this.gestureHistory.slice(-this.gestureStabilityFrames)
            .every(g => g === recentGesture);
        
        return isStable ? recentGesture : 'none';
    }
    
    handleGestureChange(gesture, landmarks) {
        console.log('🖐️ Gesture changed to:', gesture, 'at', Date.now()); // Enhanced debug log
        
        switch (gesture) {
            case 'point':
                this.updateGestureIndicator('👉 Point detected - Drawing active');
                this.drawingEngine.setTool('pen');
                console.log('✏️ Pen tool activated (pointing)');
                // Don't end drawing - let pointing continue to draw
                break;
                
            case 'draw':
                this.updateGestureIndicator('✌️ Draw mode - Moving finger');
                this.drawingEngine.setTool('pen');
                break;
                
            case 'peace':
                this.updateGestureIndicator('✌️ Peace sign - Alternative draw');
                this.drawingEngine.setTool('pen');
                break;
                
            case 'palm':
                this.updateGestureIndicator('🖐️ Open hand - Eraser active');
                this.drawingEngine.setTool('eraser');
                console.log('🧹 Eraser tool activated');
                // Don't end drawing immediately - let it continue with eraser
                break;
                
            case 'rock':
                this.updateGestureIndicator('🤟 Rock sign - Cursor positioning');
                if (this.isDrawing) {
                    this.endDrawing();
                    console.log('⏹️ Drawing stopped - switching to cursor positioning');
                }
                console.log('🎯 Rock sign positioning mode active');
                break;
                
            case 'three':
                this.updateGestureIndicator('🖖 Three fingers - Alternative draw');
                this.drawingEngine.setTool('pen');
                console.log('✏️ Pen tool activated (three fingers)');
                break;
                
            case 'fist':
                // Keep fist as fallback but with lower priority
                this.updateGestureIndicator('✊ Fist - Cursor positioning (low confidence)');
                if (this.isDrawing) {
                    this.endDrawing();
                    console.log('⏹️ Drawing stopped - fist detected');
                }
                break;
                
            default:
                this.updateGestureIndicator('Show your hand to start');
                if (this.isDrawing) {
                    this.endDrawing();
                }
        }
    }
    
    handleDrawingMovement(landmarks) {
        const indexTip = landmarks[8];
        const drawingCanvas = document.getElementById('drawingCanvas');
        
        if (!drawingCanvas) return;
        
        // Convert hand coordinates to screen coordinates for cursor
        const canvasContainer = drawingCanvas.parentElement;
        const containerRect = canvasContainer.getBoundingClientRect();
        const screenX = (1 - indexTip.x) * containerRect.width; // Mirror X for natural interaction
        const screenY = indexTip.y * containerRect.height;
        
        // Update hand cursor position
        this.updateHandCursor(screenX, screenY);
        
        // Convert hand coordinates to canvas coordinates for drawing
        const canvasWidth = drawingCanvas.width;
        const canvasHeight = drawingCanvas.height;
        const canvasX = (1 - indexTip.x) * canvasWidth;
        const canvasY = indexTip.y * canvasHeight;
        
        console.log(`Hand: ${indexTip.x.toFixed(3)}, ${indexTip.y.toFixed(3)} -> Screen: ${screenX.toFixed(1)}, ${screenY.toFixed(1)} -> Canvas: ${canvasX.toFixed(1)}, ${canvasY.toFixed(1)}`);
        
        // Auto-start drawing/erasing for active drawing gestures
        const drawingGestures = ['point', 'draw', 'peace', 'palm', 'three'];
        if (drawingGestures.includes(this.currentGesture) && !this.isDrawing) {
            console.log('Starting', this.currentGesture === 'palm' ? 'erasing' : 'drawing', 'from gesture:', this.currentGesture);
            this.startDrawing(indexTip);
            return;
        }
        
        // Continue drawing/erasing if active
        if (this.isDrawing) {
            this.continueDrawing(canvasX, canvasY);
        }
        
        // Visual feedback on fallback canvas for drawing gestures
        if (drawingGestures.includes(this.currentGesture)) {
            this.drawFallbackPoint(screenX, screenY);
        }
        
        // For positioning gestures: just show cursor position without drawing
        const positioningGestures = ['rock', 'fist'];
        if (positioningGestures.includes(this.currentGesture)) {
            console.log(`${this.currentGesture === 'rock' ? '🤟' : '👊'} ${this.currentGesture} - Cursor positioning at`, screenX.toFixed(1), screenY.toFixed(1));
            // Cursor position is updated by updateHandCursor() call above
            // No drawing, just cursor positioning
        }
        
        this.lastFingerPos = { x: canvasX, y: canvasY };
        this.lastScreenPos = { x: screenX, y: screenY };
    }
    
    startDrawing(fingerPos) {
        if (this.isDrawing) return;
        
        const drawingCanvas = document.getElementById('drawingCanvas');
        if (!drawingCanvas) return;
        
        const canvasWidth = drawingCanvas.width;
        const canvasHeight = drawingCanvas.height;
        const x = (1 - fingerPos.x) * canvasWidth;
        const y = fingerPos.y * canvasHeight;
        
        this.isDrawing = true;
        this.drawingStartTime = Date.now();
        
        try {
            // Try WebGL drawing first
            this.drawingEngine.startStroke(x, y, 1.0);
            console.log('Started camera drawing at:', x.toFixed(1), y.toFixed(1));
            this.updateGestureIndicator('🎨 Drawing active!');
            
            // Also try fallback drawing if available
            if (window.drawingApp && window.drawingApp.fallbackCtx) {
                const screenPos = this.lastScreenPos;
                if (screenPos) {
                    const ctx = window.drawingApp.fallbackCtx;
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.lineJoin = 'round';
                    ctx.lineCap = 'round';
                    ctx.lineWidth = 5;
                    ctx.strokeStyle = '#ff0000';
                    ctx.beginPath();
                    ctx.arc(screenPos.x, screenPos.y, 3, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        } catch (error) {
            console.error('Error starting stroke:', error);
            this.isDrawing = false;
        }
    }
    
    continueDrawing(x, y) {
        if (!this.isDrawing) return;
        
        this.lastDrawTime = Date.now();
        
        try {
            this.drawingEngine.continueStroke(x, y, 1.0);
            
            // Also draw on fallback canvas
            if (window.drawingApp && window.drawingApp.fallbackCtx && this.lastScreenPos) {
                const ctx = window.drawingApp.fallbackCtx;
                const screenPos = this.lastScreenPos;
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, 2, 0, 2 * Math.PI);
                ctx.fill();
            }
        } catch (error) {
            console.error('Error continuing stroke:', error);
            this.endDrawing();
        }
    }
    
    endDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.drawingEngine.endStroke();
        this.lastFingerPos = null;
        
        console.log('Ended camera drawing');
    }
    
    drawFallbackPoint(screenX, screenY) {
        // Draw immediate visual feedback on fallback canvas
        if (window.drawingApp && window.drawingApp.fallbackCtx) {
            const ctx = window.drawingApp.fallbackCtx;
            
            // Choose color based on current gesture
            let color = '#00ff00'; // Green for drawing
            let size = 3;
            let compositeOp = 'source-over';
            
            if (this.currentGesture === 'palm') {
                color = '#ff0066'; // Pink for eraser
                size = 8; // Larger for eraser
                compositeOp = 'destination-out'; // Eraser mode
            } else if (this.currentGesture === 'point') {
                color = '#0066ff'; // Blue for pointing
                size = 2; // Smaller for precision
            } else if (this.currentGesture === 'draw' || this.currentGesture === 'peace') {
                color = '#00ff00'; // Green for peace sign drawing
                size = 3;
            }
            
            // Draw a circle for immediate feedback
            ctx.globalCompositeOperation = compositeOp;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, size, 0, 2 * Math.PI);
            ctx.fill();
            
            // Draw line if we have a previous position
            if (this.lastScreenPos && this.isDrawing) {
                ctx.strokeStyle = color;
                ctx.lineWidth = this.currentGesture === 'palm' ? 10 : 3;
                ctx.lineCap = 'round';
                ctx.globalCompositeOperation = compositeOp;
                ctx.beginPath();
                ctx.moveTo(this.lastScreenPos.x, this.lastScreenPos.y);
                ctx.lineTo(screenX, screenY);
                ctx.stroke();
            }
        }
    }
    
    updateHandCursor(x, y) {
        if (!this.handCursor) return;
        
        // Show cursor when hand is detected
        this.handCursor.style.display = 'block';
        this.handCursor.style.left = x + 'px';
        this.handCursor.style.top = y + 'px';
        
        // Update cursor color based on current gesture
        let color = '#ff4757'; // Default red
        let size = 20;
        
        switch (this.currentGesture) {
            case 'point':
                color = '#0066ff'; // Blue for pointing/drawing (VERY GOOD detection)
                size = 20;
                break;
            case 'draw':
            case 'peace':
                color = '#00ff00'; // Green for peace sign drawing (VERY GOOD detection)
                size = 24;
                break;
            case 'three':
                color = '#00cc66'; // Light green for three-finger draw (GOOD detection)
                size = 22;
                break;
            case 'palm':
                color = '#ff0066'; // Pink for eraser (EXCELLENT detection)
                size = 30;
                break;
            case 'rock':
                color = '#ff6600'; // Orange-red for rock positioning (GOOD detection)
                size = 18;
                break;
            case 'fist':
                color = '#999999'; // Gray for fist positioning (POOR detection)
                size = 16;
                break;
        }
        
        this.handCursor.style.borderColor = color;
        this.handCursor.style.background = `rgba(${this.hexToRgb(color)}, 0.3)`;
        this.handCursor.style.width = size + 'px';
        this.handCursor.style.height = size + 'px';
        this.handCursor.style.boxShadow = `0 0 ${size/2}px ${color}`;
        
        // Update trail
        this.updateCursorTrail(x, y);
    }
    
    updateCursorTrail(x, y) {
        if (!this.trailPoints || this.trailPoints.length === 0) return;
        
        // Shift trail positions
        for (let i = this.trailPoints.length - 1; i > 0; i--) {
            const current = this.trailPoints[i];
            const previous = this.trailPoints[i - 1];
            
            current.style.left = previous.style.left;
            current.style.top = previous.style.top;
            current.style.display = previous.style.display;
        }
        
        // Set new head position
        if (this.trailPoints[0]) {
            this.trailPoints[0].style.left = x + 'px';
            this.trailPoints[0].style.top = y + 'px';
            this.trailPoints[0].style.display = 'block';
        }
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            const r = parseInt(result[1], 16);
            const g = parseInt(result[2], 16);
            const b = parseInt(result[3], 16);
            return `${r}, ${g}, ${b}`;
        }
        return '255, 71, 87'; // Default red
    }
    
    hideHandCursor() {
        if (this.handCursor) {
            this.handCursor.style.display = 'none';
        }
        
        if (this.trailPoints) {
            this.trailPoints.forEach(trail => {
                trail.style.display = 'none';
            });
        }
    }
    
    updateGestureIndicator(message) {
        const indicator = document.getElementById('gestureIndicator');
        if (indicator) {
            indicator.textContent = `Camera: ${message}`;
            indicator.className = 'gesture-indicator';
            
            if (message.includes('Drawing')) {
                indicator.classList.add('drawing');
            } else if (message.includes('Eraser')) {
                indicator.classList.add('erasing');
            }
        }
    }
    
    updateCameraStatus(message) {
        // Create or update camera status indicator
        let statusDiv = document.getElementById('cameraStatus');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'cameraStatus';
            statusDiv.style.cssText = `
                position: absolute;
                bottom: 20px;
                left: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-size: 12px;
                z-index: 1000;
                max-width: 300px;
            `;
            document.body.appendChild(statusDiv);
        }
        
        statusDiv.textContent = message;
    }
    
    stopCamera() {
        console.log('Stopping camera...');
        this.isActive = false;
        this.cameraInitializing = false;
        
        if (this.camera) {
            this.camera.stop();
            this.camera = null;
        }
        
        // Stop camera stream
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => {
                track.stop();
                console.log('Camera track stopped');
            });
            this.cameraStream = null;
        }
        
        if (this.video) {
            this.video.srcObject = null;
            this.video = null;
        }
        
        this.permissionGranted = false;
        
        // Clean up UI elements
        const elements = ['cameraPreview', 'cameraControls', 'cameraStatus'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.remove();
            }
        });
        
        // Clean up cursor elements
        if (this.handCursor) {
            this.handCursor.remove();
            this.handCursor = null;
        }
        
        if (this.trailPoints) {
            this.trailPoints.forEach(trail => trail.remove());
            this.trailPoints = [];
        }
        
        if (this.isDrawing) {
            this.endDrawing();
        }
        
        console.log('Camera stopped');
    }
    
    showFallbackMessage() {
        this.updateCameraStatus('MediaPipe failed to load. Using basic camera preview only.');
        console.log('Falling back to basic camera without hand tracking');
        
        // Enable basic camera without MediaPipe
        this.enableBasicCamera = true;
    }
    
    // This method is now integrated into startCamera() to prevent multiple permission requests
    
    startBasicVideoLoop() {
        if (!this.isActive || !this.video || !this.ctx) return;
        
        const drawFrame = () => {
            if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
                // Clear and draw video frame
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.save();
                this.ctx.scale(-1, 1);
                this.ctx.translate(-this.canvas.width, 0);
                this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
                this.ctx.restore();
                
                // Add overlay text
                this.ctx.fillStyle = 'rgba(255, 71, 87, 0.8)';
                this.ctx.fillRect(5, 5, 200, 25);
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.fillText('Basic Camera (No Gestures)', 10, 22);
            }
            
            if (this.isActive) {
                requestAnimationFrame(drawFrame);
            }
        };
        
        drawFrame();
    }
    
    // Public API
    isEnabled() {
        return this.isActive;
    }
    
    getCurrentGesture() {
        return this.currentGesture;
    }
    
    getGestureConfidence() {
        return this.gestureConfidence;
    }
}
