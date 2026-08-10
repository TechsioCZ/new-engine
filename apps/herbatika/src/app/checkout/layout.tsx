import Script from "next/script"

const PACKETA_WIDGET_LIBRARY_URL =
  "https://widget.packeta.com/v6/www/js/library.js"
const PPL_WIDGET_LOADER_URL = "https://www.ppl.cz/accesspointwidget/loader.js"

const CheckoutLayout = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => (
  <>
    {children}
    <Script
      id="packeta-pickup-widget-library"
      src={PACKETA_WIDGET_LIBRARY_URL}
      strategy="afterInteractive"
    />
    <Script
      id="ppl-access-point-widget-loader"
      src={PPL_WIDGET_LOADER_URL}
      strategy="afterInteractive"
    />
  </>
)

export default CheckoutLayout
