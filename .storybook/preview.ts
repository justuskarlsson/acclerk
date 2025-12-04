import type { Preview } from "@storybook/nextjs-vite"
import { initialize, mswLoader } from "msw-storybook-addon"
import "../app/globals.css"

// Initialize MSW - wait until ready before rendering stories
initialize({
  onUnhandledRequest: "bypass",
  waitUntilReady: true,
})

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    nextjs: {
      appDirectory: true,
    },
  },
  loaders: [mswLoader],
}

export default preview
