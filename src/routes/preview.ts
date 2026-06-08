import { Router, Request, Response } from 'express'
import chromium from '@sparticuz/chromium'
import { chromium as playwright } from 'playwright-core'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  let browser = null

  try {
    const { url, secret } = req.body

    // secret token check
    // if (secret !== process.env.SECRET_TOKEN) {
    //   return res.status(401).json({ error: 'Unauthorized' })
    // }

    if (!url) {
      return res.status(400).json({ error: 'URL is required' })
    }

    // follow redirects first
    const redirectResponse = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    const expandedUrl = redirectResponse.url

const isLocal = process.env.NODE_ENV !== 'production'

browser = await playwright.launch({
  args: isLocal ? [] : chromium.args,
  executablePath: isLocal
    ? undefined  // uses playwright's own bundled chromium locally
    : await chromium.executablePath(),
  headless: true,
})

    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    })

    await page.goto(expandedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })

    await page.waitForTimeout(5000)

    const pageTitle = await page.title()

    const images = await page.evaluate(() => {
      return Array.from(document.images)
        .map((img) => ({
          src: img.src,
          width: img.width,
          height: img.height,
        }))
        .filter(
          (img) =>
            img.src.includes('googleusercontent.com') &&
            img.width > 200 &&
            img.height > 150
        )
    })

    let image = images[0]?.src || ''
    if (image) image = image.replace(/=w\d+-h\d+.*$/, '=s2000')

    return res.json({
      success: true,
      title: pageTitle.replace(' - Google Maps', ''),
      image,
      mapsUrl: page.url(),
      expandedUrl,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    if (browser) await browser.close()
  }
})

export default router