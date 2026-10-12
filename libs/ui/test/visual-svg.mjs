const svgDataPrefix = /^data:image\/svg\+xml(?:;|,)/i
const svgDataEncoding =
  /^data:image\/svg\+xml(?:;charset=(?:utf-8|utf8|us-ascii))?(?:;base64)?$/
const base64Padding = /[=]+$/
const smilTag =
  /<(?:[\w-]+:)?(?:animate(?:Transform|Motion|Color)?|set)(?=[\s/>])/
const cssAnimation = /(?:@(?:-webkit-)?keyframes|animation(?:-[\w-]+)?\s*:)/i
const httpUrl = /^https?:/i
const svgUrl = /\.svg(?:[?#]|$)/i

/**
 * Decode the original bytes rather than fetching an SVG outside the shared
 * asset cache. Other image types return null. Malformed SVG data URLs fail.
 *
 * @param {string} url
 * @returns {string | null}
 */
export function decodeSvgDataUrl(url) {
  if (!svgDataPrefix.test(url)) {
    return null
  }
  const comma = url.indexOf(",")
  if (comma < 0) {
    throw new Error("SVG data URL is missing its payload")
  }
  const metadata = url.slice(0, comma).toLowerCase()
  if (!svgDataEncoding.test(metadata)) {
    throw new Error(`Unsupported SVG data URL encoding: ${metadata}`)
  }
  const payload = url.slice(comma + 1)
  if (!metadata.endsWith(";base64")) {
    try {
      return decodeURIComponent(payload)
    } catch (cause) {
      throw new Error("SVG data URL has invalid percent encoding", { cause })
    }
  }
  const bytes = Buffer.from(payload, "base64")
  if (
    bytes.length === 0 ||
    bytes.toString("base64").replace(base64Padding, "") !==
      payload.replace(base64Padding, "")
  ) {
    throw new Error("SVG data URL has invalid base64 encoding")
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch (cause) {
    throw new Error("SVG data URL is not valid UTF-8", { cause })
  }
}

/** @param {string} source */
function hasAnimation(source) {
  return smilTag.test(source) || cssAnimation.test(source)
}

/**
 * Freeze supported external SVG images at an actual SVG timeline frame.
 * This does not mask pixels or replace icons with stand-in geometry. It keeps
 * every non-animation SVG node and changes only its animated paint/transform
 * values. Static SVGs and other image types remain byte-for-byte unchanged.
 *
 * Supported SMIL forms are <animate> on stroke-dasharray/stroke-dashoffset,
 * opacity/fill-opacity/stroke-opacity, and <animateTransform type="rotate">.
 * The browser evaluates timing,
 * keyTimes and splines. CSS animations, other SMIL forms, SVG stylesheets and
 * external SVG resources reject. A caller may extend support after verifying
 * another form against real browser rendering; no animation is silently dropped.
 *
 * Invoke after story completion, before the final font/image success gate.
 * readSvgSource must return original shared-cache bytes for HTTP(S) image URLs,
 * or null for non-SVG images. This helper never initiates an external fetch.
 *
 * @param {import("@playwright/test").Page} page
 * @param {object} [options]
 * @param {number} [options.fixedTime] Seconds on the isolated SVG timeline.
 * @param {(url: string) => Promise<string | null>} [options.readSvgSource]
 * @returns {Promise<void>}
 */
export async function freezeVisualSvgImages(page, options = {}) {
  const fixedTime = options.fixedTime ?? 0.75
  if (!Number.isFinite(fixedTime) || fixedTime < 0) {
    throw new Error("The SVG frame time must be a finite, nonnegative number")
  }
  const urls = await page.evaluate(() => {
    const found = new Set()
    const imageProperties = [
      "background-image",
      "mask-image",
      "-webkit-mask-image",
    ]
    const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g
    /** @param {Element} element */
    function visible(element) {
      const bounds = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return (
        bounds.width > 0 &&
        bounds.height > 0 &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      )
    }
    /** @param {CSSStyleDeclaration} style */
    function collect(style) {
      for (const property of imageProperties) {
        for (const match of style
          .getPropertyValue(property)
          .matchAll(urlPattern)) {
          const url = (match[1] ?? match[2] ?? match[3]).trim()
          if (url && !url.startsWith("#")) {
            found.add(url)
          }
        }
      }
    }
    for (const element of document.querySelectorAll("*")) {
      if (!visible(element)) {
        continue
      }
      if (element instanceof HTMLImageElement) {
        found.add(element.currentSrc || element.src)
      }
      for (const pseudo of [null, "::before", "::after"]) {
        collect(getComputedStyle(element, pseudo))
      }
    }
    return [...found].sort()
  })
  for (const url of urls) {
    let source = decodeSvgDataUrl(url)
    if (source === null && httpUrl.test(url)) {
      if (options.readSvgSource) {
        source = await options.readSvgSource(url)
      } else if (svgUrl.test(url)) {
        throw new Error(
          `SVG image requires original shared-cache bytes: ${url}`
        )
      }
    }
    if (source === null || !hasAnimation(source)) {
      continue
    }
    const frozenSource = await page.evaluate(
      async ({ svgSource, time }) => {
        const svgNamespace = "http://www.w3.org/2000/svg"
        const animationSelector =
          "animate, animateTransform, animateMotion, animateColor, set"
        // These constants must stay inside the serialized browser callback.
        // biome-ignore lint/performance/useTopLevelRegex: Browser context has no module closure.
        const declaration = /<!DOCTYPE|<!ENTITY/i
        // biome-ignore lint/performance/useTopLevelRegex: Browser context has no module closure.
        const eventAttribute = /^on/i
        // biome-ignore lint/performance/useTopLevelRegex: Browser context has no module closure.
        const activeValue = /(?:animation|@(?:-webkit-)?keyframes)/i
        // biome-ignore lint/performance/useTopLevelRegex: Browser context has no module closure.
        const hrefAttribute = /^(?:href|xlink:href)$/i
        const imageUrlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g
        // biome-ignore lint/performance/useTopLevelRegex: Browser context has no module closure.
        const clockValue = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:ms|s)?$/
        // biome-ignore lint/performance/useTopLevelRegex: Browser context has no module closure.
        const strokeValue = /^[\d\s.,+eEpx%-]+$/
        function parseSource() {
          if (declaration.test(svgSource)) {
            throw new Error(
              "Animated SVG declarations/entities are unsupported"
            )
          }
          const parsed = new DOMParser().parseFromString(
            svgSource,
            "image/svg+xml"
          )
          if (
            parsed.querySelector("parsererror") ||
            parsed.documentElement.namespaceURI !== svgNamespace ||
            parsed.documentElement.localName !== "svg"
          ) {
            throw new Error("Animated SVG source is not a valid SVG document")
          }
          const root = parsed.documentElement
          if (root.querySelectorAll(animationSelector).length === 0) {
            throw new Error("Animated SVG uses an unsupported CSS animation")
          }
          if (root.querySelector("script, style, foreignObject, image")) {
            throw new Error(
              "Animated SVG scripts, stylesheets or nested resources are unsupported"
            )
          }
          return root
        }
        const root = parseSource()
        /** @param {Element} element */
        function validateAttributes(element) {
          for (const attribute of element.attributes) {
            if (
              eventAttribute.test(attribute.name) ||
              activeValue.test(attribute.value) ||
              (hrefAttribute.test(attribute.name) &&
                !attribute.value.startsWith("#")) ||
              [...attribute.value.matchAll(imageUrlPattern)].some(
                (match) =>
                  !(match[1] ?? match[2] ?? match[3]).trim().startsWith("#")
              )
            ) {
              throw new Error(
                `Animated SVG has an unsupported active/external attribute: ${attribute.name}`
              )
            }
          }
        }
        const allowedProperties = new Set([
          "stroke-dasharray",
          "stroke-dashoffset",
          "opacity",
          "fill-opacity",
          "stroke-opacity",
        ])
        const opacityProperties = new Set([
          "opacity",
          "fill-opacity",
          "stroke-opacity",
        ])
        /** @param {Element} animation @param {string | null} attribute */
        function supportedAnimation(animation, attribute) {
          if (animation.localName === "animate") {
            return allowedProperties.has(attribute ?? "")
          }
          return (
            animation.localName === "animateTransform" &&
            attribute === "transform" &&
            animation.getAttribute("type") === "rotate"
          )
        }
        /** @param {Element} animation */
        function validateAnimation(animation) {
          const attribute = animation.getAttribute("attributeName")
          if (!supportedAnimation(animation, attribute)) {
            throw new Error(
              `Unsupported SVG animation: ${animation.localName} on ${attribute ?? "<missing>"}`
            )
          }
          if (animation.getAttribute("attributeType") === "CSS") {
            throw new Error("Explicit CSS-type SVG animation is unsupported")
          }
          for (const field of ["begin", "end"]) {
            const value = animation.getAttribute(field)
            if (value && !clockValue.test(value)) {
              throw new Error(
                `Event-dependent SVG ${field} time is unsupported: ${value}`
              )
            }
          }
        }
        for (const element of [root, ...root.querySelectorAll("*")]) {
          validateAttributes(element)
        }
        for (const animation of root.querySelectorAll(animationSelector)) {
          validateAnimation(animation)
        }

        /** @template T @param {Promise<T>} operation @param {string} label @returns {Promise<T>} */
        async function bounded(operation, label) {
          let timer
          try {
            return await Promise.race([
              operation,
              /** @type {Promise<never>} */ (
                new Promise((_, reject) => {
                  timer = setTimeout(
                    () => reject(new Error(`SVG frame timed out: ${label}`)),
                    10_000
                  )
                })
              ),
            ])
          } finally {
            clearTimeout(timer)
          }
        }

        const iframe = document.createElement("iframe")
        iframe.setAttribute("aria-hidden", "true")
        iframe.style.cssText =
          "position:fixed;left:-10000px;top:-10000px;width:300px;height:150px;opacity:0;pointer-events:none;border:0;"
        document.body.append(iframe)
        function prepareSvg() {
          const isolatedDocument = iframe.contentDocument
          const frameWindow = iframe.contentWindow
          if (!(isolatedDocument && frameWindow)) {
            throw new Error("Cannot create the isolated SVG frame document")
          }
          const isolated = isolatedDocument
          const isolatedWindow = frameWindow
          isolated.open()
          isolated.write(
            "<!doctype html><html><head></head><body style='margin:0'></body></html>"
          )
          isolated.close()
          const svg = /** @type {SVGSVGElement} */ (
            /** @type {unknown} */ (isolated.importNode(root, true))
          )
          isolated.body.append(svg)
          if (
            typeof svg.pauseAnimations !== "function" ||
            typeof svg.setCurrentTime !== "function" ||
            typeof svg.animationsPaused !== "function"
          ) {
            throw new Error("The browser cannot seek and pause SVG animations")
          }
          return { isolated, isolatedWindow, svg }
        }
        try {
          const { isolated, isolatedWindow, svg } = prepareSvg()
          async function seekTimeline() {
            svg.pauseAnimations()
            svg.setCurrentTime(time)
            svg.getBoundingClientRect()
            for (let update = 0; update < 2; update += 1) {
              await bounded(
                new Promise((resolve) =>
                  isolatedWindow.requestAnimationFrame(resolve)
                ),
                "SVG rendering update"
              )
            }
            const timelineTime = svg.getCurrentTime()
            if (
              !svg.animationsPaused() ||
              Math.abs(timelineTime - time) > 0.000_001
            ) {
              throw new Error(
                `SVG timeline did not freeze at ${time}s, got ${timelineTime}s`
              )
            }
          }
          await seekTimeline()
          const animations = [
            ...svg.querySelectorAll("animate, animateTransform"),
          ]
          /** @type {Map<Element, Map<string, string>>} */
          const properties = new Map()
          /** @param {Element} target */
          function transformValue(target) {
            if (!("transform" in target)) {
              throw new Error("SVG animation target has no transform API")
            }
            const transforms = /** @type {SVGGraphicsElement} */ (target)
              .transform.animVal
            let matrix = svg.createSVGMatrix()
            for (let index = 0; index < transforms.numberOfItems; index += 1) {
              matrix = matrix.multiply(transforms.getItem(index).matrix)
            }
            const coefficients = [
              matrix.a,
              matrix.b,
              matrix.c,
              matrix.d,
              matrix.e,
              matrix.f,
            ]
            if (!coefficients.every(Number.isFinite)) {
              throw new Error("SVG animation has an invalid transform matrix")
            }
            return `matrix(${coefficients.join(" ")})`
          }
          /** @param {Element} target @param {string} attribute */
          function animatedValue(target, attribute) {
            if (attribute === "transform") {
              return transformValue(target)
            }
            const value = isolatedWindow
              .getComputedStyle(target)
              .getPropertyValue(attribute)
              .trim()
            if (opacityProperties.has(attribute)) {
              const opacity = Number(value)
              if (
                !(value && Number.isFinite(opacity)) ||
                opacity < 0 ||
                opacity > 1
              ) {
                throw new Error(
                  `SVG animated opacity is invalid: ${attribute}=${value}`
                )
              }
              return value
            }
            if (!(value && strokeValue.test(value))) {
              throw new Error(
                `SVG animated stroke value is unsupported: ${attribute}=${value}`
              )
            }
            return value
          }
          /** @param {Element} animation */
          function sampleAnimation(animation) {
            const href =
              animation.getAttribute("href") ??
              animation.getAttributeNS("http://www.w3.org/1999/xlink", "href")
            const target = /** @type {Element | null} */ (
              href
                ? isolated.getElementById(href.slice(1))
                : animation.parentNode
            )
            if (!target || target.namespaceURI !== svgNamespace) {
              throw new Error("SVG animation target is missing")
            }
            const attribute = animation.getAttribute("attributeName") ?? ""
            if (!properties.has(target)) {
              properties.set(target, new Map())
            }
            const values = properties.get(target)
            if (!values) {
              throw new Error("SVG animation target bookkeeping failed")
            }
            values.set(attribute, animatedValue(target, attribute))
          }
          for (const animation of animations) {
            sampleAnimation(animation)
          }
          const graphics = [...svg.querySelectorAll("*")].filter(
            (element) => "getBBox" in element && "getCTM" in element
          )
          function geometry() {
            return graphics.map((element) => {
              const graphic = /** @type {SVGGraphicsElement} */ (element)
              const bounds = graphic.getBBox()
              const matrix = graphic.getCTM()
              return [
                bounds.x,
                bounds.y,
                bounds.width,
                bounds.height,
                ...(matrix
                  ? [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]
                  : []),
              ]
            })
          }
          const beforeGeometry = geometry()
          const paintProperties = [
            "fill",
            "stroke",
            "color",
            "stroke-width",
            "stroke-linecap",
            "stroke-linejoin",
            "fill-rule",
            "stroke-miterlimit",
            "stroke-opacity",
            "fill-opacity",
            "opacity",
            "stroke-dasharray",
            "stroke-dashoffset",
          ]
          function paint() {
            return graphics.map((element) => {
              const style = isolatedWindow.getComputedStyle(element)
              return paintProperties.map((property) =>
                style.getPropertyValue(property)
              )
            })
          }
          const beforePaint = paint()
          function persistProperties() {
            for (const [target, values] of properties) {
              for (const [attribute, value] of values) {
                if (attribute === "transform") {
                  target.setAttribute(attribute, value)
                } else {
                  const styledTarget = /** @type {SVGElement} */ (target)
                  styledTarget.style.setProperty(attribute, value, "important")
                }
              }
            }
          }
          persistProperties()
          for (const animation of animations) {
            animation.remove()
          }
          svg.getBoundingClientRect()
          const afterGeometry = geometry()
          /** @param {number[][]} before @param {number[][]} after */
          function assertGeometry(before, after) {
            for (let index = 0; index < before.length; index += 1) {
              if (
                before[index].length !== after[index].length ||
                before[index].some(
                  (value, component) =>
                    Math.abs(value - after[index][component]) > 0.000_001
                )
              ) {
                throw new Error(
                  "Freezing SVG animations changed the selected frame geometry"
                )
              }
            }
          }
          assertGeometry(beforeGeometry, afterGeometry)
          if (JSON.stringify(beforePaint) !== JSON.stringify(paint())) {
            throw new Error(
              "Freezing SVG animations changed the selected frame colors or paint"
            )
          }
          function assertStrokeValues() {
            for (const [target, values] of properties) {
              for (const [attribute, value] of values) {
                if (
                  attribute !== "transform" &&
                  isolatedWindow
                    .getComputedStyle(target)
                    .getPropertyValue(attribute)
                    .trim() !== value
                ) {
                  throw new Error(`Freezing SVG animation changed ${attribute}`)
                }
              }
            }
          }
          assertStrokeValues()
          if (
            svg.querySelector(animationSelector) ||
            svg.getAnimations({ subtree: true }).length > 0
          ) {
            throw new Error("Serialized SVG still has active animations")
          }
          return new XMLSerializer().serializeToString(svg)
        } finally {
          iframe.remove()
        }
      },
      { svgSource: source, time: fixedTime }
    )
    const frozenUrl = `data:image/svg+xml,${encodeURIComponent(frozenSource)}`
    await page.evaluate(
      async ({ original, replacement }) => {
        /** @template T @param {Promise<T>} operation @param {string} label @returns {Promise<T>} */
        async function bounded(operation, label) {
          let timer
          try {
            return await Promise.race([
              operation,
              /** @type {Promise<never>} */ (
                new Promise((_, reject) => {
                  timer = setTimeout(
                    () => reject(new Error(`Frozen SVG timed out: ${label}`)),
                    10_000
                  )
                })
              ),
            ])
          } finally {
            clearTimeout(timer)
          }
        }
        const image = new Image()
        image.src = replacement
        await bounded(image.decode(), "image decode")
        if (!(image.naturalWidth && image.naturalHeight)) {
          throw new Error("Frozen SVG image has no intrinsic dimensions")
        }
        let count = 0
        const imageProperties = [
          "background-image",
          "mask-image",
          "-webkit-mask-image",
        ]
        const urlPattern = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g
        /** @param {Element} element */
        function visible(element) {
          const bounds = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          return (
            bounds.width > 0 &&
            bounds.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          )
        }
        /** @param {Element} element */
        function assertPseudoSupported(element) {
          for (const pseudo of ["::before", "::after"]) {
            const computed = getComputedStyle(element, pseudo)
            if (
              imageProperties.some((property) =>
                [
                  ...computed.getPropertyValue(property).matchAll(urlPattern),
                ].some(
                  (match) =>
                    (match[1] ?? match[2] ?? match[3]).trim() === original
                )
              )
            ) {
              throw new Error(
                "Animated SVG images in pseudo-elements are unsupported"
              )
            }
          }
        }
        /** @param {Element} element */
        async function replaceImage(element) {
          if (
            element instanceof HTMLImageElement &&
            (element.currentSrc || element.src) === original
          ) {
            if (
              element.srcset ||
              element.parentElement?.localName === "picture"
            ) {
              throw new Error(
                "Animated SVG images with responsive sources are unsupported"
              )
            }
            element.src = replacement
            await bounded(element.decode(), "element decode")
            count += 1
          }
        }
        /** @param {Element} element */
        function replaceStyles(element) {
          const style = getComputedStyle(element)
          for (const property of imageProperties) {
            const value = style.getPropertyValue(property)
            let matches = 0
            const frozen = value.replace(
              urlPattern,
              (whole, quoted, singleQuoted, unquoted) => {
                if ((quoted ?? singleQuoted ?? unquoted).trim() !== original) {
                  return whole
                }
                matches += 1
                return `url("${replacement}")`
              }
            )
            if (matches > 0) {
              if (!("style" in element)) {
                throw new Error(
                  "Animated SVG image owner has no inline style API"
                )
              }
              const styledElement = /** @type {HTMLElement} */ (element)
              styledElement.style.setProperty(property, frozen, "important")
              count += matches
            }
          }
        }
        for (const element of document.querySelectorAll("*")) {
          if (!visible(element)) {
            continue
          }
          assertPseudoSupported(element)
          await replaceImage(element)
          replaceStyles(element)
        }
        if (count === 0) {
          throw new Error(
            "The animated SVG image disappeared before its frame was replaced"
          )
        }
      },
      { original: url, replacement: frozenUrl }
    )
  }
}
