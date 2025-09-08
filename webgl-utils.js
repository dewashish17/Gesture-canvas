// WebGL utility functions for GPU-accelerated drawing
class WebGLUtils {
    static createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    static createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program linking error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
        }
        
        return program;
    }
    
    static createTexture(gl, width, height) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        
        // Create empty texture
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        
        // Set texture parameters for smooth rendering
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        return texture;
    }
    
    static createFramebuffer(gl, texture) {
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('Framebuffer not complete');
        }
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return framebuffer;
    }
    
    static createBuffer(gl, data) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        return buffer;
    }
    
    static resizeCanvas(canvas) {
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;
        
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
            canvas.width = displayWidth;
            canvas.height = displayHeight;
            return true;
        }
        
        return false;
    }
    
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : { r: 0, g: 0, b: 0 };
    }
}

// Shader sources for GPU-accelerated drawing
const VERTEX_SHADER_SOURCE = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    
    uniform vec2 u_resolution;
    uniform mat3 u_transform;
    
    varying vec2 v_texCoord;
    
    void main() {
        vec3 position = u_transform * vec3(a_position, 1.0);
        vec2 clipSpace = ((position.xy / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
        gl_Position = vec4(clipSpace, 0, 1);
        v_texCoord = a_texCoord;
    }
`;

const FRAGMENT_SHADER_SOURCE = `
    precision mediump float;
    
    uniform sampler2D u_texture;
    uniform vec4 u_color;
    uniform float u_alpha;
    
    varying vec2 v_texCoord;
    
    void main() {
        vec4 texColor = texture2D(u_texture, v_texCoord);
        gl_FragColor = mix(texColor, u_color, u_alpha);
    }
`;

const BRUSH_FRAGMENT_SHADER = `
    precision mediump float;
    
    uniform vec2 u_center;
    uniform float u_radius;
    uniform vec4 u_color;
    uniform vec2 u_resolution;
    
    void main() {
        vec2 pos = gl_FragCoord.xy;
        float dist = distance(pos, u_center);
        
        // Smooth brush with anti-aliasing
        float alpha = 1.0 - smoothstep(u_radius - 1.0, u_radius + 1.0, dist);
        
        // Pressure-sensitive opacity
        alpha *= u_color.a;
        
        gl_FragColor = vec4(u_color.rgb, alpha);
    }
`;

const ERASER_FRAGMENT_SHADER = `
    precision mediump float;
    
    uniform vec2 u_center;
    uniform float u_radius;
    uniform vec2 u_resolution;
    
    void main() {
        vec2 pos = gl_FragCoord.xy;
        float dist = distance(pos, u_center);
        
        // Smooth eraser with anti-aliasing
        float alpha = smoothstep(u_radius - 1.0, u_radius + 1.0, dist);
        
        gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    }
`;
