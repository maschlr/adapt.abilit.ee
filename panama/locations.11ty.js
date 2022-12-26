class Locations {
  data() {
    return {
      permalink: 'panama/locations.json',
    }
  }

  render(data) {
    const result = []
    for (const location of data.locations) {
      // find all posts with the same location
      const posts = data.collections.panama.filter(
        (post) => post.data.location === location.name,
      )

      // add the posts title and url to the result for rendering on the map
      result.push(
        Object.assign(
          {
            posts: posts.map((post) => {
              return { url: post.url, title: post.data.title }
            }),
          },
          location,
        ),
      )
    }

    return JSON.stringify(result)
  }
}

module.exports = Locations
