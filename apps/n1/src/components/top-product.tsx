import Image from "next/image"
import type { StaticImageData } from "next/image"

interface TopProductProps {
  src: StaticImageData
  label: string
}
export function TopProduct({ src, label }: TopProductProps) {
  return (
    <div className="grid h-full cursor-pointer place-items-center items-start px-0 duration-500 hover:scale-105 hover:shadow-xl">
      <Image alt={label} className="flex w-top-product" src={src} width={200} />
      <p className="text-center font-bold text-sm">{label}</p>
    </div>
  )
}
