/** 
 * @param {WebGLRenderingContext} gl
 */
function initPositionBuffer(gl) {
    // Create a buffer for the square's positions.
    const positionBuffer = gl.createBuffer();

    if (positionBuffer == null) {
        throw new Error("failed to create position buffer");
    }
  
    // Select the positionBuffer as the one to apply buffer operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
    // Now create an array of positions for the square.
    const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];
  
    // Now pass the list of positions into WebGL to build the shape. We do this by creating 
    // a Float32Array from the JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    return positionBuffer;
  }

/** 
 * @param {WebGLRenderingContext} gl
 */
function initColorBuffer(gl) {
    const colors = [
      1.0,
      1.0,
      1.0,
      1.0, // white
      1.0,
      0.0,
      0.0,
      1.0, // red
      0.0,
      1.0,
      0.0,
      1.0, // green
      0.0,
      0.0,
      1.0,
      1.0, // blue
    ];
  
    const colorBuffer = gl.createBuffer();
    if (colorBuffer == null) {
        throw new Error("failed to create color buffer");
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  
    return colorBuffer;
}
  
function initBuffers(gl) {
    return { position: initPositionBuffer(gl), colors: initColorBuffer(gl) };
}

 export { initBuffers }