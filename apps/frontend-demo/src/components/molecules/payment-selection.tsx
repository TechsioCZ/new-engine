import Image from "next/image"
import "../../tokens/app-components/molecules/_payment-selection.css"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Icon } from "@techsio/ui-kit/atoms/icon"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import type { PaymentMethod } from "@/types/checkout"

interface PaymentSelectionProps {
  selected: string
  onSelect: (method: string) => void
  currentStep: number
  setCurrentStep: (step: number) => void
  paymentMethods: PaymentMethod[]
}

export function PaymentSelection({
  selected,
  onSelect,
  currentStep,
  setCurrentStep,
  paymentMethods,
}: PaymentSelectionProps) {
  const toast = useToast()

  const handleProgress = () => {
    if (selected && paymentMethods.some((method) => method.id === selected)) {
      setCurrentStep(currentStep + 1)
      return
    }

    toast.create({
      type: "error",
      title: "Vyberte zpusob platby",
      description: "Pro pokracovani je nutne vybrat zpusob platby",
    })
  }

  return (
    <div className="w-full space-y-250 py-2 sm:py-4">
      <div className="mb-3 flex items-center gap-2 text-fg-secondary text-xs sm:mb-4 sm:text-sm">
        <Icon icon="token-icon-lock" />
        <span>Vsechny platby jsou zabezpecene a sifrovane</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:gap-4 xl:grid-cols-4">
        {paymentMethods.map((method) => (
          <Button
            aria-label={`Vybrat platebni metodu ${method.name}`}
            aria-pressed={selected === method.id}
            className="relative flex h-[100px] flex-col items-center justify-center rounded-lg border-2 border-border-subtle bg-surface p-2 transition-all duration-200 hover:bg-surface-hover hover:shadow-md focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width) focus-visible:outline-ring focus-visible:outline-offset-(length:--default-ring-offset) data-[selected=true]:border-primary data-[selected=true]:bg-surface-selected data-[selected=true]:shadow-lg sm:h-[140px] sm:p-3 lg:h-[180px] lg:p-4"
            data-selected={selected === method.id}
            key={method.id}
            onClick={() => onSelect(method.id)}
            theme="borderless"
          >
            <div
              className="absolute top-1 right-1 flex h-5 w-5 scale-0 items-center justify-center rounded-full bg-primary opacity-0 transition-all duration-200 data-[selected=true]:scale-100 data-[selected=true]:opacity-100 sm:top-2 sm:right-2 sm:h-6 sm:w-6"
              data-selected={selected === method.id}
            >
              <Icon className="text-fg-reverse" icon="token-icon-check" />
            </div>
            <Image
              alt={method.name}
              className={`h-[40px] w-[60px] object-contain brightness-100 sm:h-[50px] sm:w-[80px] lg:h-[60px] lg:w-[100px] ${(method.id === "qr" || method.id === "cash") && "dark-white"}`}
              height={80}
              src={method.image}
              width={120}
            />
            <span className="mt-1 text-center font-medium text-xs sm:mt-2 sm:text-sm">
              {method.name}
            </span>
          </Button>
        ))}
      </div>

      {!paymentMethods.length && (
        <p className="text-fg-secondary text-sm">
          Pro aktualni region neni dostupna zadna platebni metoda.
        </p>
      )}

      <div className="flex justify-between">
        <Button onClick={() => setCurrentStep(currentStep - 1)} size="sm">
          Zpet
        </Button>
        <Button disabled={!paymentMethods.length} onClick={handleProgress} size="sm">
          Pokracovat
        </Button>
      </div>
    </div>
  )
}
