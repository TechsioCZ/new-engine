import { useMutation } from "@tanstack/react-query"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { useState } from "react"

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

async function sendContactForm(data: ContactFormData) {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Něco se pokazilo")
  }

  return result
}

export function useContactForm({ onSuccess }: UseContactFormProps = {}) {
  const toast = useToast()

  const initialFormData: ContactFormData = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "general",
    message: "",
  }

  const [formData, setFormData] = useState<ContactFormData>(initialFormData)

  const mutation = useMutation({
    mutationFn: sendContactForm,
    onSuccess: () => {
      toast.create({
        title: "Zpráva odeslána",
        description:
          "Vaše zpráva byla úspěšně odeslána. Ozveme se vám co nejdříve.",
        type: "success",
        duration: 5000,
      })

      // Reset form
      setFormData(initialFormData)

      // Call custom success handler if provided
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast.create({
        title: "Chyba",
        description:
          error.message ||
          "Nepodařilo se odeslat zprávu. Zkuste to prosím později.",
        type: "error",
        duration: 5000,
      })
    },
  })

  const updateField = <K extends keyof ContactFormData>(
    field: K,
    value: ContactFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  return {
    formData,
    updateField,
    handleSubmit,
    isSubmitting: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
  }
}
