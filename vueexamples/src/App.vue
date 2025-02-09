<template>
  <div ref="containers" class="container">
    <h2>Upload an Image</h2>
    <input type="file" @change="handleFileUpload" accept="image/*" />
    <div  v-if="imageSrc" class="image-preview">
      <img :src="imageSrc" alt="Uploaded Image" />
      <canvas ref="output"></canvas>
    </div>
    <div>Features Extractor</div>
  </div>
</template>

<script>
import * as ort from 'onnxruntime-web/webgpu';
import axios from 'axios';
export default {
  data() {  
    return {
      sess: null,
      imageSrc: null,
      imageFt: null,
    };
  },
  async beforeCreate() {
      console.log(ort.env.wasm)
      this.sess = await ort.InferenceSession.create('/onnxdinov2/test.onnx',{
        executionProviders:  [ 'wasm'],
        freeDimensionOverrides: {
          batch: 1,
          height: 518,
          width: 518
        }
      })
      
  },
  watch:{
      sess:function(newVal){
        console.log(`ONNX Runtime Web version: ${ort.version}`);
      },
      imageSrc:function(newVal){
          if(this.sess){
              this.runInference()
          }
      },
      imageFt:function(newVal){
        // this.sendDataToBackend(newVal.cpuData)
        this.postprocessImage(newVal.data)
      }
  },
  methods: {
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (file && file.type.startsWith('image/')) {
        this.loadImage(file);
      } else {
        alert('Please select a valid image file');
      }
    },
    loadImage(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imageSrc = e.target.result; // Store the base64 data URL
      };
      reader.readAsDataURL(file);
    },
    async postprocessImage(data){
      const canvas = this.$refs.output
      canvas.height = 518
      canvas.width = 518
      const floatArray =  data
      
      const uint8Array = new Uint8Array(data);
      const rgbaArray = new Uint8ClampedArray(518 * 518 * 4);
        for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
          rgbaArray[j] = data[i]*255.0;     // Red
          rgbaArray[j + 1] = data[i + 1]*255.0; // Green
          rgbaArray[j + 2] = data[i + 2]*255.0; // Blue
          rgbaArray[j + 3] = 255;           // Alpha (fully opaque)
      }
      const imageData = new ImageData(rgbaArray, 518, 518);
      const ctx = canvas.getContext('2d');
      ctx.putImageData(imageData, 0, 0);


    },
    async preprocessImage() {
      if (!this.imageSrc) return null;

      // Load the image into an HTML Image element
      const img = new Image();
      img.src = this.imageSrc;

      // Wait for the image to load
      await new Promise((resolve) => {
          img.onload = resolve;
      });

      const targetWidth = 518;
      const targetHeight =518;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');  
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      // console.log(imageData)

      const { data, width, height } = imageData;

      // Convert image data to Float32Array
      const floatArray = new Float32Array(width * height * 3);
      for (let i = 0; i < width * height; i++) {
        // Extract raw sRGB values (in range 0–255)
        floatArray[i * 3] = data[i * 4]/255.0;     // sRGB Red
        floatArray[i * 3 + 1] = data[i * 4 + 1]/255.0 // sRGB Green
        floatArray[i * 3 + 2] = data[i * 4 + 2]/255.0; // sRGB Blue

        // Apply gamma correction (sRGB to linear RGB)
        // floatArray[i * 3] = sr <= 10.31475 ? sr / 12.92 : Math.pow((sr + 14.025) / 269.025, 2.4); // Linear R
        // floatArray[i * 3 + 1] = sg <= 10.31475 ? sg / 12.92 : Math.pow((sg + 14.025) / 269.025, 2.4); // Linear G
        // floatArray[i * 3 + 2] = sb <= 10.31475 ? sb / 12.92 : Math.pow((sb + 14.025) / 269.025, 2.4); // Linear B
      }

      // Create an ONNX tensor with shape [1, 3, 518, 518]
      
      const tensor = new ort.Tensor('float32', floatArray, [1, 3, width, height]);
      // console.log(tensor)
      return tensor;
    },
    async runInference() {
      try {
          // Preprocess the image to a tensor
          const tensor = await this.preprocessImage();
          if (!tensor) return;

          // Prepare the input feed for the ONNX model
          const feeds = { input : tensor };

          // Run the ONNX model
          this.sess.run(feeds,{ logSeverityLevel: 0 }).then((object) => {
              this.imageFt = object['output0']
          });
      } catch (error) {
          console.error('Error during inference:', error);
      }
    },
    
    sendDataToBackend(cpuData) {
      try {
          // axios.get('http://192.168.14.34:5000/').then((obj)=>{console.log(obj)})
          // console.log(cpuData)
          axios.post('http://192.168.10.14:5000/receive_data', {
              cpudata: Array.from(cpuData)                
          },{
              headers: {
                  'Content-Type': 'application/json'
              }});
      } catch (error) {
          console.error('Error sending data to backend:', error);
      }
    },
  },
};
</script>

<style scoped>
.container {
  text-align: center;
  margin-top: 50px;
}

input[type="file"] {
  margin-bottom: 20px;
}

.image-preview img {
  max-width: 100%;
  max-height: 400px;
  border: 2px solid #ddd;
  border-radius: 8px;
}
</style>