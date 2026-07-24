import type { IconType } from "@techsio/ui-kit/atoms/icon"
import type { StaticImageData } from "next/image"

import pavelImg from "../../assets/team/pavel.jpg"
import petrImg from "../../assets/team/petr.jpg"

interface TeamMember {
  name: string
  role: string
  image: string | StaticImageData
}

interface CompanyValue {
  title: string
  description: string
  icon: IconType // SVG path data
}

interface CompanyStat {
  value: string
  label: string
}

export interface AboutContent {
  hero: {
    title: string
    subtitle: string
    backgroundImage: string
  }
  story: {
    title: string
    paragraphs: string[]
    image: string
    imageAlt: string
  }
  stats: CompanyStat[]
  values: {
    title: string
    items: CompanyValue[]
  }
  team: {
    title: string
    members: TeamMember[]
  }
  cta: {
    title: string
    description: string
    buttonText: string
    buttonLink: string
  }
}

export const aboutContent: AboutContent = {
  hero: {
    title: "Náš příběh",
    subtitle: "Vytváříme nadčasové eshopy s účelem a vášní od roku 2008",
    backgroundImage: "/assets/hero/about.webp",
  },
  story: {
    title: "Od vize ke skutečnosti",
    paragraphs: [
      "V roce 2024 jsme převzali otěže a vdechli nový život do dlouholeté tradice vývoje špičkových e-commerce řešení, které se píše již od roku 2008.",
      "Její základy položil Antonín Růšal, který tehdy začal s průkopnickými projekty v oblasti online aukčních portálů a e-shopů. Postupem času se zaměření společnosti výhradně soustředilo na komplexní e-shopová řešení, stavěná na robustním jádru schopném zvládat i ty nejnáročnější požadavky, jako jsou systémy se stovkami milionů individuálních cen. Díky této bohaté historii a neustálému vývoji, který zohledňuje ty nejmodernější technologie, vám dnes můžeme nabídnout řešení, které není jen produktem, ale výsledkem dekád zkušeností a inovací.",
      "Naše vize je jasná: posunout hranice možného a poskytnout e-shopům s ročním obratem nad 50 milionů korun nástroje, které jim umožní růst a excelovat. Přestože jdeme kupředu s novým elánem a brandem, hluboce si vážíme patnáctileté historie, která stojí za našimi technologiemi.",
    ],
    image:
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    imageAlt: "Naše dílna",
  },
  stats: [
    { value: "50K+", label: "Spokojených zákazníků" },
    { value: "100%", label: "Udržitelné materiály" },
    { value: "25+", label: "Partnerských řemeslníků" },
    { value: "4.9★", label: "Hodnocení zákazníků" },
  ],
  values: {
    title: "Za čím si stojíme",
    items: [
      {
        title: "Udržitelnost",
        description: "Každé rozhodnutí děláme s ohledem na planetu",
        icon: "token-icon-earth",
      },
      {
        title: "Nekompromisní kvalita",
        description:
          "Pečlivě vybíráme materiály pro maximální životnost produktů",
        icon: "token-icon-check-circle",
      },
      {
        title: "Spravedlivý obchod",
        description: "Transparentní dodavatelský řetězec od vlákna po výrobek",
        icon: "token-icon-present",
      },
      {
        title: "Inovace",
        description: "Experimentujeme s materiály šetrnými k přírodě i lidem",
        icon: "token-icon-light",
      },
      {
        title: "Komunita",
        description:
          "Vybudovali jsme komunitu lidí se zápalem, která sdílí své nápady",
        icon: "token-icon-group",
      },
      {
        title: "Globální dopad",
        description: "Z českého ateliéru jsme přerostli do zahraničních trhů",
        icon: "token-icon-global",
      },
    ],
  },
  team: {
    title: "Poznejte náš tým",
    members: [
      {
        name: "Petr Glaser",
        role: "Founder",
        image: petrImg,
      },
      {
        name: "Pavel Koudelka",
        role: "Co-Founder",
        image: pavelImg,
      },
    ],
  },
  cta: {
    title: "Připojte se k naší cestě",
    description:
      "Jsme víc než značka - jsme hnutí směrem k uvědomělé módě. Každý váš nákup podporuje naši misi vytvořit udržitelnější a stylovější svět.",
    buttonText: "Nakupovat naši kolekci",
    buttonLink: "/products",
  },
}
