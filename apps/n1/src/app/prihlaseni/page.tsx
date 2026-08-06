"use client"

import { LoginForm } from "@/components/forms/login-form"

const LoginPage = () => (
  <div className="mx-auto w-md max-w-full py-600">
    <LoginForm showForgotPasswordLink showRegisterLink />
  </div>
)

export default LoginPage
