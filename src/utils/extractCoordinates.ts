export async function extractCoordinates(
  currentUrl: string,
  html: string,
  pageTitle: string,
  page: any
) {
  let latitude: number | null = null
  let longitude: number | null = null

  console.log('Trying to find coordinates...')

  // Method 1
  let match = currentUrl.match(
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/
  )

  if (match) {
    latitude = Number(match[1])
    longitude = Number(match[2])

    console.log(
      '✓ Coordinates found via URL !3d!4d'
    )
  }

  // Method 2
  if (latitude === null || longitude === null) {
    match = currentUrl.match(
      /@(-?\d+\.\d+),(-?\d+\.\d+)/
    )

    if (match) {
      latitude = Number(match[1])
      longitude = Number(match[2])

      console.log(
        '✓ Coordinates found via URL @lat,lng'
      )
    }
  }

  // Method 3
  if (latitude === null || longitude === null) {
    match = html.match(
      /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/
    )

    if (match) {
      latitude = Number(match[1])
      longitude = Number(match[2])

      console.log(
        '✓ Coordinates found via HTML !3d!4d'
      )
    }
  }

  // Method 4
  if (latitude === null || longitude === null) {
    match = html.match(
      /@(-?\d+\.\d+),(-?\d+\.\d+)/
    )

    if (match) {
      latitude = Number(match[1])
      longitude = Number(match[2])

      console.log(
        '✓ Coordinates found via HTML @lat,lng'
      )
    }
  }

  // Method 5
  if (latitude === null || longitude === null) {
    const genericMatches =
      html.matchAll(
        /(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/g
      )

    for (const coord of genericMatches) {
      const lat = Number(coord[1])
      const lng = Number(coord[2])

      if (
        lat >= 10 &&
        lat <= 20 &&
        lng >= 70 &&
        lng <= 80
      ) {
        latitude = lat
        longitude = lng

        console.log(
          '✓ Coordinates found via generic HTML match'
        )

        break
      }
    }
  }

  // Method 6
  if (latitude === null || longitude === null) {
    try {
      const scripts =
        await page.evaluate(() =>
          Array.from(document.scripts)
            .map(
              (s) => s.textContent || ''
            )
            .join('\n')
        )

      const scriptMatch =
        scripts.match(
          /(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/
        )

      if (scriptMatch) {
        const lat = Number(
          scriptMatch[1]
        )

        const lng = Number(
          scriptMatch[2]
        )

        if (
          lat >= 10 &&
          lat <= 20 &&
          lng >= 70 &&
          lng <= 80
        ) {
          latitude = lat
          longitude = lng

          console.log(
            '✓ Coordinates found via script data'
          )
        }
      }
    } catch {
      console.log(
        'Script lookup failed'
      )
    }
  }

  // Method 7 - OSM fallback
  if (latitude === null || longitude === null) {
    try {
      console.log(
        'Trying OpenStreetMap fallback...'
      )

      const cleanTitle =
        pageTitle.replace(
          ' - Google Maps',
          ''
        )

      const geoResponse =
        await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            cleanTitle
          )}&format=json&limit=1`,
          {
            headers: {
              'User-Agent':
                'Goa2026/1.0',
            },
          }
        )

      const geoData =
        await geoResponse.json()

      if (
        Array.isArray(geoData) &&
        geoData.length > 0
      ) {
        latitude = Number(
          geoData[0].lat
        )

        longitude = Number(
          geoData[0].lon
        )

        console.log(
          '✓ Coordinates found via OpenStreetMap'
        )
      }
    } catch {
      console.log(
        'OpenStreetMap lookup failed'
      )
    }
  }

  return {
    latitude,
    longitude,
  }
}