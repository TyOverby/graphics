// From https://stackoverflow.com/questions/47696956/display-pixel-perfect-canvas-on-all-devices
const px = v => `${v}px`;

function resizeCanvas(canvas, gl) {
  // how many devicePixels per pixel in the canvas we want
  // you can set this to 1 if you always want 1 device pixel to 1 canvas pixel
  const pixelSize = Math.max(1, devicePixelRatio) | 0;  
  
  const rect = canvas.parentElement.getBoundingClientRect();
  const deviceWidth  = rect.width * devicePixelRatio | 0;
  const deviceHeight = rect.height * devicePixelRatio | 0;
  const pixelsAcross = deviceWidth / pixelSize | 0;
  const pixelsDown   = deviceHeight / pixelSize | 0;
  const devicePixelsAcross = pixelsAcross * pixelSize;
  const devicePixelsDown   = pixelsDown   * pixelSize;
  canvas.style.width = px(devicePixelsAcross / devicePixelRatio);
  canvas.style.height = px(devicePixelsDown / devicePixelRatio);
  canvas.width = pixelsAcross;
  canvas.height = pixelsDown;
  gl.viewport(0, 0, pixelsAcross, pixelsDown);
}

export default function (canvas, gl){
    resizeCanvas(canvas, gl);
    window.addEventListener('resize', () => {
        resizeCanvas(canvas, gl);
    });
}