const util = require('./util');
const path = require('path');
const fs = require('fs');
const AssetsManager = require('./assets_manager');

module.exports = async function(data) {
  if (!data || !data.content || !data.content.includes('hexo-next-chart-placeholder')) return data;
  
  // Regex to find our placeholders (Base64 encoded for safety)
  const chartRegex = /<div class="hexo-next-chart-placeholder" id="(echart-[^"]+)" data-chart="([^"]+)"/g;
  let match;
  let chartsFound = [];

  while ((match = chartRegex.exec(data.content)) !== null) {
    const [fullMatch, id, payloadBase64] = match;
    try {
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
      chartsFound.push({ id, ...payload });
    } catch (e) {
      console.error('[hexo-next-charts] Failed to parse chart payload:', e);
    }
  }

  if (chartsFound.length === 0) return data;

  let scriptData = {};
  let mapTypesNeeded = new Set();
  const assetsManager = new AssetsManager(this);

  chartsFound.forEach(chart => {
    if (chart.type === 'map') {
      const mapType = chart.map || 'world';
      mapTypesNeeded.add(mapType);
    }

    // Resolve data from the page/post object
    let rawData = util.resolvePath(data, chart.source);
    
    // Fallback: if not found in data, check page property directly
    if (rawData === undefined && chart.source.startsWith('page.')) {
        rawData = util.resolvePath(data, chart.source.replace('page.', ''));
    }

    try {
      const transformerPath = path.join(__dirname, 'charts', `${chart.type}.js`);
      if (fs.existsSync(transformerPath)) {
        const transformer = require(transformerPath);
        // Pass title and other options to the transformer
        const option = transformer(rawData, chart);
        scriptData[chart.id] = option;
      }
    } catch (e) {
      console.error(`[hexo-next-charts] Failed to transform chart ${chart.id}:`, e);
    }
  });

  // Ensure map GeoJSON files and places mapping are available
  const mapDataPaths = {};
  for (const mapType of mapTypesNeeded) {
    const mapPath = await assetsManager.ensureMapData(mapType);
    if (mapPath) {
      mapDataPaths[mapType] = mapPath;
    }
  }
  const placesPath = await assetsManager.ensureMapData('places');

  // Inject initialization data
  const configScript = `
    <script>
      window.HEXO_NEXT_CHARTS_DATA = window.HEXO_NEXT_CHARTS_DATA || {};
      Object.assign(window.HEXO_NEXT_CHARTS_DATA, ${JSON.stringify(scriptData)});
    </script>
  `;

  // Inject required resources (ECharts + our loader)
  const echartsUrl = 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';
  
  const loaderScript = `
    <script src="${echartsUrl}"></script>
    <script>
    (function() {
      let charts = {};
      const mapDataPaths = ${JSON.stringify(mapDataPaths)};
      const placesPath = ${JSON.stringify(placesPath)};
      const loadedMaps = new Set();
      let customPlaces = {};
      const defaultPlaces = {
          "CN SHA": [121.47, 31.23], "CN HGH": [120.15, 30.27], "CN PEK": [116.40, 39.90],
          "CN SZX": [114.05, 22.54], "CN HKG": [114.16, 22.31], "SG SIN": [103.81, 1.35],
          "MY PEN": [100.33, 5.41], "JP TYO": [139.69, 35.68], "KR SEL": [126.97, 37.56]
      };

      function getTheme() {
        return document.documentElement.getAttribute('data-theme') || 
               (document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light');
      }

      // Dynamic map loader with CDN fallback
      async function ensureMapLoaded(mapType, mapPath) {
        if (loadedMaps.has(mapType)) return true;

        const cdnFallback = {
          'world': 'https://cdn.jsdelivr.net/npm/echarts/map/js/world.js',
          'china': 'https://cdn.jsdelivr.net/npm/echarts/map/js/china.js'
        };

        // Handle composite maps (like world-cn)
        if (mapPath && mapPath.composite) {
          console.log('[Charts] Loading composite map:', mapType);
          for (const [subType, subPath] of Object.entries(mapPath.maps)) {
            await ensureMapLoaded(subType, subPath);
          }
          loadedMaps.add(mapType);
          return true;
        }

        // Try local GeoJSON first
        if (mapPath && typeof mapPath === 'string') {
          try {
            const response = await fetch(mapPath);
            if (response.ok) {
              const geoJson = await response.json();
              echarts.registerMap(mapType, geoJson);
              loadedMaps.add(mapType);
              console.log('[Charts] Loaded custom map:', mapType);
              return true;
            }
          } catch (e) {
            console.warn('[Charts] Failed to load custom map, falling back to CDN:', e);
          }
        }

        // Fallback to CDN
        if (cdnFallback[mapType]) {
          return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = cdnFallback[mapType];
            script.onload = () => {
              loadedMaps.add(mapType);
              console.log('[Charts] Loaded CDN map:', mapType);
              resolve(true);
            };
            script.onerror = () => {
              console.error('[Charts] Failed to load map:', mapType);
              resolve(false);
            };
            document.head.appendChild(script);
          });
        }

        return false;
      }

      async function ensurePlacesLoaded() {
        if (!placesPath) return;
        try {
          const response = await fetch(placesPath);
          if (response.ok) {
            customPlaces = await response.json();
            console.log('[Charts] Loaded custom places mapping');
          }
        } catch (e) {
          console.warn('[Charts] Failed to load custom places mapping:', e);
        }
      }

      // Resolve coordinates from loaded geo data
      function resolveGeoCoordinates(name, mapName) {
        try {
          const geoData = echarts.getMap(mapName);
          if (!geoData || !geoData.geoJSON) return null;

          const features = geoData.geoJSON.features || [];
          
          // Try exact match first
          let feature = features.find(f => 
            f.properties && (
              f.properties.name === name ||
              f.properties.NAME === name ||
              f.properties.name_zh === name ||
              f.properties.name_en === name
            )
          );

          // Try case-insensitive match
          if (!feature) {
            const lowerName = name.toLowerCase();
            feature = features.find(f => 
              f.properties && (
                (f.properties.name || '').toLowerCase() === lowerName ||
                (f.properties.NAME || '').toLowerCase() === lowerName ||
                (f.properties.name_zh || '').toLowerCase() === lowerName ||
                (f.properties.name_en || '').toLowerCase() === lowerName
              )
            );
          }

          if (feature && feature.properties && feature.properties.cp) {
            // cp is center point [lng, lat]
            return feature.properties.cp;
          }

          // Fallback: calculate centroid from geometry
          if (feature && feature.geometry) {
            const coords = feature.geometry.coordinates;
            if (coords && coords[0]) {
              // Simplified centroid calculation
              let sumLng = 0, sumLat = 0, count = 0;
              const flattenCoords = (arr) => {
                arr.forEach(item => {
                  if (Array.isArray(item[0])) {
                    flattenCoords(item);
                  } else {
                    sumLng += item[0];
                    sumLat += item[1];
                    count++;
                  }
                });
              };
              flattenCoords(coords);
              if (count > 0) return [sumLng / count, sumLat / count];
            }
          }
        } catch (e) {
          console.warn('[Charts] Failed to resolve coordinates for:', name, e);
        }
        return null;
      }

      function resolveCustomCoordinate(name, code) {
        return (code && customPlaces[code]) || (name && customPlaces[name]) || 
               (code && defaultPlaces[code]) || (name && defaultPlaces[name]) || null;
      }

      async function initCharts() {
        if (typeof echarts === 'undefined') {
          setTimeout(initCharts, 100);
          return;
        }

        // Pre-load all required maps and places
        await ensurePlacesLoaded();
        for (const [mapType, mapPath] of Object.entries(mapDataPaths)) {
          await ensureMapLoaded(mapType, mapPath);
        }

        const data = window.HEXO_NEXT_CHARTS_DATA || {};
        const theme = getTheme();
        
        for (const id in data) {
          const option = data[id];

          // Resolve geo coordinates for map charts
          if (option.series) {
            option.series.forEach(series => {
              if (series.data && series.coordinateSystem === 'geo') {
                // Filter out points that could not be resolved
                series.data = series.data.filter(point => {
                  if (point._needsGeoLookup) {
                    // Try to find coordinates from custom places first
                    const mapName = Array.isArray(option.geo) ? option.geo[0].map : (option.geo ? option.geo.map : 'world');
                    let coords = resolveCustomCoordinate(point.name, point._code);
                    
                    // If not found, try to find from the map GeoJSON (by name or code)
                    if (!coords) {
                      coords = resolveGeoCoordinates(point.name, mapName) || resolveGeoCoordinates(point._code, mapName);
                    }
                    
                    // If still not found in primary map, try china map for world-cn
                    if (!coords && Array.isArray(option.geo) && option.geo.length > 1) {
                      coords = resolveGeoCoordinates(point.name, option.geo[1].map) || resolveGeoCoordinates(point._code, option.geo[1].map);
                    }

                    if (coords) {
                      point.value[0] = coords[0];
                      point.value[1] = coords[1];
                      delete point._needsGeoLookup;
                      return true;
                    } else {
                      console.warn('[Charts] Could not resolve coordinates for:', point.name, point._code);
                      return false; // Remove unresolved point
                    }
                  }
                  return true; // Keep already resolved points
                });
              }
            });
          }

          const container = document.getElementById(id);
          if (container) {
            if (charts[id]) {
               charts[id].dispose();
            }
            const chart = echarts.init(container, theme === 'dark' ? 'dark' : null);
            chart.setOption(option);
            charts[id] = chart;
            window.addEventListener('resize', () => chart.resize());
          }
        }
      }

      // Observe theme changes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class')) {
            initCharts();
          }
        });
      });
      observer.observe(document.documentElement, { attributes: true });

      if (document.readyState === 'complete') initCharts();
      else window.addEventListener('load', initCharts);
    })();
    </script>
  `;

  data.content += configScript + loaderScript;

  return data;
};
