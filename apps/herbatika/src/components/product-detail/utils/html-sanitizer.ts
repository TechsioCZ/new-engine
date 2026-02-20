const ALLOWED_HTML_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "em",
  "h2",
  "h3",
  "h4",
  "i",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

const ALLOWED_GLOBAL_ATTRIBUTES = new Set(["title"]);

const ALLOWED_TAG_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "title"]),
  td: new Set(["colspan", "rowspan", "title"]),
  th: new Set(["colspan", "rowspan", "title"]),
};

const escapeHtmlAttribute = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
};

const parseTagAttributes = (rawAttributes: string) => {
  const attributes: Array<{ name: string; value: string }> = [];
  const attributePattern =
    /([a-zA-Z0-9:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  let match = attributePattern.exec(rawAttributes);
  while (match) {
    const name = match[1]?.toLowerCase();
    const value = (match[2] ?? match[3] ?? match[4] ?? "").trim();

    if (name) {
      attributes.push({ name, value });
    }

    match = attributePattern.exec(rawAttributes);
  }

  return attributes;
};

export const sanitizeHtml = (html: string): string => {
  if (!html) {
    return "";
  }

  const cleanedHtml = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?<\/embed>/gi, "");

  const sanitized = cleanedHtml.replace(
    /<\s*(\/?)\s*([a-zA-Z0-9]+)([^>]*)>/g,
    (_, closingSlash: string, rawTag: string, rawAttributes: string) => {
      const tag = rawTag.toLowerCase();

      if (!ALLOWED_HTML_TAGS.has(tag)) {
        return "";
      }

      const isClosingTag = closingSlash === "/";
      if (isClosingTag) {
        return `</${tag}>`;
      }

      const allowedAttributesForTag =
        ALLOWED_TAG_ATTRIBUTES[tag] ?? new Set<string>();

      const sanitizedAttributes: string[] = [];
      let sanitizedHref: string | null = null;
      let targetValue: string | null = null;
      let relValue: string | null = null;

      for (const attribute of parseTagAttributes(rawAttributes ?? "")) {
        const { name, value } = attribute;

        if (
          !ALLOWED_GLOBAL_ATTRIBUTES.has(name) &&
          !allowedAttributesForTag.has(name)
        ) {
          continue;
        }

        if (tag === "a" && name === "href") {
          const hasSafeHref = /^(https?:|mailto:|tel:|\/|#)/i.test(value);
          if (!hasSafeHref) {
            continue;
          }

          sanitizedHref = value;
          continue;
        }

        if (tag === "a" && name === "target") {
          targetValue = value;
          continue;
        }

        if (tag === "a" && name === "rel") {
          relValue = value;
          continue;
        }

        if (!value) {
          continue;
        }

        sanitizedAttributes.push(`${name}="${escapeHtmlAttribute(value)}"`);
      }

      if (tag === "a" && sanitizedHref) {
        sanitizedAttributes.push(`href="${escapeHtmlAttribute(sanitizedHref)}"`);

        if (/^https?:/i.test(sanitizedHref)) {
          sanitizedAttributes.push('target="_blank"');
          sanitizedAttributes.push('rel="noopener noreferrer"');
        } else {
          if (targetValue) {
            sanitizedAttributes.push(`target="${escapeHtmlAttribute(targetValue)}"`);
          }

          if (relValue) {
            sanitizedAttributes.push(`rel="${escapeHtmlAttribute(relValue)}"`);
          }
        }
      }

      const attributesString =
        sanitizedAttributes.length > 0 ? ` ${sanitizedAttributes.join(" ")}` : "";

      if (tag === "br") {
        return `<${tag}${attributesString}>`;
      }

      const isSelfClosing = /\/\s*$/.test(rawAttributes ?? "");
      if (isSelfClosing) {
        return `<${tag}${attributesString} />`;
      }

      return `<${tag}${attributesString}>`;
    },
  );

  return sanitized.trim();
};

export const stripHtml = (value: string | null | undefined): string => {
  if (!value) {
    return "";
  }

  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};
