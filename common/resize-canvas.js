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
  if (gl) {gl.viewport(0, 0, pixelsAcross, pixelsDown)}
}

function legacy(canvas, gl){
    resizeCanvas(canvas, gl);
    window.addEventListener('resize', () => {
        resizeCanvas(canvas, gl);
    });
}


function resizeCanvasToDisplaySize(canvas, displayWidth, displayHeight) {

  // Check if the canvas is not the same size.
  const needResize = canvas.width  !== displayWidth ||
                     canvas.height !== displayHeight;

  if (needResize) {
    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
  }

  return needResize;
}

function onResize(entries) {
  for (const entry of entries) {
    let width;
    let height;
    let dpr = window.devicePixelRatio;
    if (entry.devicePixelContentBoxSize) {
      // NOTE: Only this path gives the correct answer
      // The other 2 paths are an imperfect fallback
      // for browsers that don't provide anyway to do this
      width = entry.devicePixelContentBoxSize[0].inlineSize;
      height = entry.devicePixelContentBoxSize[0].blockSize;
      dpr = 1; // it's already in width and height
    } else if (entry.contentBoxSize) {
      if (entry.contentBoxSize[0]) {
        width = entry.contentBoxSize[0].inlineSize;
        height = entry.contentBoxSize[0].blockSize;
      } else {
        // legacy
        width = entry.contentBoxSize.inlineSize;
        height = entry.contentBoxSize.blockSize;
      }
    } else {
      // legacy
      width = entry.contentRect.width;
      height = entry.contentRect.height;
    }
    const displayWidth = Math.round(width * dpr);
    const displayHeight = Math.round(height * dpr);
    resizeCanvasToDisplaySize(entry.target, displayWidth, displayHeight);
  }
}



export default function (canvas) {
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(canvas, {box: 'content-box'});  
}