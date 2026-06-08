const { MongoClient } = require('mongodb')

const MONGO_URI =
  'mongodb+srv://Aftab:ronaldo@cluster0.wnavt.mongodb.net/zehrana?retryWrites=true&w=majority&appName=Cluster0'

const SCRAPER_URL =
  'https://scrapper-image-title-production.up.railway.app/places/preview'

async function run() {
  const client = new MongoClient(MONGO_URI)

  await client.connect()

  const db = client.db('zehrana')

  const places = await db
    .collection('places')
    .find({
      $or: [
        { latitude: { $exists: false } },
        { longitude: { $exists: false } },
      ],
    })
    .toArray()

  console.log(
    `Found ${places.length} places to update`
  )

  for (const place of places) {
    try {
      console.log(
        `Processing: ${place.title}`
      )

      const response = await fetch(
        SCRAPER_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            url: place.mapsUrl,
          }),
        }
      )

      const data = await response.json()

      if (
        !data.latitude ||
        !data.longitude
      ) {
        console.log(
          `No coordinates found for ${place.title}`
        )
        continue
      }

      await db
        .collection('places')
        .updateOne(
          {
            _id: place._id,
          },
          {
            $set: {
              latitude: data.latitude,
              longitude: data.longitude,
            },
          }
        )

      console.log(
        `Updated ${place.title}`
      )

      // Be nice to Railway + Google
      await new Promise((resolve) =>
        setTimeout(resolve, 2000)
      )
    } catch (err) {
      console.error(
        `Failed ${place.title}`,
        err
      )
    }
  }

  console.log('Done')

  await client.close()
}

run()