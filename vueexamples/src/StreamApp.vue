<template>
  <div>
    <h2>Webcam Feed</h2>
    <video ref="video" autoplay playsinline muted></video>
  </div>
</template>

<script>
import * as ort from 'onnxruntime-web';

export default {
  data() {
    return {
      sess: null,
      sess_h1:null,
      stream: null,
      imgdata: null,
      out1: null,
    };
  },
  async beforeCreate() {
    this.sess = await ort.InferenceSession.create('/onnxdinov2/vithead_extractor.onnx',{
      executionProviders:  ['webgpu', 'wasm', 'webgl'],
    })
    // this.sess_h1 = await ort.InferenceSession.create('/onnxdinov2/dino02_extractor.onnx',{
    //   executionProviders:  ['webgpu', 'wasm', 'webgl'],
    // })
    this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  },
  methods: {
    async processFrames() {
      const video = this.$refs.video;
      const targetWidth = 518;
      const targetHeight = 518;
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = targetWidth;
      offscreenCanvas.height = targetHeight;
      const ctx = offscreenCanvas.getContext('2d');

      const captureFrame = async () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
          this.preprocess(imageData);
        }
        requestAnimationFrame(captureFrame);
      };

      requestAnimationFrame(captureFrame);
    },
    preprocess(imageData) {
      const { data, width, height } = imageData;

      // Convert the image data to a Float32Array
      const floatArray = new Float32Array(width * height * 3);
      for (let i = 0; i < width * height; i++) {
        floatArray[i * 3] = data[i * 4] / 255.0; // R
        floatArray[i * 3 + 1] = data[i * 4 + 1] / 255.0; // G
        floatArray[i * 3 + 2] = data[i * 4 + 2] / 255.0; // B
      }

      // Create an ONNX tensor with shape [1, 3, 518, 518]
      this.imgdata = new ort.Tensor('float32', floatArray, [1, 3, height, width]);
    },
    async postprocess(res){
      const feeds = { input: res['output0']}
      // this.out1 = await this.sess_h1.run(feeds);
    }
  },
  watch:{
    sess:function(newVal){
    },
    sess_h1:function(newVal){
    },
    stream:function(newVal){
      this.$refs.video.srcObject = newVal;
      this.$refs.video.onloadedmetadata = () => {
        this.processFrames()
      }
    },
    imgdata:function(newVal){
      if (this.imgdata && this.sess) {
        const feeds = { input: this.imgdata };
        const results = this.sess.run(feeds);
        console.log("imgdata:",Date.now())
        results.then((object)=> { 
          console.log("process:",Date.now()),
          this.postprocess(object)
        })
      }
    },
    out1: function(newVal){
      console.log("out1:",Date.now())
    }
  }
};
</script>
