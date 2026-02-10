/**
 * Frontend Script Builder
 * Generates frontend runtime scripts for chart initialization
 */

class FrontendScriptBuilder {
    constructor(hexo) {
        this.hexo = hexo;
    }

    /**
     * Build the configuration script that injects chart data
     * @param {object} scriptData - Chart options data
     * @param {object} pagePlaces - Resolved place coordinates
     * @returns {string} HTML script tag
     */
    buildConfigScript(scriptData, pagePlaces) {
        const dataJson = JSON.stringify(scriptData);
        const placesJson = JSON.stringify(pagePlaces);

        return `
<script>
  window.HEXO_NEXT_CHARTS_DATA = window.HEXO_NEXT_CHARTS_DATA || {};
  Object.assign(window.HEXO_NEXT_CHARTS_DATA, ${dataJson});
  window.HEXO_NEXT_CHARTS_DATA.places = Object.assign(window.HEXO_NEXT_CHARTS_DATA.places || {}, ${placesJson});
</script>`;
    }

    /**
     * Build the loader script that initializes ECharts
     * @param {object} mapDataPaths - Map type to path mapping
     * @returns {string} HTML script tags
     */
    buildLoaderScript(mapDataPaths) {
        const echartsUrl = 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js';
        const mapDataPathsJson = JSON.stringify(mapDataPaths);

        return `
<script src="${echartsUrl}"></script>
<script>
(function() {
    const mapDataPaths = ${mapDataPathsJson};
    const charts = {};
    const loadedMaps = new Set();

    // CDN fallback for common maps
    const cdnFallback = {
        'world': 'https://cdn.jsdelivr.net/npm/echarts/map/js/world.js',
        'china': 'https://cdn.jsdelivr.net/npm/echarts/map/js/china.js'
    };

    function getTheme() {
        return document.documentElement.getAttribute('data-theme') ||
               (document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light');
    }

    // Load map data
    async function ensureMapLoaded(mapType, mapPath) {
        if (loadedMaps.has(mapType)) return true;

        // Handle composite maps
        if (mapPath && mapPath.composite) {
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
                    return true;
                }
            } catch (e) {
                // Fallback to CDN
            }
        }

        // Fallback to CDN
        if (cdnFallback[mapType]) {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = cdnFallback[mapType];
                script.onload = () => {
                    loadedMaps.add(mapType);
                    resolve(true);
                };
                script.onerror = () => resolve(false);
                document.head.appendChild(script);
            });
        }

        return false;
    }

    // Resolve coordinates from GeoJSON
    function resolveGeoCoordinates(name, mapName) {
        try {
            const geoData = echarts.getMap(mapName);
            if (!geoData || !geoData.geoJSON) return null;

            const features = geoData.geoJSON.features || [];

            // Try exact match
            let feature = features.find(f =>
                f.properties && (
                    f.properties.name === name ||
                    f.properties.NAME === name ||
                    f.properties.name_zh === name ||
                    f.properties.name_en === name
                )
            );

            // Try case-insensitive
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
        } catch (e) {
            // Ignore errors
        }
        return null;
    }

    // Get pre-resolved place coordinates
    function resolveInlinedPlace(key) {
        const places = window.HEXO_NEXT_CHARTS_DATA.places || {};
        return places[key] || null;
    }

    // Initialize all charts
    async function initCharts() {
        if (typeof echarts === 'undefined') {
            setTimeout(initCharts, 100);
            return;
        }

        // Load required maps
        for (const [mapType, mapPath] of Object.entries(mapDataPaths)) {
            await ensureMapLoaded(mapType, mapPath);
        }

        const data = window.HEXO_NEXT_CHARTS_DATA || {};
        const theme = getTheme();

        for (const id in data) {
            if (id === 'places') continue;
            const option = data[id];

            // Process geo options
            if (option.geo) {
                processGeoOptions(option);
            }

            // Resolve coordinates for map charts
            if (option.series) {
                resolveSeriesCoordinates(option);
            }

            // Create chart instance
            createChartInstance(id, option, theme);
        }
    }

    // Process geo-specific options
    function processGeoOptions(option) {
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
                        zIndex: 100
                    },
                    label: { show: false },
                    silent: true,
                    emphasis: { disabled: true },
                    select: { disabled: true },
                    tooltip: { show: false }
                });
            }
        });
    }

    // Resolve coordinates in series data
    function resolveSeriesCoordinates(option) {
        option.series.forEach(series => {
            if (series.data && series.coordinateSystem === 'geo') {
                series.data = series.data.filter(point => {
                    if (!point._needsGeoLookup) return true;

                    const mapName = Array.isArray(option.geo)
                        ? option.geo[0].map
                        : (option.geo ? option.geo.map : 'world');

                    // Try pre-resolved first
                    let coords = resolveInlinedPlace(point._code) ||
                                 resolveInlinedPlace(point.name);

                    // Fallback to GeoJSON lookup
                    if (!coords) {
                        coords = resolveGeoCoordinates(point.name, mapName) ||
                                 resolveGeoCoordinates(point._code, mapName);
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
                    }

                    return false;
                });
            }
        });
    }

    // Create and configure a chart instance
    function createChartInstance(id, option, theme) {
        const container = document.getElementById(id);
        if (!container) return;

        if (charts[id]) {
            charts[id].dispose();
        }

        const chart = echarts.init(container, theme === 'dark' ? 'dark' : null);
        chart.setOption(option);
        charts[id] = chart;

        // Setup zoom scaling for scatter points
        setupZoomScaling(chart, option);

        // Handle resize
        window.addEventListener('resize', () => chart.resize());
    }

    // Setup zoom scaling for symbol sizes
    function setupZoomScaling(chart, option) {
        const getInitialZoom = (opt) => {
            if (!opt.geo) return 1;
            return Array.isArray(opt.geo)
                ? (opt.geo[0].zoom || 1)
                : (opt.geo.zoom || 1);
        };

        const initialZoom = getInitialZoom(option);

        const updateSymbolSizes = () => {
            const currentOption = chart.getOption();
            if (!currentOption.geo || !currentOption.geo[0]) return;

            const currentZoom = currentOption.geo[0].zoom;
            const scale = currentZoom / initialZoom;

            const newSeries = currentOption.series.map((s, idx) => {
                const originalSeries = option.series[idx];
                if (!originalSeries ||
                    (s.type !== 'scatter' && s.type !== 'effectScatter')) {
                    return s;
                }

                const baseSize = originalSeries.symbolSize || 4;
                return {
                    ...s,
                    symbolSize: Math.max(2, baseSize * Math.sqrt(scale))
                };
            });

            chart.setOption({ series: newSeries });
        };

        chart.on('georoam', updateSymbolSizes);
        chart.on('restore', () => setTimeout(updateSymbolSizes, 100));
    }

    // Observe theme changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' &&
                (mutation.attributeName === 'data-theme' ||
                 mutation.attributeName === 'class')) {
                initCharts();
            }
        });
    });

    observer.observe(document.documentElement, { attributes: true });

    // Initialize on load
    if (document.readyState === 'complete') {
        initCharts();
    } else {
        window.addEventListener('load', initCharts);
    }
})();
</script>`;
    }

    /**
     * Build complete frontend scripts
     * @param {object} scriptData - Chart options data
     * @param {object} pagePlaces - Resolved place coordinates
     * @param {object} mapDataPaths - Map type to path mapping
     * @returns {string} Complete HTML scripts
     */
    build(scriptData, pagePlaces, mapDataPaths) {
        const configScript = this.buildConfigScript(scriptData, pagePlaces);
        const loaderScript = this.buildLoaderScript(mapDataPaths);

        return configScript + loaderScript;
    }
}

module.exports = FrontendScriptBuilder;
