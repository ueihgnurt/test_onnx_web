import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
// import * as tflite from '@tensorflow/tfjs-tflite';
// import * as ort from 'onnxruntime-web';

const app = createApp(App)
// app.config.globalProperties.$ort = ort;
app.mount('#app')