/**
 * Pie Chart Transformer
 * Renders pie charts for proportion/composition data
 * Perfect for showing part-to-whole relationships
 */

const BaseTransformer = require('./base');

class PieTransformer extends BaseTransformer {
    /**
     * Get default configuration for pie charts
     * @returns {object}
     */
    getDefaultConfig() {
        return {
            backgroundColor: 'transparent',
            radius: ['40%', '70%'], // Default donut style
            center: ['50%', '50%'],
            showLabels: true,
            labelPosition: 'outside',
            roseType: false, // Set to 'radius' or 'area' for rose chart
            minAngle: 5 // Minimum angle to show small slices
        };
    }

    /**
     * Validate input data
     * @param {*} data - Input data
     * @returns {object}
     */
    validate(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return { valid: false, error: 'Pie data must be a non-empty array' };
        }
        return { valid: true };
    }

    /**
     * Transform data to ECharts option
     * @param {Array} data - Array of data items
     * @returns {object} ECharts option
     */
    transform(data) {
        const validation = this.validate(data);
        if (!validation.valid) {
            return {};
        }

        const config = this.mergeConfig(this.config);

        // Process data
        const seriesData = this.processData(data);

        // Build option
        const option = {
            backgroundColor: config.backgroundColor,
            tooltip: this.buildTooltip('item', {
                formatter: '{b}: {c} ({d}%)'
            }),
            toolbox: this.buildToolbox(),
            legend: {
                orient: 'vertical',
                left: 'left',
                top: 'center'
            },
            series: [this.buildPieSeries(seriesData, config)]
        };

        // Add title if provided
        const title = this.buildTitle(config.title);
        if (title) {
            option.title = title;
            // Adjust legend position if title exists
            option.legend.top = 'middle';
        }

        // Allow user config to override everything
        return this.merger.merge(option, config.option || {});
    }

    /**
     * Process data into pie format
     * @param {Array} data - Input data
     * @returns {Array} Processed data
     */
    processData(data) {
        return data.map((item, index) => {
            if (typeof item === 'object') {
                return {
                    name: item.name || item.label || `Item ${index + 1}`,
                    value: item.value || 0,
                    itemStyle: item.color ? { color: item.color } : undefined
                };
            } else {
                // Simple format: just values
                return {
                    name: `Item ${index + 1}`,
                    value: item
                };
            }
        });
    }

    /**
     * Build pie series configuration
     * @param {Array} data - Series data
     * @param {object} config - Configuration
     * @returns {object}
     */
    buildPieSeries(data, config) {
        const seriesConfig = {
            name: config.seriesName || 'Data',
            type: 'pie',
            radius: config.radius || ['40%', '70%'],
            center: config.center || ['50%', '50%'],
            roseType: config.roseType || false,
            minAngle: config.minAngle || 0,
            avoidLabelOverlap: true,
            itemStyle: {
                borderRadius: 5,
                borderColor: '#fff',
                borderWidth: 2
            },
            label: {
                show: config.showLabels !== false,
                position: config.labelPosition || 'outside',
                formatter: '{b}\n{c} ({d}%)'
            },
            emphasis: {
                label: {
                    show: true,
                    fontSize: 16,
                    fontWeight: 'bold'
                },
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            },
            labelLine: {
                show: true,
                length: 15,
                length2: 10
            },
            data: data
        };

        return seriesConfig;
    }
}

// Export factory function for ChartRegistry
module.exports = function(data, config = {}) {
    const transformer = new PieTransformer(config);
    return transformer.transform(data);
};

// Also export the class for direct use
module.exports.PieTransformer = PieTransformer;
