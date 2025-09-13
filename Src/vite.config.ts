import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Recreate __dirname in ESM
const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
	plugins: [react()],
	server: {
		port: 8080, // Changed from default 5173
		strictPort: true, // Fail if 8080 is taken instead of incrementing
		open: true, // Automatically open browser
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@shared': path.resolve(__dirname, './src/shared'),
		},
	},
});
