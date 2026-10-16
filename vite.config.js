
import { defineConfig, loadEnv, searchForWorkspaceRoot } from 'vite'
import vue from '@vitejs/plugin-vue'
import { prettifyError } from 'zod'

import path from 'path'

import { ViteAppConfig } from './src/schema'
import { redText } from './src/composables/nodeUtils.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  // check configuration
  const parsedEnv = ViteAppConfig.safeParse(env)
  if (!parsedEnv.success) {
    const prettyError = prettifyError(parsedEnv.error);
    console.error(`\nErrors are found in .env.${mode} file:\n\n`, redText(prettyError), '\n')
    process.exit(1)
  }

  return {
    base: env.VITE_APP_APP_ROOT_URL,
    plugins: [vue()],
    define: {
      __APP_ROOT_DTS_COLLECTION_ID__: JSON.stringify(env.VITE_APP_ROOT_DTS_COLLECTION_ID)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        confs: path.resolve(__dirname, env.VITE_APP_CUSTOM_SETTINGS_PATH),
        vue: 'vue/dist/vue.esm-bundler.js'
      },
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
    },
    optimizeDeps: {
      include: ['vue']
    },
    server: {
      fs: {
        // The custom settings live outside the project: let the dev server
        // serve the files their stylesheets point to (fonts)
        allow: [
          searchForWorkspaceRoot(process.cwd()),
          path.resolve(__dirname, env.VITE_APP_CUSTOM_SETTINGS_PATH)
        ]
      }
    }
  }
})
