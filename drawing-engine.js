// GPU-accelerated drawing engine with smooth stroke rendering
class DrawingEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (!this.gl) {
            throw new Error('WebGL not supported');
        }
        
        this.currentTool = 'pen';
        this.currentColor = { r: 0, g: 0, b: 0, a: 1 };
        this.brushSize = 5;
        this.isDrawing = false;
        this.lastPoint = null;
        this.pressure = 1.0;
        
        // Stroke smoothing - reduced for better responsiveness
        this.strokePoints = [];
        this.smoothingFactor = 0.1;
        
        this.initWebGL();
        this.setupBuffers();
        this.clear();
    }
    
    initWebGL() {
        const gl = this.gl;
        
        // Create shaders
        const vertexShader = WebGLUtils.createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
        const fragmentShader = WebGLUtils.createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
        const brushFragmentShader = WebGLUtils.createShader(gl, gl.FRAGMENT_SHADER, BRUSH_FRAGMENT_SHADER);
        const eraserFragmentShader = WebGLUtils.createShader(gl, gl.FRAGMENT_SHADER, ERASER_FRAGMENT_SHADER);
        
        // Create programs
        this.mainProgram = WebGLUtils.createProgram(gl, vertexShader, fragmentShader);
        this.brushProgram = WebGLUtils.createProgram(gl, vertexShader, brushFragmentShader);
        this.eraserProgram = WebGLUtils.createProgram(gl, vertexShader, eraserFragmentShader);
        
        // Get uniform and attribute locations
        this.setupProgramLocations();
        
        // Create textures and framebuffers for double buffering
        this.setupRenderTargets();
        
        // Enable blending for smooth strokes
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Optimize for performance
        gl.hint(gl.FRAGMENT_SHADER_DERIVATIVE_HINT, gl.FASTEST);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        
        console.log('GPU acceleration enabled with WebGL');
    }
    
    setupProgramLocations() {
        const gl = this.gl;
        
        // Main program locations
        this.mainLocations = {
            position: gl.getAttribLocation(this.mainProgram, 'a_position'),
            texCoord: gl.getAttribLocation(this.mainProgram, 'a_texCoord'),
            resolution: gl.getUniformLocation(this.mainProgram, 'u_resolution'),
            transform: gl.getUniformLocation(this.mainProgram, 'u_transform'),
            texture: gl.getUniformLocation(this.mainProgram, 'u_texture'),
            color: gl.getUniformLocation(this.mainProgram, 'u_color'),
            alpha: gl.getUniformLocation(this.mainProgram, 'u_alpha')
        };
        
        // Brush program locations
        this.brushLocations = {
            position: gl.getAttribLocation(this.brushProgram, 'a_position'),
            center: gl.getUniformLocation(this.brushProgram, 'u_center'),
            radius: gl.getUniformLocation(this.brushProgram, 'u_radius'),
            color: gl.getUniformLocation(this.brushProgram, 'u_color'),
            resolution: gl.getUniformLocation(this.brushProgram, 'u_resolution')
        };
        
        // Eraser program locations
        this.eraserLocations = {
            position: gl.getAttribLocation(this.eraserProgram, 'a_position'),
            center: gl.getUniformLocation(this.eraserProgram, 'u_center'),
            radius: gl.getUniformLocation(this.eraserProgram, 'u_radius'),
            resolution: gl.getUniformLocation(this.eraserProgram, 'u_resolution')
        };
    }
    
    setupRenderTargets() {
        const gl = this.gl;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Create textures for double buffering
        this.frontTexture = WebGLUtils.createTexture(gl, width, height);
        this.backTexture = WebGLUtils.createTexture(gl, width, height);
        
        // Create framebuffers
        this.frontFramebuffer = WebGLUtils.createFramebuffer(gl, this.frontTexture);
        this.backFramebuffer = WebGLUtils.createFramebuffer(gl, this.backTexture);
        
        // Initialize with white background
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frontFramebuffer);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.backFramebuffer);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    
    setupBuffers() {
        const gl = this.gl;
        
        // Full-screen quad vertices
        const vertices = [
            -1, -1, 0, 0,  // bottom-left
             1, -1, 1, 0,  // bottom-right
            -1,  1, 0, 1,  // top-left
             1,  1, 1, 1   // top-right
        ];
        
        this.quadBuffer = WebGLUtils.createBuffer(gl, vertices);
        
        // Circle vertices for brush rendering
        const circleVertices = [];
        const segments = 32;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            circleVertices.push(Math.cos(angle), Math.sin(angle));
        }
        
        this.circleBuffer = WebGLUtils.createBuffer(gl, circleVertices);
    }
    
    resize() {
        if (WebGLUtils.resizeCanvas(this.canvas)) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            this.setupRenderTargets();
            console.log(`Canvas resized to: ${this.canvas.width}x${this.canvas.height}`);
        }
    }
    
    setTool(tool) {
        this.currentTool = tool;
    }
    
    setColor(color) {
        this.currentColor = WebGLUtils.hexToRgb(color);
        this.currentColor.a = 1.0;
    }
    
    setBrushSize(size) {
        this.brushSize = size;
    }
    
    setPressure(pressure) {
        this.pressure = Math.max(0.1, Math.min(1.0, pressure));
    }
    
    startStroke(x, y, pressure = 1.0) {
        console.log(`Starting stroke at: ${x.toFixed(1)}, ${y.toFixed(1)} with pressure: ${pressure}`);
        
        this.isDrawing = true;
        this.lastPoint = { x, y };
        this.strokePoints = [{ x, y, pressure }];
        this.setPressure(pressure);
        
        // Draw initial point
        this.drawPoint(x, y);
    }
    
    continueStroke(x, y, pressure = 1.0) {
        if (!this.isDrawing) return;
        
        this.setPressure(pressure);
        
        // Add point to stroke with smoothing
        const smoothedPoint = this.smoothPoint(x, y);
        this.strokePoints.push({ ...smoothedPoint, pressure });
        
        // Draw line from last point to current point
        if (this.lastPoint) {
            this.drawLine(this.lastPoint.x, this.lastPoint.y, smoothedPoint.x, smoothedPoint.y);
        }
        
        this.lastPoint = smoothedPoint;
    }
    
    endStroke() {
        this.isDrawing = false;
        this.lastPoint = null;
        this.strokePoints = [];
        
        // Swap buffers for next stroke
        this.swapBuffers();
    }
    
    smoothPoint(x, y) {
        if (this.strokePoints.length < 2) {
            return { x, y };
        }
        
        const lastPoint = this.strokePoints[this.strokePoints.length - 1];
        const smoothX = lastPoint.x + (x - lastPoint.x) * this.smoothingFactor;
        const smoothY = lastPoint.y + (y - lastPoint.y) * this.smoothingFactor;
        
        return { x: smoothX, y: smoothY };
    }
    
    drawPoint(x, y) {
        const gl = this.gl;
        
        // Validate coordinates
        if (isNaN(x) || isNaN(y) || x < 0 || y < 0 || x > this.canvas.width || y > this.canvas.height) {
            console.warn(`Invalid coordinates: ${x}, ${y}`);
            return;
        }
        
        const program = this.currentTool === 'eraser' ? this.eraserProgram : this.brushProgram;
        const locations = this.currentTool === 'eraser' ? this.eraserLocations : this.brushLocations;
        
        // Render to back buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.backFramebuffer);
        gl.useProgram(program);
        
        // Copy front buffer to back buffer first
        this.copyTexture(this.frontTexture, this.backFramebuffer);
        
        // Set uniforms
        gl.uniform2f(locations.center, x, this.canvas.height - y);
        gl.uniform1f(locations.radius, this.brushSize * this.pressure);
        gl.uniform2f(locations.resolution, this.canvas.width, this.canvas.height);
        
        if (this.currentTool !== 'eraser') {
            const color = { ...this.currentColor, a: this.pressure };
            gl.uniform4f(locations.color, color.r, color.g, color.b, color.a);
        }
        
        // Draw circle
        gl.bindBuffer(gl.ARRAY_BUFFER, this.circleBuffer);
        gl.enableVertexAttribArray(locations.position);
        gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);
        
        // Set blending mode
        if (this.currentTool === 'eraser') {
            gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA);
        } else {
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 34);
        
        // Restore blending
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Render to screen
        this.renderToScreen();
    }
    
    drawLine(x1, y1, x2, y2) {
        const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const steps = Math.max(1, Math.floor(distance / 2));
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = x1 + (x2 - x1) * t;
            const y = y1 + (y2 - y1) * t;
            this.drawPoint(x, y);
        }
    }
    
    copyTexture(sourceTexture, targetFramebuffer) {
        const gl = this.gl;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);
        gl.useProgram(this.mainProgram);
        
        // Bind source texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
        gl.uniform1i(this.mainLocations.texture, 0);
        
        // Set uniforms
        gl.uniform2f(this.mainLocations.resolution, this.canvas.width, this.canvas.height);
        gl.uniform4f(this.mainLocations.color, 1, 1, 1, 1);
        gl.uniform1f(this.mainLocations.alpha, 1);
        
        // Identity transform
        gl.uniformMatrix3fv(this.mainLocations.transform, false, [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]);
        
        // Draw quad
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(this.mainLocations.position);
        gl.enableVertexAttribArray(this.mainLocations.texCoord);
        gl.vertexAttribPointer(this.mainLocations.position, 2, gl.FLOAT, false, 16, 0);
        gl.vertexAttribPointer(this.mainLocations.texCoord, 2, gl.FLOAT, false, 16, 8);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    
    renderToScreen() {
        const gl = this.gl;
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        this.copyTexture(this.backTexture, null);
    }
    
    swapBuffers() {
        [this.frontTexture, this.backTexture] = [this.backTexture, this.frontTexture];
        [this.frontFramebuffer, this.backFramebuffer] = [this.backFramebuffer, this.frontFramebuffer];
    }
    
    clear() {
        const gl = this.gl;
        
        // Clear both buffers
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frontFramebuffer);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.backFramebuffer);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Render to screen
        this.renderToScreen();
    }
    
    getImageData() {
        const gl = this.gl;
        const pixels = new Uint8Array(this.canvas.width * this.canvas.height * 4);
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frontFramebuffer);
        gl.readPixels(0, 0, this.canvas.width, this.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        
        return pixels;
    }
}
