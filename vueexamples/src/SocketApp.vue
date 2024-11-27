<template>
  <div class="container">
    <h2>Webcam with OpenCV.js</h2>
    <video id="videoInput" autoplay playsinline></video>
  </div>
</template>

<script>
import cv from "@techstark/opencv-js"
import * as ort from 'onnxruntime-web';
import {io} from 'socket.io-client'
export default {
  data() {
    return {
      isProcessing: false,
      inputTensor: null,
      imageFeatures: null,
      socket: io("http://localhost:3000")
    };
  },
  async beforeCreate() {
        this.sess = await ort.InferenceSession.create('/onnxdinov2/vithead_extractor.onnx',{
        executionProviders:  ['webgpu', 'wasm', 'webgl'],
        })
    },
  mounted(){
    this.socket.on("connect", () => {
      console.log("Connected to server");
    });
    this.socket.on("response", (data) => {
      this.response = data.message;
    })
  },
  watch:{
      inputTensor:function(newVal){
          if(this.sess){
              this.runInference(newVal)
          }
      },
      imageFeatures:function(newVal){
        // console.log(newVal.cpuData)
        this.sendFloat32Array(newVal.cpuData)
      }
  },
  methods: {
    float32ArrayToBase64(float32Array) {
      const uint8Array = new Uint8Array(float32Array.buffer);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      return btoa(binaryString);
    },
    async runInference(newVal) {
        try {
            const tensor = newVal
            if (!tensor) return;
            const feeds = { input: tensor };
            this.sess.run(feeds).then((object) => {
                this.imageFeatures = object['output0']
            });
        } catch (error) {
            console.error('Error during inference:', error);
        }
      },
    async initWebcam() {
      const video = document.getElementById("videoInput");

      try {
        // Access the webcam
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;

        // Wait for the video to start playing
        video.addEventListener("loadeddata", () => {
          this.processWebcam(video);
        });
      } catch (err) {
        console.error("Error accessing the webcam:", err);
      }
    },
    sendFloat32Array(floatArray) {
      // console.log(floatArray)
      // const buffer = floatArray.buffer;
      // console.log(floatArray)
      this.socket.emit("float32array", JSON.stringify(floatArray));
    },
    // sendDataToBackend(cpuData) {
    //     try {
    //         // axios.get('http://192.168.14.34:5000/').then((obj)=>{console.log(obj)})
    //         axios.post('http://192.168.14.34:5000/receive_data', {
    //             cpudata: Array.from(cpuData)                
    //         },{
    //             headers: {
    //                 'Content-Type': 'application/json'
    //             }});
    //     } catch (error) {
    //         console.error('Error sending data to backend:', error);
    //     }
    //   },
    processWebcam(video) {
      const cap = new cv.VideoCapture(video);
      video.height = video.videoHeight;
      video.width = video.videoWidth;
      const src = new cv.Mat(video.videoHeight, video.videoWidth, cv.CV_8UC4);
      const resized = new cv.Mat(518, 518, cv.CV_8UC4);
      const rgb = new cv.Mat(518, 518, cv.CV_8UC3);
      const processFrame = () => {
        if (!this.isProcessing) return;

        // Capture a frame from the video
        cap.read(src);
        cv.resize(src, resized, new cv.Size(518, 518), 0, 0, cv.INTER_LINEAR);
        cv.cvtColor(resized, rgb, cv.COLOR_RGBA2RGB);
        this.inputTensor = this.preprocessImage(rgb);
        requestAnimationFrame(processFrame);
      };
      
      this.isProcessing = true;
      processFrame();

      // Cleanup on exit
      window.addEventListener("beforeunload", () => {
        this.isProcessing = false;
        src.delete();
        gray.delete();
      });
    },
    preprocessImage(mat) {
      const width = mat.cols;
      const height = mat.rows;
      const imgData = mat.data;
      const floatArray = new Float32Array(width * height * 3);
      for (let i = 0; i < width * height; i++) {
        floatArray[i * 3] = imgData[i * 3] / 255.0; // R
        floatArray[i * 3 + 1] = imgData[i * 3 + 1] / 255.0; // G
        floatArray[i * 3 + 2] = imgData[i * 3 + 2] / 255.0; // B
      }
      const nchwArray = new Float32Array(1 * 3 * 518 * 518);
      for (let c = 0; c < 3; c++) {
        for (let h = 0; h < height; h++) {
          for (let w = 0; w < width; w++) {
            nchwArray[c * height * width + h * width + w] =
              floatArray[h * width * 3 + w * 3 + c];
          }
        }
      }

      return new ort.Tensor("float32", nchwArray, [1, 3, 518, 518]);
    },
  },
  mounted() {
    this.initWebcam();
  },
};
</script>

<style scoped>
.container {
  text-align: center;
  margin-top: 50px;
}

video {
  max-width: 100%;
  max-height: 400px;
  border: 2px solid #ddd;
  border-radius: 8px;
}

canvas {
  max-width: 100%;
  max-height: 400px;
  margin-top: 20px;
  border: 2px solid #ddd;
  border-radius: 8px;
}
</style>
