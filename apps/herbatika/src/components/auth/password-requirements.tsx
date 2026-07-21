import { Icon } from "@techsio/ui-kit/atoms/icon"
import { useTranslations } from "next-intl"
import { PASSWORD_REQUIREMENTS } from "@/lib/auth/auth-form-validators"

type PasswordRequirementsProps = {
  password: string
}

export const PasswordRequirements = ({
  password,
}: PasswordRequirementsProps) => {
  const tAuth = useTranslations("auth")
  const requirementLabels = {
    "has-number": tAuth("password_requirements.number"),
    "min-length": tAuth("password_requirements.min_length"),
  } as const
  const requirements = PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    label: requirementLabels[requirement.id],
    met: requirement.test(password),
  }))

  return (
    <div className="space-y-100">
      <p className="font-medium text-fg-secondary text-sm">
        {tAuth("password_requirements.title")}
      </p>
      <ul className="space-y-100">
        {requirements.map((requirement) => (
          <li
            className={`flex items-center gap-100 ${
              requirement.met ? "text-success" : "text-fg-secondary"
            }`}
            key={requirement.id}
          >
            <span className="inline-flex h-200 w-200 items-center justify-center">
              {requirement.met ? (
                <Icon icon="token-icon-check" size="sm" />
              ) : (
                <span className="text-icon-xs">•</span>
              )}
            </span>
            <span className="text-sm">{requirement.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
