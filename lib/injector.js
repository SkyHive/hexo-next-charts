/**
 * Chart Injector
 * Coordinates chart transformation and script injection
 * Simplified to focus on orchestration only
 */

const { resolvePath } = require('./utils/path_resolver');
const FrontendScriptBuilder = require('./frontend_script_builder');
const ChartRegistry = require('./chart_registry');
const AssetsManager = require('./assets_manager');

// Regex to find chart placeholders (Base64 encoded for safety)
const CHART_REGEX = /<div class="hexo-next-chart-placeholder" id="(echart-[^"]+)" data-chart="([^"]+)"/g;

/**
 * Parse chart placeholders from content
 * @param {string} content - HTML content
 * @returns {Array} Parsed chart data
 */
function parsePlaceholders(content) {
    const charts = [];
    let match;

    while ((match = CHART_REGEX.exec(content)) !== null) {
        const [, id, payloadBase64] = match;
        try {
            const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
            charts.push({ id, ...payload });
        } catch (e) {
            console.error('[hexo-next-charts] Failed to parse chart payload:', e);
        }
    }

    return charts;
}

/**
 * Resolve raw data for a chart
 * @param {object} data - Page/post data object
 * @param {object} chart - Chart configuration
 * @returns {any} Raw data
 */
function resolveChartData(data, chart) {
    let rawData = resolvePath(data, chart.source);

    // Fallback: check page property directly
    if (rawData === undefined && chart.source.startsWith('page.')) {
        rawData = resolvePath(data, chart.source.replace('page.', ''));
    }

    return rawData;
}

/**
 * Process chart data and collect map/geo information
 * @param {Array} charts - Chart configurations
 * @param {object} data - Page/post data
 * @param {GeoManager} geoManager - Geo manager instance
 * @returns {object} Processed script data and map types
 */
function processCharts(charts, data, geoManager) {
    const scriptData = {};
    const mapTypesNeeded = new Set();

    for (const chart of charts) {
        const rawData = resolveChartData(data, chart);

        try {
            const option = ChartRegistry.transform(chart.type, rawData, chart);

            if (option) {
                scriptData[chart.id] = option;

                // Collect map types and geo lookups
                if (chart.type === 'map') {
                    const mapType = chart.map || 'world';
                    mapTypesNeeded.add(mapType);
                    collectGeoLookups(option, geoManager);
                }
            }
        } catch (e) {
            console.error(`[hexo-next-charts] Failed to transform chart ${chart.id}:`, e.message);
        }
    }

    return { scriptData, mapTypesNeeded };
}

/**
 * Collect geo lookup registrations from option
 * @param {object} option - ECharts option
 * @param {GeoManager} geoManager - Geo manager instance
 */
function collectGeoLookups(option, geoManager) {
    if (!option.series || !geoManager) return;

    option.series.forEach(series => {
        if (series.data && series.coordinateSystem === 'geo') {
            series.data.forEach(point => {
                if (point._needsGeoLookup) {
                    if (point._code) geoManager.register(point._code);
                    if (point.name) geoManager.register(point.name);
                }
            });
        }
    });
}

/**
 * Extract resolved coordinates for page places
 * @param {object} scriptData - Chart options data
 * @param {GeoManager} geoManager - Geo manager instance
 * @returns {object} Page places with coordinates
 */
function extractPagePlaces(scriptData, geoManager) {
    const pagePlaces = {};

    if (!geoManager) return pagePlaces;

    Object.values(scriptData).forEach(option => {
        if (!option.series) return;

        option.series.forEach(series => {
            if (series.data && series.coordinateSystem === 'geo') {
                series.data.forEach(point => {
                    if (!point._needsGeoLookup) return;

                    const keys = [point._code, point.name].filter(k => k);
                    for (const key of keys) {
                        const resolved = geoManager.getResolved(key);
                        if (resolved && resolved.coords) {
                            pagePlaces[key] = resolved.coords;
                        }
                    }
                });
            }
        });
    });

    return pagePlaces;
}

/**
 * Ensure all required map data files are available
 * @param {Set} mapTypes - Required map types
 * @param {AssetsManager} assetsManager - Assets manager instance
 * @returns {Promise<object>} Map type to path mapping
 */
async function ensureMapData(mapTypes, assetsManager) {
    const mapDataPaths = {};

    for (const mapType of mapTypes) {
        const mapPath = await assetsManager.ensureMapData(mapType);
        if (mapPath) {
            mapDataPaths[mapType] = mapPath;
        }
    }

    return mapDataPaths;
}

/**
 * Main injector function
 * @param {object} data - Page/post data
 * @param {GeoManager} geoManager - Geo manager instance
 * @returns {Promise<object>} Modified data
 */
module.exports = async function(data, geoManager) {
    if (!data?.content?.includes('hexo-next-chart-placeholder')) {
        return data;
    }

    const charts = parsePlaceholders(data.content);
    if (charts.length === 0) {
        return data;
    }

    const assetsManager = new AssetsManager(this);

    // Process charts and collect data
    const { scriptData, mapTypesNeeded } = processCharts(charts, data, geoManager);

    // Resolve geo coordinates
    if (geoManager) {
        await geoManager.resolve();
    }

    // Extract resolved places
    const pagePlaces = extractPagePlaces(scriptData, geoManager);

    // Ensure map data files
    const mapDataPaths = await ensureMapData(mapTypesNeeded, assetsManager);

    // Generate and inject scripts
    const scriptBuilder = new FrontendScriptBuilder(this);
    const scripts = scriptBuilder.build(scriptData, pagePlaces, mapDataPaths);

    data.content += scripts;

    return data;
};
