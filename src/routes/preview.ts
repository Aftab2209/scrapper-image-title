import { Router, Request, Response } from 'express'
import chromium from '@sparticuz/chromium'
import { chromium as playwright } from 'playwright-core'

const router = Router()

router.post('/', async (req: Request, res: Response) => {
  let browser: any = null

  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      })
    }

    console.log('==============================')
    console.log('REQUEST URL:', url)
    console.log('==============================')

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

    console.log('Opening page...')

    await page.goto(expandedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })

    await page.waitForTimeout(5000)

    const currentUrl = page.url()

    console.log('Current URL:', currentUrl)

    const pageTitle = await page.title()

    const html = await page.content()

    // ----------------------------
    // COORDINATE EXTRACTION
    // ----------------------------

    let latitude: number | null = null
    let longitude: number | null = null

    // Method 1
    let match = currentUrl.match(
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/
    )

    if (match) {
      latitude = Number(match[1])
      longitude = Number(match[2])

      console.log(
        'Coordinates found via URL !3d!4d'
      )
    }

    // Method 2
    if (!latitude || !longitude) {
      match = currentUrl.match(
        /@(-?\d+\.\d+),(-?\d+\.\d+)/
      )

      if (match) {
        latitude = Number(match[1])
        longitude = Number(match[2])

        console.log(
          'Coordinates found via URL @lat,lng'
        )
      }
    }

    // Method 3
    if (!latitude || !longitude) {
      match = html.match(
        /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/
      )

      if (match) {
        latitude = Number(match[1])
        longitude = Number(match[2])

        console.log(
          'Coordinates found via HTML !3d!4d'
        )
      }
    }

    // Method 4
    if (!latitude || !longitude) {
      match = html.match(
        /@(-?\d+\.\d+),(-?\d+\.\d+)/
      )

      if (match) {
        latitude = Number(match[1])
        longitude = Number(match[2])

        console.log(
          'Coordinates found via HTML @lat,lng'
        )
      }
    }

    console.log('Latitude:', latitude)
    console.log('Longitude:', longitude)

    // ----------------------------
    // IMAGE EXTRACTION
    // ----------------------------

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

    console.log(
      'Google Images Found:',
      images.length
    )

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

    console.log('==============================')
    console.log('TITLE:', title)
    console.log('IMAGE FOUND:', !!image)
    console.log('LAT:', latitude)
    console.log('LNG:', longitude)
    console.log('==============================')

    return res.json({
      success: true,
      title,
      image,
      mapsUrl: currentUrl,
      expandedUrl,
      latitude,
      longitude,
      imageCount: images.length,
    })
  } catch (error) {
    console.error('==============================')
    console.error('SCRAPER ERROR')
    console.error(error)
    console.error('==============================')

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