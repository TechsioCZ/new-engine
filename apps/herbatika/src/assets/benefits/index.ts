import delivery from "./doprava.avif"
import products from "./produkty.avif"
import returns from "./vraceni.avif"
import customers from "./zakaznici.avif"

export const BENEFITS = [
  {
    id: 1,
    image: delivery,
    text: "Rýchle doručenie až k vám domov.",
    description: "Rychlé a spolehlivé doručení vašich objednávek.",
  },
  {
    id: 2,
    image: returns,
    text: "Garancia spokojnosti alebo vrátenia peňazí.",
    description: "Jednoduché a rychlé vracení produktů.",
  },
  {
    id: 3,
    image: products,
    text: "130+ vlastných produktov skladom.",
    description: "Vybrané a kvalitní produkty pro vaše potřeby.",
  },
  {
    id: 4,
    image: customers,
    text: "Dôverujú nám tisíce zákazníkov po celej Európe.",
    description: "Výborný zážitek z nákupu u nás.",
  },
]
