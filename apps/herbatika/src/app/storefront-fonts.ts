import { Inter, Open_Sans, Roboto, Rubik } from "next/font/google"
import localFont from "next/font/local"

export const verdana = localFont({
  src: [
    {
      path: "./fonts/Verdana-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Verdana-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-verdana",
  display: "swap",
})

const openSans = Open_Sans({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

const inter = Inter({
  variable: "--font-inter-font",
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
})

export const storefrontFontVariables = [
  verdana.variable,
  openSans.variable,
  inter.variable,
  rubik.variable,
  roboto.variable,
].join(" ")
