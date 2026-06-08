import { Router, Request, Response } from 'express'
import chromium from '@sparticuz/chromium'
import { chromium as playwright } from 'playwright-core'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  let browser: any = null

  try {
    const { url, secret } = req.body

    // Optional auth
    // if (secret !== process.env.SECRET_TOKEN) {
    //   return res.status(401).json({ error: 'Unauthorized' })
    // }

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      })
    }

    console.log('========================')
    console.log('Incoming URL:', url)
    console.log('========================')

    // Expand maps.app.goo.gl links
    const redirectResponse = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    const expandedUrl = redirectResponse.url

    console.log('Expanded URL:', expandedUrl)

    // Extract coordinates
    const coordinatesMatch =
      expandedUrl.match(
        /@(-?\d+\.\d+),(-?\d+\.\d+)/
      )

    const latitude = coordinatesMatch
      ? Number(coordinatesMatch[1])
      : null

    const longitude = coordinatesMatch
      ? Number(coordinatesMatch[2])
      : null

    console.log('Latitude:', latitude)
    console.log('Longitude:', longitude)

    const isLocal =
      process.env.NODE_ENV !== 'production'

    browser = await playwright.launch({
      args: isLocal ? [] : chromium.args,
      executablePath: isLocal
        ? undefined
        : await chromium.executablePath(),
      headless: true,
    })

    const page = await browser.newPage({
      viewport: {
        width: 1280,
        height: 900,
      },
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
            img.src.includes(
              'googleusercontent.com'
            ) &&
            img.width > 200 &&
            img.height > 150
        )
    })

    let image = images[0]?.src || ''

    if (image) {
      image = image.replace(
        /=w\d+-h\d+.*$/,
        '=s2000'
      )
    }

    const title = pageTitle.replace(
      ' - Google Maps',
      ''
    )

    console.log('========================')
    console.log('Title:', title)
    console.log('Image Found:', !!image)
    console.log('Coordinates:', {
      latitude,
      longitude,
    })
    console.log('========================')

    return res.json({
      success: true,

      title,
      image,

      mapsUrl: page.url(),
      expandedUrl,

      latitude,
      longitude,
    })
  } catch (error) {
    console.error('Preview Error:', error)

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
})

export default router