import { fileURLToPath, URL } from 'node:url'
import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import wasm from "vite-plugin-wasm";
// import topLevelAwait from "vite-plugin-top-level-await";
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    wasm(),
    vueJsx(),
    vueDevTools(),
    viteStaticCopy({
      targets: [
        {
          src: './node_modules/onnxruntime-web/dist/*.wasm',
          dest: './'
        },
      ],
    }),
  ],
  assetsInclude: ['onnxruntime-web/dist/*.wasm'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  
  server: {
    // host: "192.168.10.14",
    // port: 5173,
    cors: {
      origin: "http://localhost:5000",
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
      preflightContinue: true
    }
    
  },
})
