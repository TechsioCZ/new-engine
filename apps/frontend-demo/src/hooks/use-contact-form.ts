import { useMutation } from "@tanstack/react-query"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { useState } from "react"
import type { SyntheticEvent } from "react"

interface ContactFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  subject: string
  message: string
}

interface UseContactFormProps {
  onSuccess?: () => void
}

const INITIAL_FORM_DATA: ContactFormData = {
  email: "",
  firstName: "",
  lastName: "",
  message: "",
  phone: "",
  subject: "general",
}

const readContactError = (value: unknown): string | undefined => {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return undefined
  }

  if (typeof value.error !== "string" || value.error.length === 0) {
    return undefined
  }

  return value.error
}

const sendContactForm = async (data: ContactFormData): Promise<void> => {
  const response = await fetch("/api/contact", {
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  const result: unknown = await response.json()

  if (!response.ok) {
    throw new Error(readContactError(result) ?? "Něco se pokazilo")
  }
}

export const useContactForm = ({ onSuccess }: UseContactFormProps = {}) => {
  const toast = useToast()
  const [formData, setFormData] = useState<ContactFormData>(INITIAL_FORM_DATA)

  const mutation = useMutation({
    mutationFn: sendContactForm,
    onError: (error: Error) => {
      toast.create({
        description:
          error.message.length > 0
            ? error.message
            : "Nepodařilo se odeslat zprávu. Zkuste to prosím později.",
        duration: 5000,
        title: "Chyba",
        type: "error",
      })
    },
    onSuccess: () => {
      toast.create({
        description:
          "Vaše zpráva byla úspěšně odeslána. Ozveme se vám co nejdříve.",
        duration: 5000,
        title: "Zpráva odeslána",
        type: "success",
      })

      // Reset form
      setFormData(INITIAL_FORM_DATA)

      // Call custom success handler if provided
      onSuccess?.()
    },
  })

  const updateField = <K extends keyof ContactFormData>(
    field: K,
    value: ContactFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate(formData)
  }

  return {
    error: mutation.error,
    formData,
    handleSubmit,
    isError: mutation.isError,
    isSubmitting: mutation.isPending,
    isSuccess: mutation.isSuccess,
    updateField,
  }
}
