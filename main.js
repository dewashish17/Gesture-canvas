// Main application controller
class DrawingApp {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.drawingEngine = null;
        this.gestureHandler = null;
        this.cameraGestureDetector = null;
        this.currentTool = 'pen';
        this.currentColor = '#000000';
        this.brushSize = 5;
        
        this.init();
    }
    
    init() {
        try {
            // Initialize drawing engine with GPU acceleration
            this.drawingEngine = new DrawingEngine(this.canvas);
            this.gestureHandler = new GestureHandler(this.canvas, this.drawingEngine);
            
            // Initialize camera gesture detection
            this.cameraGestureDetector = new CameraGestureDetector(this.drawingEngine, this.gestureHandler);
            
            this.setupUI();
            this.setupCameraControls();
            this.setupResizeHandler();
            this.updateCanvasSize();
            
            // Test basic drawing functionality
            this.testDrawingEngine();
            
            // Add fallback mouse drawing for debugging
            this.setupFallbackDrawing();
            
            // Auto-prompt for camera access after a short delay
            setTimeout(() => {
                this.promptForCameraAccess();
            }, 1000);
            
            console.log('Drawing app initialized successfully with GPU acceleration');
        } catch (error) {
            console.error('Failed to initialize drawing app:', error);
            this.showError('WebGL not supported. Please use a modern browser.');
        }
    }
    
    setupUI() {
        // Tool buttons
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tool = button.dataset.tool;
                this.selectTool(tool);
                
                // Visual feedback
                button.classList.add('active-gesture');
                setTimeout(() => button.classList.remove('active-gesture'), 300);
            });
            
            // Touch support for tool buttons
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                const tool = button.dataset.tool;
                this.selectTool(tool);
            });
        });
        
        // Color buttons
        const colorButtons = document.querySelectorAll('.color-btn');
        colorButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const color = button.dataset.color;
                this.selectColor(color);
                
                // Visual feedback
                button.classList.add('active-gesture');
                setTimeout(() => button.classList.remove('active-gesture'), 300);
            });
            
            // Touch support for color buttons
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                const color = button.dataset.color;
                this.selectColor(color);
            });
        });
        
        // Clear button
        const clearButton = document.querySelector('.clear-btn');
        if (clearButton) {
            clearButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearCanvas();
                
                // Visual feedback
                clearButton.classList.add('active-gesture');
                setTimeout(() => clearButton.classList.remove('active-gesture'), 300);
            });
            
            // Touch support
            clearButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.clearCanvas();
            });
        }
        
        // Brush size slider
        const brushSlider = document.getElementById('brushSize');
        const brushSizeValue = document.getElementById('brushSizeValue');
        
        if (brushSlider && brushSizeValue) {
            brushSlider.addEventListener('input', (e) => {
                const size = parseInt(e.target.value);
                this.setBrushSize(size);
                brushSizeValue.textContent = `${size}px`;
            });
            
            // Touch support for slider
            brushSlider.addEventListener('touchmove', (e) => {
                // Prevent scrolling while adjusting slider
                e.stopPropagation();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
        
        // Prevent right-click context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Handle window focus/blur for performance optimization
        window.addEventListener('focus', () => {
            this.gestureHandler.enableDrawing();
        });
        
        window.addEventListener('blur', () => {
            // End any ongoing strokes when window loses focus
            if (this.gestureHandler.isDrawing) {
                this.gestureHandler.endGesture(0, 0, Date.now());
            }
        });
    }
    
    setupCameraControls() {
        const startCameraBtn = document.getElementById('startCameraBtn');
        if (!startCameraBtn) return;
        
        startCameraBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            // Prevent multiple clicks and camera initialization attempts
            if (startCameraBtn.disabled || this.cameraGestureDetector.cameraInitializing) {
                console.log('Camera button click ignored - already initializing');
                return;
            }
            
            if (!this.cameraGestureDetector.isEnabled()) {
                // Start camera - single attempt
                startCameraBtn.disabled = true;
                startCameraBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="2"/>
                        <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/>
                    </svg>
                    Requesting Permission...
                `;
                
                console.log('Starting camera from button click...');
                
                try {
                    // Add timeout to prevent hanging
                    const cameraPromise = this.cameraGestureDetector.startCamera();
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Camera timeout')), 10000)
                    );
                    
                    await Promise.race([cameraPromise, timeoutPromise]);
                    
                    if (this.cameraGestureDetector.isEnabled()) {
                        startCameraBtn.innerHTML = `
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z"/>
                            </svg>
                            Stop Camera
                        `;
                        startCameraBtn.classList.add('active');
                        
                        // Show camera instructions
                        this.showCameraInstructions();
                    } else {
                        throw new Error('Camera failed to initialize');
                    }
                    
                } catch (error) {
                    console.error('Failed to start camera:', error);
                    startCameraBtn.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/>
                        </svg>
                        Camera Failed - Retry
                    `;
                } finally {
                    startCameraBtn.disabled = false;
                }
                
            } else {
                // Stop camera
                this.cameraGestureDetector.stopCamera();
                
                startCameraBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/>
                    </svg>
                    Start Camera
                `;
                startCameraBtn.classList.remove('active');
            }
        });
        
        // Touch support for camera button
        startCameraBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            startCameraBtn.click();
        });
    }
    
    showCameraInstructions() {
        const indicator = document.getElementById('gestureIndicator');
        if (indicator) {
            const originalText = indicator.textContent;
            indicator.textContent = 'Camera active! Show your hand to start drawing';
            indicator.classList.add('drawing');
            
            setTimeout(() => {
                if (!this.cameraGestureDetector.isEnabled()) return;
                indicator.textContent = 'Try pointing with your index finger';
                
                setTimeout(() => {
                    if (!this.cameraGestureDetector.isEnabled()) return;
                    indicator.textContent = originalText;
                    indicator.classList.remove('drawing');
                }, 3000);
            }, 3000);
        }
    }
    
    promptForCameraAccess() {
        if (this.cameraGestureDetector && !this.cameraGestureDetector.isEnabled()) {
            const indicator = document.getElementById('gestureIndicator');
            if (indicator) {
                indicator.innerHTML = `
                    🎥 <strong>Computer Vision Drawing!</strong><br>
                    Click "Start Camera" to draw with hand gestures<br>
                    <small>Camera permission will be requested</small>
                `;
                indicator.style.fontSize = '14px';
                indicator.style.textAlign = 'center';
                indicator.style.lineHeight = '1.4';
                
                // Highlight camera button
                const cameraBtn = document.getElementById('startCameraBtn');
                if (cameraBtn) {
                    cameraBtn.style.animation = 'pulse 2s infinite';
                    cameraBtn.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.6)';
                }
            }
        }
    }
    
    setupResizeHandler() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.updateCanvasSize();
            }, 100);
        });
        
        // Handle orientation changes on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateCanvasSize();
            }, 500);
        });
    }
    
    updateCanvasSize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Ensure minimum canvas size
        const width = Math.max(800, rect.width);
        const height = Math.max(600, rect.height);
        
        console.log(`Updating canvas size to: ${width}x${height}`);
        
        // Set canvas size to container size
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Also set CSS size to match
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        // Update drawing engine
        if (this.drawingEngine) {
            this.drawingEngine.resize();
        }
    }
    
    selectTool(tool) {
        this.currentTool = tool;
        
        if (this.drawingEngine) {
            this.drawingEngine.setTool(tool);
        }
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeButton = document.querySelector(`[data-tool="${tool}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        // Update cursor
        this.updateCursor();
        
        console.log(`Selected tool: ${tool}`);
    }
    
    selectColor(color) {
        this.currentColor = color;
        
        if (this.drawingEngine) {
            this.drawingEngine.setColor(color);
        }
        
        // Update UI
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeButton = document.querySelector(`[data-color="${color}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        console.log(`Selected color: ${color}`);
    }
    
    setBrushSize(size) {
        this.brushSize = size;
        
        if (this.drawingEngine) {
            this.drawingEngine.setBrushSize(size);
        }
        
        // Update cursor size
        this.updateCursor();
        
        console.log(`Brush size: ${size}px`);
    }
    
    updateCursor() {
        const canvas = this.canvas;
        
        switch (this.currentTool) {
            case 'pen':
                canvas.style.cursor = 'crosshair';
                break;
            case 'eraser':
                canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="${this.brushSize}" fill="rgba(255,0,0,0.3)" stroke="red"/></svg>') 12 12, auto`;
                break;
            default:
                canvas.style.cursor = 'default';
        }
    }
    
    clearCanvas() {
        if (this.drawingEngine) {
            this.drawingEngine.clear();
            console.log('Canvas cleared');
        }
        
        // Show confirmation feedback
        const indicator = document.getElementById('gestureIndicator');
        if (indicator) {
            const originalText = indicator.textContent;
            indicator.textContent = 'Canvas cleared!';
            setTimeout(() => {
                indicator.textContent = originalText;
            }, 2000);
        }
    }
    
    handleKeyboard(e) {
        // Prevent default for drawing-related shortcuts
        switch (e.key.toLowerCase()) {
            case 'p':
                e.preventDefault();
                this.selectTool('pen');
                break;
            case 'e':
                e.preventDefault();
                this.selectTool('eraser');
                break;
            case 'c':
                if (e.ctrlKey || e.metaKey) {
                    // Allow normal copy
                    break;
                }
                e.preventDefault();
                this.clearCanvas();
                break;
            case '[':
                e.preventDefault();
                this.setBrushSize(Math.max(1, this.brushSize - 1));
                document.getElementById('brushSize').value = this.brushSize;
                document.getElementById('brushSizeValue').textContent = `${this.brushSize}px`;
                break;
            case ']':
                e.preventDefault();
                this.setBrushSize(Math.min(50, this.brushSize + 1));
                document.getElementById('brushSize').value = this.brushSize;
                document.getElementById('brushSizeValue').textContent = `${this.brushSize}px`;
                break;
            case 'escape':
                e.preventDefault();
                if (this.gestureHandler.isDrawing) {
                    this.gestureHandler.endGesture(0, 0, Date.now());
                }
                break;
        }
        
        // Color shortcuts (1-9 for first 9 colors)
        const colorKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
        const colorIndex = colorKeys.indexOf(e.key);
        if (colorIndex !== -1) {
            e.preventDefault();
            const colorButtons = document.querySelectorAll('.color-btn');
            if (colorButtons[colorIndex]) {
                const color = colorButtons[colorIndex].dataset.color;
                this.selectColor(color);
            }
        }
    }
    
    showError(message) {
        const container = document.querySelector('.canvas-container');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            font-weight: bold;
            z-index: 1000;
        `;
        errorDiv.textContent = message;
        container.appendChild(errorDiv);
    }
    
    testDrawingEngine() {
        // Test if drawing engine is working
        try {
            console.log('Testing drawing engine...');
            console.log('Canvas size:', this.canvas.width, 'x', this.canvas.height);
            console.log('Drawing engine initialized:', !!this.drawingEngine);
            
            // Test a simple stroke
            setTimeout(() => {
                if (this.drawingEngine) {
                    console.log('Testing stroke at center of canvas');
                    const centerX = this.canvas.width / 2;
                    const centerY = this.canvas.height / 2;
                    
                    this.drawingEngine.startStroke(centerX, centerY, 1.0);
                    this.drawingEngine.continueStroke(centerX + 50, centerY + 50, 1.0);
                    this.drawingEngine.endStroke();
                    
                    console.log('Test stroke completed');
                }
            }, 500);
            
        } catch (error) {
            console.error('Drawing engine test failed:', error);
        }
    }
    
    setupFallbackDrawing() {
        // Add a 2D context fallback for debugging
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = this.canvas.width;
        fallbackCanvas.height = this.canvas.height;
        fallbackCanvas.style.position = 'absolute';
        fallbackCanvas.style.top = '0';
        fallbackCanvas.style.left = '0';
        fallbackCanvas.style.pointerEvents = 'none';
        fallbackCanvas.style.zIndex = '10';
        
        const fallbackCtx = fallbackCanvas.getContext('2d');
        this.canvas.parentElement.appendChild(fallbackCanvas);
        
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;
        
        const drawFallback = (x, y) => {
            if (!isDrawing) return;
            
            fallbackCtx.globalCompositeOperation = 'source-over';
            fallbackCtx.lineJoin = 'round';
            fallbackCtx.lineCap = 'round';
            fallbackCtx.lineWidth = this.brushSize;
            fallbackCtx.strokeStyle = this.currentColor;
            
            fallbackCtx.beginPath();
            fallbackCtx.moveTo(lastX, lastY);
            fallbackCtx.lineTo(x, y);
            fallbackCtx.stroke();
            
            lastX = x;
            lastY = y;
        };
        
        // Enable fallback drawing temporarily
        fallbackCanvas.style.pointerEvents = 'auto';
        
        fallbackCanvas.addEventListener('mousedown', (e) => {
            const rect = fallbackCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            isDrawing = true;
            lastX = x;
            lastY = y;
            
            console.log('Fallback drawing started at:', x, y);
        });
        
        fallbackCanvas.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;
            
            const rect = fallbackCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            drawFallback(x, y);
        });
        
        fallbackCanvas.addEventListener('mouseup', () => {
            if (isDrawing) {
                isDrawing = false;
                console.log('Fallback drawing ended');
            }
        });
        
        // Store reference for cleanup
        this.fallbackCanvas = fallbackCanvas;
        this.fallbackCtx = fallbackCtx;
        
        // Add keyboard shortcuts for testing camera drawing and erasing
        document.addEventListener('keydown', (e) => {
            if (e.key === 't' && this.cameraGestureDetector) {
                console.log('🧪 Testing camera drawing manually...');
                if (!this.cameraGestureDetector.isDrawing) {
                    this.cameraGestureDetector.currentGesture = 'draw';
                    this.cameraGestureDetector.drawingEngine.setTool('pen');
                    this.cameraGestureDetector.startDrawing({ x: 0.5, y: 0.5 });
                    console.log('✅ Manual drawing started');
                } else {
                    this.cameraGestureDetector.endDrawing();
                    console.log('⏹️ Manual drawing stopped');
                }
            } else if (e.key === 'e' && this.cameraGestureDetector) {
                console.log('🧹 Testing camera eraser manually...');
                if (!this.cameraGestureDetector.isDrawing) {
                    this.cameraGestureDetector.currentGesture = 'palm';
                    this.cameraGestureDetector.drawingEngine.setTool('eraser');
                    this.cameraGestureDetector.startDrawing({ x: 0.5, y: 0.5 });
                    console.log('✅ Manual erasing started');
                } else {
                    this.cameraGestureDetector.endDrawing();
                    console.log('⏹️ Manual erasing stopped');
                }
            } else if (e.key === 'f' && this.cameraGestureDetector) {
                console.log('✊ Testing fist cursor positioning manually...');
                this.cameraGestureDetector.currentGesture = 'fist';
                if (this.cameraGestureDetector.isDrawing) {
                    this.cameraGestureDetector.endDrawing();
                }
                // Force cursor to show at center
                this.cameraGestureDetector.updateHandCursor(400, 300);
                console.log('🎯 Manual fist positioning mode activated');
            }
        });
    }
    
    // Public API methods
    exportImage() {
        if (!this.drawingEngine) return null;
        
        // Create a temporary canvas to export the image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Get image data from WebGL canvas
        const imageData = this.drawingEngine.getImageData();
        const canvasImageData = tempCtx.createImageData(this.canvas.width, this.canvas.height);
        canvasImageData.data.set(imageData);
        tempCtx.putImageData(canvasImageData, 0, 0);
        
        return tempCanvas.toDataURL('image/png');
    }
    
    importImage(imageData) {
        // This would require additional implementation to load images into WebGL
        console.log('Import image functionality would be implemented here');
    }
    
    getPerformanceStats() {
        return {
            tool: this.currentTool,
            color: this.currentColor,
            brushSize: this.brushSize,
            canvasSize: {
                width: this.canvas.width,
                height: this.canvas.height
            },
            webglSupport: !!this.drawingEngine,
            pressure: this.gestureHandler ? this.gestureHandler.getCurrentPressure() : 0,
            velocity: this.gestureHandler ? this.gestureHandler.getCurrentVelocity() : 0,
            cameraActive: this.cameraGestureDetector ? this.cameraGestureDetector.isEnabled() : false,
            currentCameraGesture: this.cameraGestureDetector ? this.cameraGestureDetector.getCurrentGesture() : 'none'
        };
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.drawingApp = new DrawingApp();
});

// Handle page visibility changes for performance
document.addEventListener('visibilitychange', () => {
    if (window.drawingApp && window.drawingApp.gestureHandler) {
        if (document.hidden) {
            // Pause drawing when page is hidden
            window.drawingApp.gestureHandler.disableDrawing();
        } else {
            // Resume drawing when page is visible
            window.drawingApp.gestureHandler.enableDrawing();
        }
    }
});

// Export for debugging
window.DrawingApp = DrawingApp;
