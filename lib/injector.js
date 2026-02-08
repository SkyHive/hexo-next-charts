const path = require('path');
const fs = require('fs');
const AssetsManager = require('./assets_manager');

/**
 * Resolve a value from an object using a dot-notation path.
 */
function resolvePath(obj, path) {
    if (!path || !obj) return undefined;
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : undefined;
    }, obj);
}

module.exports = async function (data, geoManager) {
    if (!data || !data.content || !data.content.includes('hexo-next-chart-placeholder')) return data;

    // Regex to find our placeholders (Base64 encoded for safety)
    const chartRegex = /<div class="hexo-next-chart-placeholder" id="(echart-[^"]+)" data-chart="([^"]+)"/g;
    let match;
    let chartsFound = [];

    while ((match = chartRegex.exec(data.content)) !== null) {
        const [, id, payloadBase64] = match;
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

    // Collect cities to resolve
    chartsFound.forEach(chart => {
        // Resolve data from the page/post object
        let rawData = resolvePath(data, chart.source);

        // Fallback: if not found in data, check page property directly
        if (rawData === undefined && chart.source.startsWith('page.')) {
            rawData = resolvePath(data, chart.source.replace('page.', ''));
        }

        try {
            const transformerPath = path.join(__dirname, 'charts', `${chart.type}.js`);
            if (fs.existsSync(transformerPath)) {
                const transformer = require(transformerPath);
                // Pass title and other options to the transformer
                // transformer converts raw data to echarts option
                const option = transformer(rawData, chart);

                if (chart.type === 'map') {
                    const mapType = chart.map || 'world';
                    mapTypesNeeded.add(mapType);

                    // Extract cities that need lookup
                    if (option.series) {
                        option.series.forEach(series => {
                            if (series.data && series.coordinateSystem === 'geo') {
                                series.data.forEach(point => {
                                    if (point._needsGeoLookup) {
                                        // Add to GeoManager
                                        if (point._code) geoManager.register(point._code);
                                        if (point.name) geoManager.register(point.name);
                                    }
                                });
                            }
                        });
                    }
                }

                scriptData[chart.id] = option;
            }
        } catch (e) {
            console.error(`[hexo-next-charts] Failed to transform chart ${chart.id}:`, e);
        }
    });

    // Resolve all needed cities
    if (geoManager) {
        await geoManager.resolve();
    }

    // Extract resolved coordinates for this page
    const pagePlaces = {};
    Object.values(scriptData).forEach(option => {
        if (option.series) {
            option.series.forEach(series => {
                if (series.data && series.coordinateSystem === 'geo') {
                    series.data.forEach(point => {
                        if (point._needsGeoLookup) {
                            const keys = [point._code, point.name].filter(k => k);
                            for (const key of keys) {
                                const resolved = geoManager ? geoManager.getResolved(key) : null;
                                if (resolved && resolved.coords) {
                                    pagePlaces[key] = resolved.coords;
                                }
                            }
                        }
                    });
                }
            });
        }
    });

    // Ensure map GeoJSON files are available
    const mapDataPaths = {};
    for (const mapType of mapTypesNeeded) {
        const mapPath = await assetsManager.ensureMapData(mapType);
        if (mapPath) {
            mapDataPaths[mapType] = mapPath;
        }
    }

    // Inject initialization data
    const configScript = `
    <script>
      window.HEXO_NEXT_CHARTS_DATA = window.HEXO_NEXT_CHARTS_DATA || {};
      Object.assign(window.HEXO_NEXT_CHARTS_DATA, ${JSON.stringify(scriptData)});
      window.HEXO_NEXT_CHARTS_DATA.places = Object.assign(window.HEXO_NEXT_CHARTS_DATA.places || {}, ${JSON.stringify(pagePlaces)});
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
      const loadedMaps = new Set();
      
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
            return feature.properties.cp;
          }

          // Fallback: calculate centroid from geometry
          if (feature && feature.geometry && feature.geometry.coordinates) {
             console.warn('[Charts] Calculating centroid client-side for (should be avoided):', name);
             // ... simplified centroid code removed to save bytes ... 
          }
        } catch (e) {
          console.warn('[Charts] Failed to resolve coordinates for:', name, e);
        }
        return null;
      }

      // Look up in injected places data
      function resolveInlinedPlace(key) {
          const places = window.HEXO_NEXT_CHARTS_DATA.places || {};
          return places[key] || null;
      }

      async function initCharts() {
        if (typeof echarts === 'undefined') {
          setTimeout(initCharts, 100);
          return;
        }

        for (const [mapType, mapPath] of Object.entries(mapDataPaths)) {
          await ensureMapLoaded(mapType, mapPath);
        }

        const data = window.HEXO_NEXT_CHARTS_DATA || {};
        const theme = getTheme();
        
          for (const id in data) {
          if (id === 'places') continue; // skip places object
          const option = data[id];

          // Apply special styling for China Border if present
          if (option.geo) {
              const geos = Array.isArray(option.geo) ? option.geo : [option.geo];
              geos.forEach(g => {
                  if (g.map === 'world-cn') {
                      g.regions = g.regions || [];
                      g.regions.push({
                          name: 'China_Border',
                          itemStyle: {
                              areaColor: 'rgba(0,0,0,0)',
                              borderColor: '#333',
                              borderWidth: 1.0,
                              zIndex: 100 // Ensure it draws on top
                          },
                          label: { show: false },
                          silent: true, // Make it pass mouse events to provinces below
                          emphasis: {
                              disabled: true, // No hover effect
                              itemStyle: {
                                  areaColor: 'rgba(0,0,0,0)',
                                  borderColor: '#333',
                                  borderWidth: 1.0
                              }
                          },
                          select: {
                              disabled: true
                          },
                          tooltip: {
                              show: false
                          }
                      });
                  }
              });
          }

          // Resolve geo coordinates for map charts
          if (option.series) {
            option.series.forEach(series => {
              if (series.data && series.coordinateSystem === 'geo') {
                series.data = series.data.filter(point => {
                  if (point._needsGeoLookup) {
                    const mapName = Array.isArray(option.geo) ? option.geo[0].map : (option.geo ? option.geo.map : 'world');
                    
                    // 1. Try Inlined/Pre-resolved Places (Fastest)
                    let coords = resolveInlinedPlace(point._code) || resolveInlinedPlace(point.name);
                    
                    // 2. Try Standard GeoJSON lookup (Client-side Fallback)
                    if (!coords) {
                       coords = resolveGeoCoordinates(point.name, mapName) || resolveGeoCoordinates(point._code, mapName);
                    }

                    if (coords) {
                      point.value[0] = coords[0];
                      point.value[1] = coords[1];
                      if (point._label) {
                          point.name = point._label;
                      }
                      delete point._needsGeoLookup;
                      delete point._label;
                      return true;
                    } else {
                      console.warn('[Charts] Coord not found:', point.name);
                      return false; 
                    }
                  }
                  return true; 
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

            // Handle Zoom Scaling for Scatter Points
            const getInitialZoom = (opt) => {
              if (!opt.geo) return 1;
              return Array.isArray(opt.geo) ? (opt.geo[0].zoom || 1) : (opt.geo.zoom || 1);
            };
            const initialZoom = getInitialZoom(option);

            const updateSymbolSizes = () => {
              const currentOption = chart.getOption();
              if (!currentOption.geo || !currentOption.geo[0]) return;
              
              const currentZoom = currentOption.geo[0].zoom;
              const scale = currentZoom / initialZoom;

              const newSeries = currentOption.series.map((s, idx) => {
                  const originalSeries = option.series[idx];
                  if (!originalSeries || (s.type !== 'scatter' && s.type !== 'effectScatter')) return s;
                  
                  const baseSize = originalSeries.symbolSize || 4;
                  return {
                      ...s,
                      symbolSize: Math.max(2, baseSize * Math.sqrt(scale))
                  };
              });
              chart.setOption({ series: newSeries });
            };

            chart.on('georoam', updateSymbolSizes);
            chart.on('restore', () => {
                setTimeout(updateSymbolSizes, 100); // Wait for restore to apply
            });

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
