import { validatePassword } from "@/lib/auth/validation"

const MET_REQUIREMENT_CLASS_NAME = "text-success"

interface PasswordRequirementsProps {
  password: string
}

export const PasswordRequirements = ({
  password,
}: PasswordRequirementsProps) => {
  const { requirements } = validatePassword(password)

  return (
    <div className="space-y-1 pl-100 text-fg-primary text-xs">
      <p className="font-semibold">Požadavky na heslo:</p>
      <ul className="list-inside list-disc space-y-0.5 text-fg-secondary">
        <li className={requirements.length ? MET_REQUIREMENT_CLASS_NAME : ""}>
          Alespoň 8 znaků
        </li>
        <li
          className={requirements.uppercase ? MET_REQUIREMENT_CLASS_NAME : ""}
        >
          Jedno velké písmeno
        </li>
        <li
          className={requirements.lowercase ? MET_REQUIREMENT_CLASS_NAME : ""}
        >
          Jedno malé písmeno
        </li>
        <li className={requirements.number ? MET_REQUIREMENT_CLASS_NAME : ""}>
          Jedno číslo
        </li>
      </ul>
    </div>
  )
}
