import Document, {
  type DocumentContext,
  type DocumentInitialProps,
  Head,
  Html,
  Main,
  NextScript,
} from "next/document"
import { storefrontFontVariables, verdana } from "@/app/storefront-fonts"
import { resolvePagesDocumentHtmlLang } from "@/lib/routing/pages/document-language"

type HerbatikaDocumentProps = DocumentInitialProps &
  Readonly<{ htmlLang: string }>

export default class HerbatikaDocument extends Document<HerbatikaDocumentProps> {
  static async getInitialProps(
    context: DocumentContext
  ): Promise<HerbatikaDocumentProps> {
    const initialProps = await Document.getInitialProps(context)
    return {
      ...initialProps,
      htmlLang: resolvePagesDocumentHtmlLang(
        context.req?.headers["x-sf-market"]
      ),
    }
  }

  render() {
    return (
      <Html className={storefrontFontVariables} lang={this.props.htmlLang}>
        <Head />
        <body className={`text-fg-primary ${verdana.className}`}>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
