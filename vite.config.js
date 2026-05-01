import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svelte()],
  server: {
    allowedHosts: [
      'localhost', '6ba9-2804-29b8-5194-f3ce-592a-c567-37fd-79ce.ngrok-free.app'
    ]
  }
});
