import { initBuffers } from "./init-buffers.js";
import { drawScene } from "./draw-scene.js";
import clickAndDrag from "./click-and-drag.js";
import resizeCanvas from "./resize-canvas.js";

const vertex_shader = 
`#version 300 es
precision mediump float;
in vec4 aVertexPosition;
in vec4 aVertexColor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

out vec4 vColor;

void main(void) {
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  vColor = aVertexColor;
}
`;

const fragment_shader = 
`#version 300 es
precision mediump float;
in vec4 vColor;
out vec4 outputColor;

void main(void) {
    outputColor = vColor;
}
`;

/** creates a shader of the given type, uploads the source and compiles it. 
 * @param {WebGLRenderingContext} gl
 * @param {number} type
 * @param {string} source */
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (shader === null) {
        throw new Error("Unable to create shader.");
    }

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const infoLog = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`An error occurred compiling the shaders: ${infoLog}`);
    }

    return shader;
}

/** Initialize a shader program, so WebGL knows how to draw our data
 * @param {WebGLRenderingContext} gl
 * @param {string} vsSource
 * @param {string} fsSource */
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();

    if (shaderProgram === null) {
        throw new Error("Unable to create shader program.");
    }

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        const infoLog = gl.getProgramInfoLog(shaderProgram);
        throw new Error(`Unable to initialize the shader program: ${infoLog}`);
    }

    return shaderProgram;
}


function initGl() {
    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector("#glcanvas");
    const gl = canvas.getContext("webgl2", {antialias: false});
    window.gl = gl;
    window.canvas = canvas;
    resizeCanvas(canvas, gl);


    if (gl === null) {
        throw new Error("Unable to initialize WebGL.");
    }

    return { canvas, gl };
}

function main() {
    const { gl, canvas } = initGl();

    const shaderProgram = initShaderProgram(gl, vertex_shader, fragment_shader);
    const buffers = initBuffers(gl);

    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            // TODO: how does getAttribLocation indicate failure?
            vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
            vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
        },
        uniformLocations: {
            // TODO: how does getUniformLocation indicate failure?
            projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
        }
    };

    let x = 0;
    let y = 0;

    clickAndDrag(canvas, (dx, dy) => {
        x += dx;
        y += dy;
    });

    function loop() {
        drawScene(gl, programInfo, buffers, {left: -2.0, right: 2.0, bottom: -2.0, top: 2.0});
        requestAnimationFrame(loop);
    }
    loop();
}

main();