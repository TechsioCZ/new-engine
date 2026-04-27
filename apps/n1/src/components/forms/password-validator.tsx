import { Icon } from "@techsio/ui-kit/atoms/icon"
import { PASSWORD_REQUIREMENTS } from "@/lib/form-validators"

type PasswordValidatorProps = {
  password: string
  showRequirements?: boolean
  className?: string
}

export const PasswordValidator = ({
  password,
  showRequirements = true,
  className = "",
}: PasswordValidatorProps) => {
  const requirements = PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.test(password),
  }))

  const allMet = requirements.every((req) => req.met)
  const hasStarted = password.length > 0

  if (!(showRequirements && hasStarted)) {
    return null
  }

  return (
    <div className={`text-sm ${className}`}>
      <p className="mb-50 font-medium text-fg-secondary">Požadavky na heslo:</p>
      <ul className="flex flex-col gap-50">
        {requirements.map((req) => (
          <li
            className={`flex items-center gap-100 ${
              req.met ? "text-success" : "text-fg-secondary"
            }`}
            key={req.id}
          >
            <span
              aria-hidden="true"
              className={`flex h-4 w-4 items-center justify-center rounded-full border border-border-secondary text-[.75rem] ${
                req.met ? "bg-success" : "bg-surface"
              }`}
            >
              {req.met && (
                <Icon className="text-fg-reverse" icon="token-icon-check" />
              )}
            </span>
            <span className="text-2xs">{req.label}</span>
          </li>
        ))}
      </ul>

      {allMet && (
        <p className="mt-100 flex items-center gap-100 text-2xs text-success">
          <span className="font-medium">Heslo splňuje všechny požadavky</span>
        </p>
      )}
    </div>
  )
}
