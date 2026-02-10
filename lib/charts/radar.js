/**
 * Radar Chart Transformer
 * Renders radar/spider charts for multi-dimensional data
 */

const BaseTransformer = require('./base');

class RadarTransformer extends BaseTransformer {
    /**
     * Get default configuration for radar charts
     * @returns {object}
     */
    getDefaultConfig() {
        return {
            backgroundColor: 'transparent',
            shape: 'circle', // or 'polygon'
            maxValue: 100
        };
    }

    /**
     * Validate input data
     * @param {*} data - Input data
     * @returns {object}
     */
    validate(data) {
        if (!Array.isArray(data)) {
            return { valid: false, error: 'Radar data must be an array' };
        }
        return { valid: true };
    }

    /**
     * Transform data to ECharts option
     * @param {Array} data - Array of {label, value} or {name, score}
     * @returns {object} ECharts option
     */
    transform(data) {
        const validation = this.validate(data);
        if (!validation.valid) {
            return {};
        }

        const config = this.mergeConfig(this.config);

        // Build indicators from data
        const indicators = data.map(item => ({
            name: item.label || item.name || '',
            max: config.maxValue || 100
        }));

        // Extract values
        const values = data.map(item => item.value || item.score || 0);

        // Build base option
        const option = {
            backgroundColor: config.backgroundColor,
            radar: {
                indicator: indicators,
                shape: config.shape,
                axisName: { color: '#888' },
                splitArea: { show: false }
            },
            series: [{
                type: 'radar',
                data: [{
                    value: values,
                    areaStyle: { color: 'rgba(64, 158, 255, 0.3)' },
                    lineStyle: { color: '#409eff', width: 2 }
                }]
            }]
        };

        // Add title if provided
        const title = this.buildTitle(config.title);
        if (title) {
            option.title = title;
        }

        // Allow user config to override everything
        return this.merger.merge(option, config.option || {});
    }
}

// Export factory function for backward compatibility
module.exports = function(data, config = {}) {
    const transformer = new RadarTransformer(config);
    return transformer.transform(data);
};

// Also export the class for direct use
module.exports.RadarTransformer = RadarTransformer;
