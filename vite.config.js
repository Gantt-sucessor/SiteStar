import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // aceita tanto VITE_SUPABASE_* quanto SUPABASE_* (como foi cadastrado na Vercel)
  envPrefix: ['VITE_', 'SUPABASE_'],
});
