/**
 * Line Chart Transformer
 * Renders line charts for trend data visualization
 * Perfect for showing changes over time
 */

const BaseTransformer = require('./base');

class LineTransformer extends BaseTransformer {
    /**
     * Get default configuration for line charts
     * @returns {object}
     */
    getDefaultConfig() {
        return {
            backgroundColor: 'transparent',
            smooth: true,
            showArea: false,
            showPoints: true,
            lineWidth: 3,
            symbolSize: 8,
            color: null // Will use default color palette
        };
    }

    /**
     * Validate input data
     * @param {*} data - Input data
     * @returns {object}
     */
    validate(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return { valid: false, error: 'Line data must be a non-empty array' };
        }
        return { valid: true };
    }

    /**
     * Transform data to ECharts option
     * @param {Array} data - Array of data points
     * @returns {object} ECharts option
     */
    transform(data) {
        const validation = this.validate(data);
        if (!validation.valid) {
            return {};
        }

        const config = this.mergeConfig(this.config);

        // Process data - support both simple and complex formats
        const { categories, seriesData } = this.processData(data);

        // Build option
        const option = {
            backgroundColor: config.backgroundColor,
            tooltip: this.buildTooltip('axis', {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    label: { backgroundColor: '#6a7985' }
                }
            }),
            toolbox: this.buildToolbox(),
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                boundaryGap: false,
                data: categories,
                axisLine: { lineStyle: { color: '#666' } },
                axisLabel: { color: '#666' }
            },
            yAxis: {
                type: 'value',
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: '#eee' } },
                axisLabel: { color: '#666' }
            },
            series: [this.buildLineSeries(seriesData, config)]
        };

        // Add title if provided
        const title = this.buildTitle(config.title);
        if (title) {
            option.title = title;
        }

        // Allow user config to override everything
        return this.merger.merge(option, config.option || {});
    }

    /**
     * Process data into categories and series data
     * @param {Array} data - Input data
     * @returns {object} Processed data
     */
    processData(data) {
        const categories = [];
        const seriesData = [];

        data.forEach((item, index) => {
            if (typeof item === 'object') {
                // Format: { label: "Jan", value: 100 }
                categories.push(item.label || item.name || item.x || `Item ${index + 1}`);
                seriesData.push(item.value || item.y || 0);
            } else {
                // Format: simple array [100, 200, 300]
                categories.push(`Item ${index + 1}`);
                seriesData.push(item);
            }
        });

        return { categories, seriesData };
    }

    /**
     * Build line series configuration
     * @param {Array} data - Series data
     * @param {object} config - Configuration
     * @returns {object}
     */
    buildLineSeries(data, config) {
        const seriesConfig = {
            name: config.seriesName || 'Value',
            type: 'line',
            smooth: config.smooth !== false,
            symbol: config.showPoints !== false ? 'circle' : 'none',
            symbolSize: config.symbolSize || 8,
            lineStyle: {
                width: config.lineWidth || 3
            },
            data: data
        };

        // Add area style if enabled
        if (config.showArea) {
            seriesConfig.areaStyle = {
                opacity: 0.3
            };
        }

        return seriesConfig;
    }
}

// Export factory function for ChartRegistry
module.exports = function(data, config = {}) {
    const transformer = new LineTransformer(config);
    return transformer.transform(data);
};

// Also export the class for direct use
module.exports.LineTransformer = LineTransformer;
