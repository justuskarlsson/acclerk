import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { UploadView } from "./UploadView"

const meta: Meta<typeof UploadView> = {
  title: "Components/UploadView",
  component: UploadView,
  parameters: {
    layout: "fullscreen",
  },
}

export default meta
type Story = StoryObj<typeof UploadView>

export const Default: Story = {}

