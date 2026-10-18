<script lang="ts">
  import { onMount } from 'svelte';
  import 'maplibre-gl/dist/maplibre-gl.css';

  let mapContainer!: HTMLDivElement;
  let map: any;

  const esc = (v: unknown) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const pick = (row: any, names: string[]) => {
    const keys = Object.keys(row);
    for (const n of names) {
      const k = keys.find((key) => key.toLowerCase().trim() === n.toLowerCase());
      if (k !== undefined) return row[k];
    }
    return undefined;
  };

  const toRows = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (data?.type === 'FeatureCollection') {
      return data.features.map((f: any) => ({
        ...f.properties,
        Lon: f.geometry?.coordinates?.[0],
        Lat: f.geometry?.coordinates?.[1],
        geometry: f.geometry
      }));
    }
    if (Array.isArray(data?.features)) return data.features;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.result?.records)) return data.result.records;
    return [];
  };

  onMount(() => {
    let isMounted = true;

    import('maplibre-gl').then((module: any) => {
      if (!isMounted) return;
      const maplibregl = module.default || module;

      map = new maplibregl.Map({
        container: mapContainer,
        style: {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap Contributors'
            }
          },
          layers: [
            { id: 'osm-layer', type: 'raster', source: 'osm-tiles', minzoom: 0, maxzoom: 19 }
          ]
        },
        center: [-79.3832, 43.6532],
        zoom: 11
      });

      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      const init = async () => {
        try {
          const response = await fetch('/Fire_Station.geojson');
          if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
          }

          const raw = await response.json();
          const rows = toRows(raw);
          console.log('Rows loaded:', rows.length);

          if (!rows.length) {
            console.error('No rows found in fire station data.');
            return;
          }

          const features = rows
            .map((row: any) => {
              const lon = parseFloat(pick(row, ['Lon', 'Lng', 'Longitude', 'Long', 'X']));
              const lat = parseFloat(pick(row, ['Lat', 'Latitude', 'Y']));

              return {
                type: 'Feature' as const,
                geometry: row.geometry || {
                  type: 'Point' as const,
                  coordinates: [lon, lat]
                },
                properties: row
              };
            })
            .filter((f: any) => 
              f.geometry.type === 'Point' &&
              Number.isFinite(f.geometry.coordinates[0]) &&
              Number.isFinite(f.geometry.coordinates[1])
            );

          console.log(`Valid features: ${features.length} / ${rows.length}`);
          if (!features.length) {
            console.error('No valid coordinates found.');
            return;
          }

          map.addSource('fire-stations-data', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features }
          });

          map.addLayer({
            id: 'fire-stations-layer',
            type: 'circle',
            source: 'fire-stations-data',
            paint: {
              'circle-radius': 7,
              'circle-color': '#c0392b', // Fire engine red
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });

          const bounds = new maplibregl.LngLatBounds();
          features.forEach((f: any) => bounds.extend(f.geometry.coordinates));
          map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 0 });

          map.on('click', 'fire-stations-layer', (e: any) => {
            if (!e.features?.length) return;
            const props = e.features[0].properties;
            const coordinates = e.features[0].geometry.coordinates.slice();

            // Match properties from Toronto Open Data attributes
            const stationName = pick(props, ['STATION_NAME', 'CENTRE_NAME', 'Location Name', 'Name']) || 'Fire Station';
            const address = pick(props, ['ADDRESS', 'Address']) || 'Address unavailable';
            const phone = pick(props, ['PHONE', 'Phone']) || 'N/A';

            new maplibregl.Popup()
              .setLngLat(coordinates)
              .setHTML(`
                <div style="text-align: left; font-family: sans-serif; padding: 4px;">
                  <strong style="font-size: 1.1em; color: #c0392b;">🚒 ${esc(stationName)}</strong><br>
                  <span style="color: #555;">📍 ${esc(address)}</span><br>
                  <small><strong>Phone:</strong> ${esc(phone)}</small>
                </div>
              `)
              .addTo(map);
          });

          map.on('mouseenter', 'fire-stations-layer', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'fire-stations-layer', () => {
            map.getCanvas().style.cursor = '';
          });
        } catch (err) {
          console.error('Error loading fire station data:', err);
        }
      };

      if (map.loaded()) init();
      else map.once('load', init);
    });

    return () => {
      isMounted = false;
      if (map) map.remove();
    };
  });
</script>

<main class="page">
  <h1>Toronto Fire Station Locations</h1>
  <p>Interactive map showing active fire facilities across Toronto.</p>

  <div bind:this={mapContainer} class="map-container"></div>

  <div class="back-link">
    <a href="/">← Back to Home</a>
  </div>
</main>

<style>
  .page {
    max-width: 900px;
    margin: 2rem auto;
    padding: 1rem;
    font-family: sans-serif;
    text-align: center;
  }

  .map-container {
    width: 100%;
    height: 550px;
    border-radius: 8px;
    margin-top: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .back-link {
    margin-top: 1.5rem;
    text-align: left;
  }

  a {
    color: #c0392b;
    text-decoration: none;
    font-weight: bold;
  }

  a:hover {
    text-decoration: underline;
  }
</style>