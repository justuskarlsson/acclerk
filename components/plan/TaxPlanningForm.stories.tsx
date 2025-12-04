import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { TaxPlanningForm } from "./TaxPlanningForm"

const meta: Meta<typeof TaxPlanningForm> = {
  title: "Components/TaxPlanningForm",
  component: TaxPlanningForm,
  parameters: {
    layout: "fullscreen",
  },
}

export default meta
type Story = StoryObj<typeof TaxPlanningForm>

export const Default: Story = {}

