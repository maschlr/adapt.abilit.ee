document.addEventListener('DOMContentLoaded', getLocations, false)

function getLocations() {
  fetch('locations.json')
    .then((response) => response.json())
    .then((locations) => initMap(locations))
}

function getBounds(arrayOfLngLat) {
  // returns a pair of coordinates: most southwest and most northeast
  // south/north: smallest/biggest lat
  // west/east: smallest/biggest lon

  if (arrayOfLngLat.length < 2) {
    return
  }

  const { lng, lat } = arrayOfLngLat[0]
  let south = lat
  let north = lat
  let west = lng
  let east = lng

  for (const location of arrayOfLngLat.slice(1)) {
    east = location.lng > east ? location.lng : east
    west = location.lng < west ? location.lng : west
    south = location.lat < south ? location.lat : south
    north = location.lat > north ? location.lat : north
  }

  // enlarge bounds by x in each direction
  const zoomRatio = 0.4
  const dEastWest = east - west
  const dNorthSouth = north - south
  east = east + dEastWest * zoomRatio
  west = west - dEastWest * zoomRatio
  south = south - dNorthSouth * zoomRatio
  north = north + dNorthSouth * zoomRatio

  return [new mapboxgl.LngLat(west, south), new mapboxgl.LngLat(east, north)]
}

function getGeoJsonObject(locations) {
  return {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: locations.map((location, id) => {
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
          },
          properties: {
            title: location.name.includes(',')
              ? location.name.split(',')[0]
              : location.name,
            posts:
              '<ul>' +
              location.posts
                .map(
                  (post) => `<li><a href="${post.url}">${post.title}</a></li>`,
                )
                .join('') +
              '</ul>',
          },
          id
        }
      }),
    },
  }
}

function initMap(locations) {
  mapboxgl.accessToken =
    'pk.eyJ1IjoibXNjaGx1ZXQiLCJhIjoiY2xjNTU4aTl2MmtxcjNucGp6YXY2dWRycSJ9.ZC7LhDQ4dntF3sQD_iZc3g'
  let hoveredStateId = null
  const lngLatArray = locations.map(
    ({ longitude, latitude }) => new mapboxgl.LngLat(longitude, latitude),
  )
  const bounds = new mapboxgl.LngLatBounds(...getBounds(lngLatArray))

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    bounds,
  })

  map.on('load', () => {
    map.addSource('locations', getGeoJsonObject(locations))

    map.addLayer({
      id: 'locations-marker',
      type: 'circle',
      source: 'locations',
      paint: {
        'circle-stroke-color': '#000',
        'circle-stroke-width': 1,
        'circle-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          '#90ee90', // lightgreen when hover
          '#228b22', // darkgreen normal
        ],
      },
    })

    map.addLayer({
      id: 'locations-text',
      type: 'symbol',
      source: 'locations',
      layout: {
        // get the title name from the source's "title" property
        'text-field': ['get', 'title'],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-offset': [0, 0.75],
        'text-anchor': 'top',
        'text-size': 12,
      },
    })
  })

  map.on('click', (event) => {
    const features = map.queryRenderedFeatures(event.point, {
      layers: ['locations-marker'],
    })
    if (!features.length) {
      return
    }
    const feature = features[0]

    const popup = new mapboxgl.Popup({ offset: [0, -15] })
      .setLngLat(feature.geometry.coordinates)
      .setHTML(feature.properties.posts)
      .addTo(map)
  })

  // When the user moves their mouse over the locations-marker layer, we'll update the
  // feature state for the feature under the mouse.
  const setHover = (hover) => map.setFeatureState(
        { source: 'locations', id: hoveredStateId },
        { hover },
      )
  map.on('mousemove', 'locations-marker', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    if (e.features.length > 0) {
      if (hoveredStateId !== null) {
        setHover(false)
      }
      hoveredStateId = e.features[0].id
      setHover(true)
    }
  })

  // When the mouse leaves the locations-marker layer, update the feature state of the
  // previously hovered feature.
  map.on('mouseleave', 'locations-marker', () => {
    if (hoveredStateId !== null) {
      setHover(false)
    }
    hoveredStateId = null
    map.getCanvas().style.cursor = '';
  })
}
