import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config"

const preset = {
  ...minimal2023Preset,
  maskable: { ...minimal2023Preset.maskable, padding: 0 },
  apple: { ...minimal2023Preset.apple, padding: 0 },
}

export default defineConfig({
  preset,
  images: ["public/icon.svg"],
})