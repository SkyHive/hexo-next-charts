/**
 * Map Chart Transformer
 * Renders location data on geographic maps
 * Coordinates are automatically resolved from ECharts geo data in the frontend
 */

const BaseTransformer = require('./base');

class MapTransformer extends BaseTransformer {
    /**
     * Get default configuration for map charts
     * @returns {object}
     */
    getDefaultConfig() {
        return {
            backgroundColor: 'transparent',
            map: 'world',
            center: null, // Will be set based on map type
            zoom: null,   // Will be set based on map type
            symbolSize: 6,
            color: '#ff5722'
        };
    }

    /**
     * Validate input data
     * @param {*} data - Input data
     * @returns {object}
     */
    validate(data) {
        if (!Array.isArray(data)) {
            return { valid: false, error: 'Map data must be an array' };
        }
        return { valid: true };
    }

    /**
     * Transform data to ECharts option
     * @param {Array} data - Array of location data
     * @returns {object} ECharts option
     */
    transform(data) {
        const validation = this.validate(data);
        if (!validation.valid) {
            return {};
        }

        const config = this.mergeConfig(this.config);
        const mapType = config.map || 'world';

        // Process data points
        const { normalPoints, effectPoints } = this.processDataPoints(data);

        // Build base option
        const option = {
            backgroundColor: config.backgroundColor,
            tooltip: this.buildTooltip('item'),
            toolbox: this.buildToolbox(),
            graphic: this.buildGraphic([{
                type: 'text',
                left: '10',
                bottom: '10',
                z: 100,
                style: {
                    text: '💡 鼠标滚轮缩放，拖拽移动',
                    font: '12px sans-serif',
                    fill: '#888'
                }
            }])
        };

        // Add geo configuration
        option.geo = this.buildGeoConfig(mapType, config);

        // Add series
        option.series = this.buildSeriesConfig(normalPoints, effectPoints, config);

        // Add title if provided
        const title = this.buildTitle(config.title);
        if (title) {
            option.title = title;
        }

        // Allow user config to override everything
        return this.merger.merge(option, config.option || {});
    }

    /**
     * Process data points into normal and effect points
     * @param {Array} data - Input data
     * @returns {object} Processed points
     */
    processDataPoints(data) {
        const normalPoints = [];
        const effectPoints = [];

        data.forEach(item => {
            const point = this.parseDataItem(item);

            if (point.isEffect) {
                effectPoints.push(point);
            } else {
                normalPoints.push(point);
            }
        });

        return { normalPoints, effectPoints };
    }

    /**
     * Parse a single data item
     * @param {*} item - Data item
     * @returns {object} Parsed point
     */
    parseDataItem(item) {
        let name, coords, isEffect = false, val = 10;

        if (typeof item === 'string') {
            name = item.trim();
            coords = null;
        } else {
            name = item.label || item.name || item.code || 'Unknown';
            if (name) name = name.trim();
            coords = item.coords;
            isEffect = item.active || item.effect;
            val = item.value || 10;
        }

        const code = (typeof item === 'object' ? (item.code || item.name) : item).trim();

        return {
            name,
            _code: code,
            _label: (typeof item === 'object' && item.label) ? item.label : undefined,
            value: coords ? [...coords, val] : [0, 0, val],
            _needsGeoLookup: !coords,
            isEffect
        };
    }

    /**
     * Build geo configuration
     * @param {string} mapType - Map type
     * @param {object} config - Configuration
     * @returns {object}
     */
    buildGeoConfig(mapType, config) {
        const isChina = mapType === 'china';

        return {
            map: mapType,
            roam: true,
            center: config.center || (isChina ? [105, 35] : [110, 25]),
            zoom: config.zoom || (isChina ? 1.2 : 3.5),
            label: {
                show: true,
                color: '#666',
                fontSize: 10
            },
            itemStyle: {
                areaColor: '#f3f3f3',
                borderColor: '#ccc',
                borderWidth: 0.5
            },
            emphasis: {
                itemStyle: {
                    areaColor: 'rgba(255, 152, 0, 0.5)',
                    borderColor: '#ff9800',
                    borderWidth: 1
                },
                label: {
                    show: true,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 'bold'
                }
            }
        };
    }

    /**
     * Check if jitter should be enabled based on data density
     * @param {Array} normalPoints - Normal scatter points
     * @param {Array} effectPoints - Effect scatter points
     * @returns {boolean}
     */
    shouldEnableJitter(normalPoints, effectPoints) {
        const totalPoints = normalPoints.length + effectPoints.length;
        // Enable jitter when there are many points that might overlap
        return totalPoints >= 8;
    }

    /**
     * Build series configuration
     * @param {Array} normalPoints - Normal scatter points
     * @param {Array} effectPoints - Effect scatter points
     * @param {object} config - Configuration
     * @returns {Array}
     */
    buildSeriesConfig(normalPoints, effectPoints, config) {
        const baseSize = config.symbolSize || 6;
        const color = config.color || '#ff5722';
        const enableJitter = this.shouldEnableJitter(normalPoints, effectPoints);

        return [
            {
                name: 'Points',
                type: 'scatter',
                coordinateSystem: 'geo',
                data: normalPoints,
                symbolSize: baseSize,
                itemStyle: { color, opacity: 0.9 },
                // Enable jitter for dense data points (ECharts v6 feature)
                jitter: enableJitter ? 0.3 : undefined,
                jitterOverlap: enableJitter ? true : undefined
            },
            {
                name: 'Highlights',
                type: 'effectScatter',
                coordinateSystem: 'geo',
                data: effectPoints,
                symbolSize: baseSize * 1.2,
                showEffectOn: 'render',
                rippleEffect: { brushType: 'stroke', scale: 3, period: 4 },
                itemStyle: { color, shadowBlur: 5 }
            }
        ];
    }
}

// Export factory function for backward compatibility
module.exports = function(data, config = {}) {
    const transformer = new MapTransformer(config);
    return transformer.transform(data);
};

// Also export the class for direct use
module.exports.MapTransformer = MapTransformer;
