async function initGpu() {
    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector("#glcanvas");
    const ctx = canvas.getContext("webgpu");

    if (!ctx) {
        throw new Error("Failed to get webgpu context from canvas");
    }

    /** @type {import("./webgpu_types.d.ts").GPU} */
    const gpu = navigator.gpu;

    if (!gpu) {
        throw new Error("Failed to access GPU");
    }

    const adapter = await gpu.requestAdapter();

    if (!adapter) {
        throw new Error("Failed to receive GPU adapter");
    }

    const device = await adapter.requestDevice();

    if (!device) {
        throw new Error("Failed to receive GPU device");
    }

    const queue = device.queue;

    const canvasConfig = {
        device: device,
        format: gpu.getPreferredCanvasFormat(),
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
        alphaMode: 'opaque'
    };

    ctx.configure(canvasConfig);

    const depthTextureDesc = {
        size: [canvas.width, canvas.height, 1],
        dimension: '2d',
        format: 'depth24plus-stencil8',
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
    };

    const depthTexture = device.createTexture(depthTextureDesc);
    const depthTextureView = depthTexture.createView();

    const colorTexture = ctx.getCurrentTexture();
    const colorTextureView = colorTexture.createView();

    return { canvas, ctx, gpu, adapter, device, queue, depthTexture, colorTexture, depthTextureView, colorTextureView };
}

function setupBuffers({device}) {
    const positions = new Float32Array([
         1.0, -1.0, 0.0, 
        -1.0, -1.0, 0.0, 
         0.0,  1.0, 0.0,
    ]);
    const colors = new Float32Array([
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0,
    ]);
    const indices = new Uint16Array([0, 1, 2]);

    const createBuffer = (arr, usage) => {
        let desc = {
            // 📏 Align to 4 bytes (thanks @chrimsonite)
            size: (arr.byteLength + 3) & ~3, // there's got to be a better way to do this
            usage,
            mappedAtCreation: true
        };
        let buffer = device.createBuffer(desc);
    
        const writeArray =
            arr instanceof Uint16Array
                ? new Uint16Array(buffer.getMappedRange())
                : new Float32Array(buffer.getMappedRange());
        writeArray.set(arr);
        buffer.unmap(); // unmap writes the bytes back.
        return buffer;
    };

    const uniformData = new Float32Array([
        // identity matrix
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0,
        // primary color
        0.9, 0.1, 0.3, 1.0,
        // accent color
        0.8, 0.2, 0.8, 1.0,
    ]);
      
    const uniformBuffer = createBuffer(uniformData, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    const positionBuffer = createBuffer(positions, GPUBufferUsage.VERTEX);
    const colorBuffer = createBuffer(colors, GPUBufferUsage.VERTEX);
    const indexBuffer = createBuffer(indices, GPUBufferUsage.INDEX);
    return { positionBuffer, colorBuffer, indexBuffer, uniformBuffer };
}

function setupShaders({device}) {
    const vertexSource = `
        struct UBO {
            modelViewProj: mat4x4<f32>,
            primaryColor: vec4<f32>,
            accentColor: vec4<f32>
        };
        
        @group(0) @binding(0)
        var<uniform> uniforms: UBO;

        struct VSOut {
            @builtin(position) nds_position: vec4<f32>,
            @location(0) color: vec3<f32>,
        };
        
        @vertex
        fn main(@location(0) in_pos: vec3<f32>,
                @location(1) in_color: vec3<f32>) -> VSOut {
            var vs_out: VSOut;
            //vs_out.nds_position = vec4<f32>(in_pos, 1.0);
            vs_out.nds_position = uniforms.modelViewProj * vec4<f32>(in_pos, 1.0);
            vs_out.color = in_color;
            return vs_out;
        }`;
    const fragmentSource = `
        @fragment
        fn main(@location(0) in_color: vec3<f32>) -> @location(0) vec4<f32> {
            return vec4<f32>(in_color, 1.0);
        }`;
    
    const vertModule = device.createShaderModule({code : vertexSource});
    const fragModule = device.createShaderModule({code : fragmentSource});

    return {vertModule, fragModule};
}

function setupPipeline({device, gpu, vertModule, fragModule, uniformBuffer}) {
    const positionAttribDesc = {
        shaderLocation: 0, // [[location(0)]]
        offset: 0,
        format: 'float32x3'
    };
    const colorAttribDesc = {
        shaderLocation: 1, // [[location(1)]]
        offset: 0,
        format: 'float32x3'
    };
    const positionBufferDesc = {
        attributes: [positionAttribDesc],
        arrayStride: 4 * 3, // sizeof(float) * 3
        stepMode: 'vertex'
    };
    const colorBufferDesc = {
        attributes: [colorAttribDesc],
        arrayStride: 4 * 3, // sizeof(float) * 3
        stepMode: 'vertex'
    };

    const depthStencil = {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus-stencil8'
    };

    const uniformBindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {}
            }
        ]
    });

    const uniformBindGroup = device.createBindGroup({
        layout: uniformBindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniformBuffer
                }
            }
        ]
    });
    
    
    const pipelineLayoutDesc = { bindGroupLayouts: [ uniformBindGroupLayout ] };
    const layout = device.createPipelineLayout(pipelineLayoutDesc);

    const vertex = {
        module: vertModule,
        entryPoint: 'main',
        buffers: [positionBufferDesc, colorBufferDesc]
    };

    const colorState = {
        format: gpu.getPreferredCanvasFormat()
    };

    const fragment = {
        module: fragModule,
        entryPoint: 'main',
        targets: [colorState]
    };

    const primitive = {
        frontFace: 'cw',
        cullMode: 'none',
        topology: 'triangle-list'
    };

    const pipelineDesc = {
        layout,
        vertex,
        fragment,
        primitive,
        depthStencil
    };

    const pipeline = device.createRenderPipeline(pipelineDesc);
    return {layout, pipeline, uniformBindGroup};
}

function encodeCommands({device, pipeline, canvas, colorTextureView, depthTextureView, uniformBindGroup, positionBuffer, colorBuffer, indexBuffer, queue}) {
    let colorAttachment = {
        view: colorTextureView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store'
    };

    const depthAttachment = {
        view: depthTextureView,
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
        stencilClearValue: 0,
        stencilLoadOp: 'clear',
        stencilStoreOp: 'store'
    };

    const renderPassDesc = {
        colorAttachments: [colorAttachment],
        depthStencilAttachment: depthAttachment
    };

    const commandEncoder = device.createCommandEncoder();

    // 🖌️ Encode drawing commands
    const passEncoder = commandEncoder.beginRenderPass(renderPassDesc);
    passEncoder.setPipeline(pipeline);
    passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);
    passEncoder.setScissorRect(0, 0, canvas.width, canvas.height);
    passEncoder.setVertexBuffer(0, positionBuffer);
    passEncoder.setVertexBuffer(1, colorBuffer);
    passEncoder.setIndexBuffer(indexBuffer, 'uint16');
    passEncoder.setBindGroup(0, uniformBindGroup);
    passEncoder.drawIndexed(3);
    passEncoder.end();

    queue.submit([commandEncoder.finish()]);
}


function tick({uniformBuffer}){
    globals.device.queue.writeBuffer(globals.uniformBuffer, 8, new Float32Array([0.5]))
}

function render(globals) {
    globals.colorTexture = globals.ctx.getCurrentTexture();
    globals.colorTextureView = globals.colorTexture.createView();

    encodeCommands(globals);
    requestAnimationFrame(function(){ render(globals)});
}

async function main() {
    let globals = {};
    globals = {...globals, ...await initGpu()};
    globals = {...globals, ...setupBuffers(globals)};
    globals = {...globals, ...setupShaders(globals)};
    globals = {...globals, ...setupPipeline(globals)};
    render(globals);
    window.globals = globals;
    console.log(globals);
}

main();