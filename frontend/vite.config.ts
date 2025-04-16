import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: "../backend/static",
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: id => {
                    if (id.includes("@fluentui/react-icons")) {
                        return "fluentui-icons";
                    } else if (id.includes("@fluentui/react")) {
                        return "fluentui-react";
                    } else if (id.includes("node_modules")) {
                        return "vendor";
                    }
                }
            }
        },
        target: "esnext"
    },
    server: {
        proxy: {
            "/content/": "http://127.0.0.1:50515",
            "/auth_setup": "http://127.0.0.1:50515",
            "/.auth/me": "http://127.0.0.1:50515",
            "/chat": "http://127.0.0.1:50515",
            "/speech": "http://127.0.0.1:50515",
            "/config": "http://127.0.0.1:50515",
            "/upload": "http://127.0.0.1:50515",
            "/delete_uploaded": "http://127.0.0.1:50515",
            "/list_uploaded": "http://127.0.0.1:50515"
        }
    }
});
