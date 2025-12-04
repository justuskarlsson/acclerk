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

export const WithPDF: Story = {
  args: {
    pdfUrl: "https://www.aeee.in/wp-content/uploads/2020/08/Sample-pdf.pdf",
  },
}
