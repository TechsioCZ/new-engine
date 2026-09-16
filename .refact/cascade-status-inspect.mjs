import { chromium } from "@playwright/test"

const browser = await chromium.launch({ executablePath: "C:/Users/pisez/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe" })
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } })
  const errors = []
  page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`) })
  page.on("pageerror", error => errors.push(error.message))
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()) })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send("Log.enable")
  cdp.on("Log.entryAdded", ({ entry }) => { if (entry.level === "error") errors.push({ text: entry.text, url: entry.url }) })
  await page.goto("http://127.0.0.1:6017/iframe.html?id=molecules-cascadeselect--accessible-status-text&viewMode=story")
  const trigger = page.getByRole("combobox")
  await trigger.focus()
  await page.screenshot({ path: ".refact/cascade-status-after.png" })
  const { nodes } = await cdp.send("Accessibility.getFullAXTree")
  console.log(JSON.stringify({ comboboxes: nodes.filter(node => node.role?.value === "combobox").map(node => ({ name: node.name?.value, description: node.description?.value })), errors }, null, 2))
} finally {
  await browser.close()
}
