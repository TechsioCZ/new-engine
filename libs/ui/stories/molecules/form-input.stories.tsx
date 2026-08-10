import type { Meta, StoryObj } from "@storybook/react"
import { useState } from "react"

import { VariantContainer, VariantGroup } from "../../.storybook/decorator"
import { Button } from "../../src/atoms/button"
import { FormInput } from "../../src/molecules/form-input"

const meta: Meta<typeof FormInput> = {
  argTypes: {
    disabled: {
      control: "boolean",
      description: "Disable the input",
      table: { defaultValue: { summary: "false" } },
    },
    helpText: {
      control: "text",
      description: "Helper text or validation message below input",
    },
    label: {
      control: "text",
      description: "Input label",
    },
    placeholder: {
      control: "text",
      description: "Placeholder text",
    },
    readOnly: {
      control: "boolean",
      description: "Make input read-only",
      table: { defaultValue: { summary: "false" } },
    },
    required: {
      control: "boolean",
      description: "Mark as required field",
      table: { defaultValue: { summary: "false" } },
    },
    showHelpTextIcon: {
      control: "boolean",
      description: "Show icon with help text",
      table: { defaultValue: { summary: "false" } },
    },
    size: {
      control: "select",
      description: "Size of input and label",
      options: ["sm", "md", "lg"],
      table: { defaultValue: { summary: "md" } },
    },
    type: {
      control: "select",
      description: "HTML input type",
      options: ["text", "email", "password", "tel", "number", "url"],
      table: { defaultValue: { summary: "text" } },
    },
    validateStatus: {
      control: "select",
      description: "Validation state",
      options: ["default", "error", "success", "warning"],
      table: { defaultValue: { summary: "default" } },
    },
  },
  args: {
    disabled: false,
    helpText: "Will be visible on your profile",
    label: "Username",
    placeholder: "Enter username",
    readOnly: false,
    required: false,
    showHelpTextIcon: false,
    size: "md",
    type: "text",
    validateStatus: "default",
  },
  component: FormInput,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "Molecules/FormInput",
}

export default meta
type Story = StoryObj<typeof FormInput>

export const Playground: Story = {
  args: {
    label: "Playground Input",
  },
}

// All variants and combinations
export const AllVariants: Story = {
  render: () => (
    <VariantContainer>
      <VariantGroup title="Requirement States">
        <div className="w-3xs">
          <FormInput id="" label="Default" placeholder="Enter value" />
        </div>
        <div className="w-3xs">
          <FormInput
            id=""
            label="Required"
            placeholder="Enter value"
            required
          />
        </div>
        <div className="w-3xs">
          <FormInput id="" label="Optional" placeholder="Enter value" />
        </div>
      </VariantGroup>

      <VariantGroup title="Validation States">
        <div className="w-3xs">
          <FormInput
            id="default-input"
            label="Default state"
            placeholder="Enter value"
            validateStatus="default"
            helpText="This is default help text"
          />
        </div>
        <div className="w-3xs">
          <FormInput
            id="success-input"
            label="Success state"
            placeholder="johndoe"
            validateStatus="success"
            helpText="Username is available"
          />
        </div>
        <div className="w-3xs">
          <FormInput
            id="error-input"
            label="Error state"
            placeholder="Enter email"
            validateStatus="error"
            helpText="Invalid email format"
          />
        </div>
        <div className="w-3xs">
          <FormInput
            id="warning-input"
            label="Warning state"
            placeholder="Enter password"
            validateStatus="warning"
            helpText="Password is weak"
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Supporting Text">
        <div className="w-3xs">
          <FormInput
            id="success-input"
            label="With helper text"
            placeholder="Enter value"
            helpText="This is help text below input"
          />
        </div>
        <div className="w-3xs">
          <FormInput
            id="error-input"
            label="With error message"
            placeholder="Enter value"
            helpText="This is error text!"
            validateStatus="error"
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Sizes">
        <div className="w-3xs">
          <FormInput
            id="success-input"
            label="Small input"
            placeholder="Enter value"
            helpText="This is error text below input"
            validateStatus="error"
            size="sm"
          />
        </div>
        <div className="w-3xs">
          <FormInput
            id="success-input"
            label="Default input"
            placeholder="Enter value"
            helpText="This is error text below input"
            validateStatus="error"
            size="md"
          />
        </div>
        <div className="w-3xs">
          <FormInput
            id="success-input"
            label="Large input"
            placeholder="Enter value"
            helpText="This is error text below input"
            validateStatus="error"
            size="lg"
          />
        </div>
      </VariantGroup>

      <VariantGroup title="Special States">
        <div className="w-3xs">
          <FormInput
            id="success-input"
            label="Disabled input"
            placeholder="Cannot edit"
            disabled
          />
        </div>
        <div className="w-3xs">
          <FormInput
            id="success-input"
            label="Read-only input"
            placeholder="Read only"
            readOnly
            value="Fixed value"
          />
        </div>
        <div className="w-3xs">
          <FormInput
            id="success-input"
            label="With default value"
            defaultValue="Prefilled value"
          />
        </div>
      </VariantGroup>
    </VariantContainer>
  ),
}

// Validation States - Dedicated story showing all 4 validation states
export const ValidationStates: Story = {
  render: () => (
    <div className="flex w-3xs flex-col gap-200">
      <FormInput
        id="default-validation"
        label="Default State"
        placeholder="Enter username"
        validateStatus="default"
        helpText="This is default help text"
      />
      <FormInput
        id="error-validation"
        label="Error State"
        placeholder="Enter username"
        validateStatus="error"
        helpText="Username is already taken"
      />
      <FormInput
        id="success-validation"
        label="Success State"
        placeholder="Enter username"
        validateStatus="success"
        helpText="Username is available"
      />
      <FormInput
        id="warning-validation"
        label="Warning State"
        placeholder="Enter username"
        validateStatus="warning"
        helpText="Username contains special characters"
      />
    </div>
  ),
}

// Sizes - Dedicated story showing all size variants
export const Sizes: Story = {
  render: () => (
    <div className="flex w-3xs flex-col gap-200">
      <FormInput
        id="small-size"
        label="Small Size"
        placeholder="Enter value"
        size="sm"
        helpText="Small input variant"
      />
      <FormInput
        id="medium-size"
        label="Medium Size (Default)"
        placeholder="Enter value"
        size="md"
        helpText="Medium input variant"
      />
      <FormInput
        id="large-size"
        label="Large Size"
        placeholder="Enter value"
        size="lg"
        helpText="Large input variant"
      />
    </div>
  ),
}

// Interactive validation example
const getEmailValidateStatus = (
  showError: boolean,
  showSuccess: boolean,
): "default" | "error" | "success" => {
  if (showError) {
    return "error"
  }
  if (showSuccess) {
    return "success"
  }
  return "default"
}

const getEmailStatusLabel = (isTouched: boolean, valid: boolean) => {
  if (!isTouched) {
    return "Untouched"
  }
  return valid ? "Valid email" : "Invalid email"
}

const EmailValidationExample = () => {
  const [email, setEmail] = useState("")
  const [touched, setTouched] = useState(false)

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email.trim())
  const isEmailFilled = email.length > 0
  const showError = touched && isEmailFilled && !isValid
  const showSuccess = touched && isEmailFilled && isValid

  // Determine validation status
  const validateStatus = getEmailValidateStatus(showError, showSuccess)

  return (
    <div className="w-xs">
      <h3 className="mb-200 text-lg font-medium">Email Validation</h3>
      <FormInput
        id="success-input"
        label="Email"
        placeholder="your@email.com"
        required
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
        }}
        onBlur={() => {
          setTouched(true)
        }}
        validateStatus={validateStatus}
        helpText={
          showError
            ? "Please enter a valid email"
            : "Used for login and notifications"
        }
      />
      <div className="mt-300 text-sm">
        <p>Status: {getEmailStatusLabel(touched, isValid)}</p>
      </div>
    </div>
  )
}

export const InteractiveValidation: Story = {
  render: () => <EmailValidationExample />,
}

const PasswordCheck = ({
  passed,
  label,
}: {
  passed: boolean
  label: string
}) => (
  <li
    className={`flex items-center gap-100 ${passed ? "text-success" : "text-fg-secondary"}`}
  >
    <span
      className={
        passed ? "token-icon-check-circle" : "token-icon-circle-outline"
      }
    />
    {label}
  </li>
)

const RegistrationFormExample = () => {
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    password: "",
    phone: "",
    username: "",
  })

  const [touched, setTouched] = useState({
    email: false,
    fullName: false,
    password: false,
    phone: false,
    username: false,
  })

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const touchField = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  // Validation rules
  const validations = {
    email: {
      error: "Please enter a valid email address",
      isValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(form.email.trim()),
      success: "Email is correct",
    },
    fullName: {
      error: "Name must be at least 2 characters",
      isValid: form.fullName.length >= 2,
      success: "Looks good!",
    },
    password: {
      checks: {
        length: form.password.length >= 8,
        number: /\d/u.test(form.password),
        uppercase: /[A-Z]/u.test(form.password),
      },
      error: "Weak password",
      get isValid() {
        return this.checks.length && this.checks.uppercase && this.checks.number
      },
      success: "Strong password!",
    },
    phone: {
      error: "Please enter a valid phone number",
      isValid: form.phone === "" || /^\+?[\d\s()-]{7,}$/u.test(form.phone),
      success: "Valid phone number",
    },
    username: {
      error: "Min 3 characters, only letters, numbers, underscore",
      isValid: /^[a-zA-Z0-9_]{3,}$/u.test(form.username),
      success: "Username is available",
    },
  }

  const getStatus = (field: keyof typeof validations) => {
    if (!touched[field] || !form[field]) {
      return "default"
    }
    return validations[field].isValid ? "success" : "error"
  }

  const getHelpText = (
    field: keyof typeof validations,
    defaultText: string,
  ) => {
    if (!touched[field] || !form[field]) {
      return defaultText
    }
    return validations[field].isValid
      ? validations[field].success
      : validations[field].error
  }

  return (
    <div className="w-md rounded-md border border-border-primary p-300 shadow-sm">
      <h2 className="mb-300 text-xl font-semibold">Account Registration</h2>

      <div className="space-y-200">
        <FormInput
          id="reg-fullname"
          label="Full name"
          placeholder="John Doe"
          required
          value={form.fullName}
          onChange={(e) => {
            updateField("fullName", e.target.value)
          }}
          onBlur={() => {
            touchField("fullName")
          }}
          validateStatus={getStatus("fullName")}
          helpText={getHelpText("fullName", "Enter your full name")}
        />

        <FormInput
          id="reg-email"
          label="Email"
          type="email"
          placeholder="john@example.com"
          required
          value={form.email}
          onChange={(e) => {
            updateField("email", e.target.value)
          }}
          onBlur={() => {
            touchField("email")
          }}
          validateStatus={getStatus("email")}
          helpText={getHelpText(
            "email",
            "We'll send confirmation to this email",
          )}
        />

        <FormInput
          id="reg-username"
          label="Username"
          placeholder="johndoe"
          required
          value={form.username}
          onChange={(e) => {
            updateField("username", e.target.value)
          }}
          onBlur={() => {
            touchField("username")
          }}
          validateStatus={getStatus("username")}
          helpText={getHelpText("username", "Visible to other users")}
        />

        <div>
          <FormInput
            id="reg-password"
            label="Password"
            type="password"
            placeholder="••••••••"
            required
            value={form.password}
            onChange={(e) => {
              updateField("password", e.target.value)
            }}
            onBlur={() => {
              touchField("password")
            }}
            validateStatus={getStatus("password")}
            helpText={getHelpText("password", "")}
          />
          <ul className="mt-150 space-y-100 text-sm">
            <PasswordCheck
              passed={validations.password.checks.length}
              label="At least 8 characters"
            />
            <PasswordCheck
              passed={validations.password.checks.uppercase}
              label="One uppercase letter"
            />
            <PasswordCheck
              passed={validations.password.checks.number}
              label="One number"
            />
          </ul>
        </div>

        <FormInput
          id="reg-phone"
          label="Phone number"
          type="tel"
          placeholder="+1 (XXX) XXX-XXXX"
          value={form.phone}
          onChange={(e) => {
            updateField("phone", e.target.value)
          }}
          onBlur={() => {
            touchField("phone")
          }}
          validateStatus={getStatus("phone")}
          helpText={getHelpText("phone", "Optional")}
        />
      </div>

      <div className="mt-300">
        <Button
          type="submit"
          variant="primary"
          disabled={
            !validations.fullName.isValid ||
            !validations.email.isValid ||
            !validations.username.isValid ||
            !validations.password.isValid
          }
        >
          Create Account
        </Button>
      </div>
    </div>
  )
}

// Form usage example
export const RegistrationForm: Story = {
  render: () => <RegistrationFormExample />,
}
