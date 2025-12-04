import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { PDFPreview } from "./PDFPreview"

const meta: Meta<typeof PDFPreview> = {
  title: "Components/PDFPreview",
  component: PDFPreview,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ height: "600px" }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof PDFPreview>

export const Empty: Story = {
  args: {
    pdfUrl: null,
  },
}
