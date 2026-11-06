import { defineConfig } from 'vite';

// GitHub Pages de projeto: https://renatinkkjk.github.io/nitro-horizon/
// Se um dia virar página de usuário (renatinkkjk.github.io), troque para '/'.
export default defineConfig({
  base: '/nitro-horizon/',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
