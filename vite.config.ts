import { defineConfig } from 'vite'

// base: './' makes all asset URLs in the built index.html relative
// (./assets/...) instead of absolute (/assets/...). YouTube Playables serves
// the game from a nested sandbox path, so absolute paths would 404 — relative
// paths are required for the zipped build to load.
export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 0, // keep the font a real file so paths stay predictable
  },
})
