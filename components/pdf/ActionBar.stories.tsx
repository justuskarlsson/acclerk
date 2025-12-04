import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ActionBar } from "./ActionBar"

const meta: Meta<typeof ActionBar> = {
  title: "Components/ActionBar",
  component: ActionBar,
  parameters: {
    layout: "fullscreen",
  },
}

export default meta
type Story = StoryObj<typeof ActionBar>

export const Default: Story = {}

