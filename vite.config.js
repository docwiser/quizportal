import { fileURLToPath, URL } from "node:url";
import path from "path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
// https://vite.dev/config/
export default defineConfig({
plugins: [
vue(),
vueDevTools(),
],
resolve: {
alias: {
"@": fileURLToPath(new URL("./src", import.meta.url)),
"@components": path.resolve(__dirname, "src", "components"),
"@composables": path.resolve(__dirname, "src", "composables"),
"@router": path.resolve(__dirname, "src", "router"),

},
},
});
