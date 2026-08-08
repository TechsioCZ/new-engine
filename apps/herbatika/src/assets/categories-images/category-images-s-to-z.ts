import type { StaticImageData } from "next/image"

import sampony from "./sampony.webp"
import seborea from "./seborea.webp"
import seraEmulzieOleje from "./sera-emulzie-oleje.webp"
import sera from "./sera.webp"
import setyProtiOpuchomNoh from "./sety-proti-opuchom-noh.webp"
import sirupy from "./sirupy.webp"
import sisiakBajkalsky from "./sisiak-bajkalsky.webp"
import sladkeDrievko from "./sladke-drievko.webp"
import soliDoKupela from "./soli-do-kupela.webp"
import spanokANespavost from "./spanok-a-nespavost.webp"
import specialnaStarostlivostOPlet from "./specialna-starostlivost-o-plet.webp"
import specialneJedleOleje from "./specialne-jedle-oleje.webp"
import specialneVlasoveOlejeASera from "./specialne-vlasove-oleje-a-sera.webp"
import spevnenieVlasov from "./spevnenie-vlasov.webp"
import sprchoveGely from "./sprchove-gely.webp"
import srdceACievy from "./srdce-a-cievy.webp"
import starnutieAVrasky from "./starnutie-a-vrasky.webp"
import starostlivostOKozuASrst from "./starostlivost-o-kozu-a-srst.webp"
import starostlivostOLabkyAPazuriky from "./starostlivost-o-labky-a-pazuriky.webp"
import starostlivostONohy from "./starostlivost-o-nohy.webp"
import starostlivostOOciUsiAZuby from "./starostlivost-o-oci-usi-a-zuby.webp"
import starostlivostOPery from "./starostlivost-o-pery.webp"
import starostlivostORukyANechty from "./starostlivost-o-ruky-a-nechty.webp"
import starostlivostORuky from "./starostlivost-o-ruky.webp"
import starostlivostOVlasy from "./starostlivost-o-vlasy.webp"
import stitnaZlaza from "./stitna-zlaza.webp"
import stresANervozita from "./stres-a-nervozita.webp"
import strieACelulitida from "./strie-a-celulitida.webp"
import suchaDehydratovanaPlet from "./sucha-dehydratovana-plet.webp"
import sungit from "./sungit.webp"
import svalyASlachy from "./svaly-a-slachy.webp"
import tekuteMydlo from "./tekute-mydlo.webp"
import telovaKozmetika from "./telova-kozmetika.webp"
import teloveKremy from "./telove-kremy.webp"
import teloveOleje from "./telove-oleje.webp"
import telovePeelingy from "./telove-peelingy.webp"
import tenisovyLaket from "./tenisovy-laket.webp"
import travenieAMetabolizmus from "./travenie-a-metabolizmus.webp"
import travenieAZaludok from "./travenie-a-zaludok.webp"
import tuheMydlo from "./tuhe-mydlo.webp"
import ustnaHygiena from "./ustna-hygiena.webp"
import valerianaLekarska from "./valeriana-lekarska.webp"
import viacdruhoveCajePodlaUcinku from "./viacdruhove-caje-podla-ucinku.webp"
import vitaminyAMineraly from "./vitaminy-a-mineraly.webp"
import vlasovaDiagnostika from "./vlasova-diagnostika.webp"
import vlasovaKozmetika from "./vlasova-kozmetika.webp"
import vlasyVypadavanieLupiny from "./vlasy_vypadavanie_lupiny.webp"
import vnutorneOrgany from "./vnutorne-organy.webp"
import vypadavanieVlasov from "./vypadavanie-vlasov.webp"
import vysokyKrvnyTlak from "./vysoky-krvny-tlak.webp"
import vyzivoveDoplnkyNaVlasy from "./vyzivove-doplnky-na-vlasy.webp"
import zaStudenaLisovanyRakytnikovyOlej from "./za-studena-lisovany-rakytnikovy-olej.webp"
import zdravotnePonozky from "./zdravotne-ponozky.webp"
import zensen from "./zensen.webp"
import zenskeZdravie from "./zenske-zdravie.webp"
import zmiesanaACitlivaPlet from "./zmiesana-a-citliva-plet.webp"
import zubnePasty from "./zubne-pasty.webp"

export const categoryImagesStoZ = {
  sampony,
  seborea,
  sera,
  "sera-emulzie-oleje": seraEmulzieOleje,
  "sety-proti-opuchom-noh": setyProtiOpuchomNoh,
  sirupy,
  "sisiak-bajkalsky": sisiakBajkalsky,
  "sladke-drievko": sladkeDrievko,
  "soli-do-kupela": soliDoKupela,
  "spanok-a-nespavost": spanokANespavost,
  "specialna-starostlivost-o-plet": specialnaStarostlivostOPlet,
  "specialne-jedle-oleje": specialneJedleOleje,
  "specialne-vlasove-oleje-a-sera": specialneVlasoveOlejeASera,
  "spevnenie-vlasov": spevnenieVlasov,
  "sprchove-gely": sprchoveGely,
  "srdce-a-cievy": srdceACievy,
  "starnutie-a-vrasky": starnutieAVrasky,
  "starostlivost-o-kozu-a-srst": starostlivostOKozuASrst,
  "starostlivost-o-labky-a-pazuriky": starostlivostOLabkyAPazuriky,
  "starostlivost-o-nohy": starostlivostONohy,
  "starostlivost-o-oci-usi-a-zuby": starostlivostOOciUsiAZuby,
  "starostlivost-o-pery": starostlivostOPery,
  "starostlivost-o-ruky": starostlivostORuky,
  "starostlivost-o-ruky-a-nechty": starostlivostORukyANechty,
  "starostlivost-o-vlasy": starostlivostOVlasy,
  "stitna-zlaza": stitnaZlaza,
  "stres-a-nervozita": stresANervozita,
  "strie-a-celulitida": strieACelulitida,
  "sucha-dehydratovana-plet": suchaDehydratovanaPlet,
  sungit,
  "svaly-a-slachy": svalyASlachy,
  "tekute-mydlo": tekuteMydlo,
  "telova-kozmetika": telovaKozmetika,
  "telove-kremy": teloveKremy,
  "telove-oleje": teloveOleje,
  "telove-peelingy": telovePeelingy,
  "tenisovy-laket": tenisovyLaket,
  "travenie-a-metabolizmus": travenieAMetabolizmus,
  "travenie-a-zaludok": travenieAZaludok,
  "tuhe-mydlo": tuheMydlo,
  "ustna-hygiena": ustnaHygiena,
  "valeriana-lekarska": valerianaLekarska,
  "viacdruhove-caje-podla-ucinku": viacdruhoveCajePodlaUcinku,
  "vitaminy-a-mineraly": vitaminyAMineraly,
  "vlasova-diagnostika": vlasovaDiagnostika,
  "vlasova-kozmetika": vlasovaKozmetika,
  "vlasy-vypadavanie-lupiny": vlasyVypadavanieLupiny,
  "vnutorne-organy": vnutorneOrgany,
  "vypadavanie-vlasov": vypadavanieVlasov,
  "vysoky-krvny-tlak": vysokyKrvnyTlak,
  "vyzivove-doplnky-na-vlasy": vyzivoveDoplnkyNaVlasy,
  "za-studena-lisovany-rakytnikovy-olej": zaStudenaLisovanyRakytnikovyOlej,
  "zdravotne-ponozky": zdravotnePonozky,
  zensen,
  "zenske-zdravie": zenskeZdravie,
  "zmiesana-a-citliva-plet": zmiesanaACitlivaPlet,
  "zubne-pasty": zubnePasty,
} satisfies Record<string, StaticImageData>
