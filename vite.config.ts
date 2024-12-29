import { defineConfig } from "vite";
import path from "path";
import assetsPlugin from './src/lib/vite-plugins/vite-plugin-assets'
import loadFonts from './src/lib/vite-plugins/vite-plugin-load-fonts'
import dsv from '@rollup/plugin-dsv'

export default defineConfig({
    resolve: {
        alias: {
            "$src": path.resolve(process.cwd(), "./src"),
            "$lib": path.resolve(process.cwd(), "./src/lib"),
            "$assets": path.resolve(process.cwd(), "./assets"),
        },
    },
    plugins: [assetsPlugin(), loadFonts(), dsv()],
    define: {
        'process.env': {
            I18N_KEY: 'ru'
        }
    }
});
