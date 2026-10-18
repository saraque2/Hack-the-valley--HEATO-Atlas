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
        Lat: f.geometry?.coordinates?.[1]
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
          const response = await fetch('/a.json');
          if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
          }

          const raw = await response.json();
          const rows = toRows(raw);
          console.log('Raw type:', Array.isArray(raw) ? 'array' : typeof raw, '| rows:', rows.length);
          console.log('First row:', rows[0]);

          if (!rows.length) {
            console.error('No rows found. Top-level keys:', Object.keys(raw ?? {}));
            return;
          }

          const features = rows
            .map((row: any) => ({
              type: 'Feature' as const,
              geometry: {
                type: 'Point' as const,
                coordinates: [
                  parseFloat(pick(row, ['Lon', 'Lng', 'Longitude', 'Long', 'X'])),
                  parseFloat(pick(row, ['Lat', 'Latitude', 'Y']))
                ]
              },
              properties: row
            }))
            .filter(
              (f: any) =>
                Number.isFinite(f.geometry.coordinates[0]) &&
                Number.isFinite(f.geometry.coordinates[1])
            );

          console.log(`Valid features: ${features.length} / ${rows.length}`);
          if (!features.length) {
            console.error('No valid coordinates. Check the Lat/Lon key names in the first row above.');
            return;
          }

          map.addSource('cooling-centres-data', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features }
          });

          map.addLayer({
            id: 'cooling-centres-layer',
            type: 'circle',
            source: 'cooling-centres-data',
            paint: {
              'circle-radius': 8,
              'circle-color': '#008080',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff'
            }
          });

          // Zoom to fit all pins
          const bounds = new maplibregl.LngLatBounds();
          features.forEach((f: any) => bounds.extend(f.geometry.coordinates));
          map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 0 });

          map.on('click', 'cooling-centres-layer', (e: any) => {
            if (!e.features?.length) return;
            const props = e.features[0].properties;
            const coordinates = e.features[0].geometry.coordinates.slice();

            new maplibregl.Popup()
              .setLngLat(coordinates)
              .setHTML(`
                <div style="text-align: left; font-family: sans-serif; padding: 4px;">
                  <strong style="font-size: 1.1em; color: #008080;">${esc(props['Location Name'])}</strong><br>
                  <span style="color: #555;">📍 ${esc(props.Address)}</span><br>
                  <small><strong>Type:</strong> ${esc(props['Location desc'])}</small><br>
                  <small><strong>Phone:</strong> ${esc(props.Phone)}</small>
                </div>
              `)
              .addTo(map);
          });

          map.on('mouseenter', 'cooling-centres-layer', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'cooling-centres-layer', () => {
            map.getCanvas().style.cursor = '';
          });
        } catch (err) {
          console.error('Error loading cooling centre data:', err);
        }
      };

      // Works whether or not the style has already finished loading
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
  <h1>Toronto Air-Conditioned Public Places & Cooling Centres</h1>
  <p>Interactive map of public facilities and designated spaces during heat emergencies.</p>

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
    color: #008080;
    text-decoration: none;
    font-weight: bold;
  }

  a:hover {
    text-decoration: underline;
  }
</style>