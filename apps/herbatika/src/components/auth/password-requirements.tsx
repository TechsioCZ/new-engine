import { Icon } from "@techsio/ui-kit/atoms/icon";
import { PASSWORD_REQUIREMENTS } from "@/lib/auth/auth-form-validators";

type PasswordRequirementsProps = {
  password: string;
};

export const PasswordRequirements = ({
  password,
}: PasswordRequirementsProps) => {
  const requirements = PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }));

  return (
    <div className="space-y-100">
      <p className="text-sm font-medium text-fg-secondary">Požadavky na heslo:</p>
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
                <Icon className="text-icon-sm" icon="token-icon-check" />
              ) : (
                <span className="text-icon-xs">•</span>
              )}
            </span>
            <span className="text-sm">{requirement.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
