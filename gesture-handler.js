// Advanced gesture recognition for drawing and UI interactions
class GestureHandler {
    constructor(canvas, drawingEngine) {
        this.canvas = canvas;
        this.drawingEngine = drawingEngine;
        this.isDrawing = false;
        this.touches = new Map();
        this.gestureStartTime = 0;
        this.gestureStartPos = null;
        this.lastMoveTime = 0;
        this.velocity = { x: 0, y: 0 };
        this.pressure = 1.0;
        
        // Gesture recognition parameters
        this.tapThreshold = 200; // ms
        this.tapDistanceThreshold = 10; // pixels
        this.palmThreshold = 50; // minimum size for palm detection
        this.drawingVelocityThreshold = 100; // pixels/second
        
        // Smoothing for pressure sensitivity
        this.pressureHistory = [];
        this.pressureHistorySize = 5;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Mouse events for desktop
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Prevent scrolling when drawing
        document.addEventListener('touchmove', (e) => {
            if (this.isDrawing) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }
    
    calculatePressure(force, radiusX, radiusY) {
        // Simulate pressure based on touch size and force
        let pressure = 1.0;
        
        if (force !== undefined && force > 0) {
            pressure = Math.min(force * 2, 1.0);
        } else if (radiusX !== undefined && radiusY !== undefined) {
            // Use touch size as pressure indicator
            const avgRadius = (radiusX + radiusY) / 2;
            pressure = Math.min(avgRadius / 20, 1.0);
        }
        
        // Smooth pressure changes
        this.pressureHistory.push(pressure);
        if (this.pressureHistory.length > this.pressureHistorySize) {
            this.pressureHistory.shift();
        }
        
        return this.pressureHistory.reduce((sum, p) => sum + p, 0) / this.pressureHistory.length;
    }
    
    calculateVelocity(x, y, timestamp) {
        if (this.lastMoveTime > 0) {
            const deltaTime = timestamp - this.lastMoveTime;
            const deltaX = x - (this.gestureStartPos?.x || x);
            const deltaY = y - (this.gestureStartPos?.y || y);
            
            if (deltaTime > 0) {
                this.velocity.x = deltaX / deltaTime * 1000; // pixels per second
                this.velocity.y = deltaY / deltaTime * 1000;
            }
        }
        
        this.lastMoveTime = timestamp;
    }
    
    detectGestureType(touch) {
        const radiusX = touch.radiusX || 0;
        const radiusY = touch.radiusY || 0;
        const avgRadius = (radiusX + radiusY) / 2;
        
        // Palm detection based on touch size
        if (avgRadius > this.palmThreshold) {
            return 'palm';
        }
        
        // Drawing gesture based on movement
        const totalVelocity = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        if (totalVelocity > this.drawingVelocityThreshold) {
            return 'draw';
        }
        
        return 'tap';
    }
    
    updateGestureIndicator(gestureType) {
        const indicator = document.getElementById('gestureIndicator');
        if (!indicator) return;
        
        indicator.className = 'gesture-indicator';
        
        switch (gestureType) {
            case 'draw':
                indicator.textContent = 'Drawing...';
                indicator.classList.add('drawing');
                break;
            case 'palm':
                indicator.textContent = 'Eraser mode';
                indicator.classList.add('erasing');
                break;
            case 'tap':
                indicator.textContent = 'Tap detected';
                break;
            default:
                indicator.textContent = 'Ready to draw';
        }
    }
    
    // Mouse event handlers
    handleMouseDown(e) {
        e.preventDefault();
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        this.startGesture(coords.x, coords.y, Date.now(), 1.0);
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing) return;
        e.preventDefault();
        
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        const timestamp = Date.now();
        
        this.calculateVelocity(coords.x, coords.y, timestamp);
        this.continueGesture(coords.x, coords.y, timestamp, 1.0);
    }
    
    handleMouseUp(e) {
        if (!this.isDrawing) return;
        e.preventDefault();
        
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        this.endGesture(coords.x, coords.y, Date.now());
    }
    
    // Touch event handlers
    handleTouchStart(e) {
        e.preventDefault();
        
        for (let touch of e.changedTouches) {
            const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            const pressure = this.calculatePressure(touch.force, touch.radiusX, touch.radiusY);
            
            this.touches.set(touch.identifier, {
                x: coords.x,
                y: coords.y,
                startTime: Date.now(),
                pressure: pressure
            });
            
            // Only handle single touch for drawing
            if (this.touches.size === 1) {
                this.startGesture(coords.x, coords.y, Date.now(), pressure, touch);
            }
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        for (let touch of e.changedTouches) {
            if (!this.touches.has(touch.identifier)) continue;
            
            const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            const pressure = this.calculatePressure(touch.force, touch.radiusX, touch.radiusY);
            const timestamp = Date.now();
            
            this.calculateVelocity(coords.x, coords.y, timestamp);
            
            // Update touch data
            const touchData = this.touches.get(touch.identifier);
            touchData.x = coords.x;
            touchData.y = coords.y;
            touchData.pressure = pressure;
            
            // Only handle single touch for drawing
            if (this.touches.size === 1 && this.isDrawing) {
                this.continueGesture(coords.x, coords.y, timestamp, pressure, touch);
            }
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        
        for (let touch of e.changedTouches) {
            if (!this.touches.has(touch.identifier)) continue;
            
            const touchData = this.touches.get(touch.identifier);
            const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            
            // Check if this was a tap gesture
            const duration = Date.now() - touchData.startTime;
            const distance = Math.sqrt(
                (coords.x - touchData.x) ** 2 + (coords.y - touchData.y) ** 2
            );
            
            if (duration < this.tapThreshold && distance < this.tapDistanceThreshold) {
                this.handleTapGesture(coords.x, coords.y);
            }
            
            this.touches.delete(touch.identifier);
            
            // End drawing if this was the drawing touch
            if (this.touches.size === 0 && this.isDrawing) {
                this.endGesture(coords.x, coords.y, Date.now());
            }
        }
    }
    
    startGesture(x, y, timestamp, pressure, touch = null) {
        this.gestureStartTime = timestamp;
        this.gestureStartPos = { x, y };
        this.lastMoveTime = timestamp;
        this.pressure = pressure;
        this.pressureHistory = [pressure];
        
        // Detect gesture type for touch
        if (touch) {
            const gestureType = this.detectGestureType(touch);
            this.updateGestureIndicator(gestureType);
            
            // Switch to eraser for palm gestures
            if (gestureType === 'palm') {
                this.drawingEngine.setTool('eraser');
            }
        }
        
        this.isDrawing = true;
        this.drawingEngine.startStroke(x, y, pressure);
    }
    
    continueGesture(x, y, timestamp, pressure, touch = null) {
        this.pressure = pressure;
        
        // Update gesture type for touch
        if (touch) {
            const gestureType = this.detectGestureType(touch);
            this.updateGestureIndicator(gestureType);
        }
        
        this.drawingEngine.continueStroke(x, y, pressure);
    }
    
    endGesture(x, y, timestamp) {
        this.isDrawing = false;
        this.drawingEngine.endStroke();
        this.updateGestureIndicator('ready');
        
        // Reset velocity
        this.velocity = { x: 0, y: 0 };
        this.pressureHistory = [];
    }
    
    handleTapGesture(x, y) {
        this.updateGestureIndicator('tap');
        
        // Check if tap is on a UI element
        const element = document.elementFromPoint(
            x + this.canvas.getBoundingClientRect().left,
            y + this.canvas.getBoundingClientRect().top
        );
        
        if (element && element !== this.canvas) {
            // Simulate click on UI element
            element.click();
        }
        
        // Reset indicator after short delay
        setTimeout(() => {
            this.updateGestureIndicator('ready');
        }, 1000);
    }
    
    // Public methods for external control
    enableDrawing() {
        this.canvas.style.pointerEvents = 'auto';
    }
    
    disableDrawing() {
        this.canvas.style.pointerEvents = 'none';
        if (this.isDrawing) {
            this.endGesture(0, 0, Date.now());
        }
    }
    
    getCurrentPressure() {
        return this.pressure;
    }
    
    getCurrentVelocity() {
        return Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    }
}
