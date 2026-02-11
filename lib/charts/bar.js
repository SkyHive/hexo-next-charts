/**
 * Bar Chart Transformer
 * Renders bar charts for comparison data
 * Perfect for comparing values across categories
 */

const BaseTransformer = require('./base');

class BarTransformer extends BaseTransformer {
    /**
     * Get default configuration for bar charts
     * @returns {object}
     */
    getDefaultConfig() {
        return {
            backgroundColor: 'transparent',
            horizontal: false, // true for horizontal bar chart
            barWidth: '60%',
            showBackground: false,
            barBackgroundColor: 'rgba(180, 180, 180, 0.2)',
            borderRadius: [4, 4, 0, 0],
            color: null
        };
    }

    /**
     * Validate input data
     * @param {*} data - Input data
     * @returns {object}
     */
    validate(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return { valid: false, error: 'Bar data must be a non-empty array' };
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
        const { categories, seriesData } = this.processData(data);

        // Build option
        const option = {
            backgroundColor: config.backgroundColor,
            tooltip: this.buildTooltip('axis', {
                trigger: 'axis',
                axisPointer: { type: 'shadow' }
            }),
            toolbox: this.buildToolbox({ restore: false }),
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            series: [this.buildBarSeries(seriesData, config)]
        };

        // Configure axes based on orientation
        if (config.horizontal) {
            option.xAxis = {
                type: 'value',
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: '#eee' } },
                axisLabel: { color: '#666' }
            };
            option.yAxis = {
                type: 'category',
                data: categories,
                axisLine: { lineStyle: { color: '#666' } },
                axisLabel: { color: '#666' }
            };
        } else {
            option.xAxis = {
                type: 'category',
                data: categories,
                axisLine: { lineStyle: { color: '#666' } },
                axisLabel: { color: '#666' }
            };
            option.yAxis = {
                type: 'value',
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: '#eee' } },
                axisLabel: { color: '#666' }
            };
        }

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
                categories.push(item.label || item.name || `Item ${index + 1}`);
                seriesData.push(item.value || 0);
            } else {
                categories.push(`Item ${index + 1}`);
                seriesData.push(item);
            }
        });

        return { categories, seriesData };
    }

    /**
     * Build bar series configuration
     * @param {Array} data - Series data
     * @param {object} config - Configuration
     * @returns {object}
     */
    buildBarSeries(data, config) {
        const seriesConfig = {
            name: config.seriesName || 'Value',
            type: 'bar',
            barWidth: config.barWidth || '60%',
            showBackground: config.showBackground || false,
            backgroundStyle: {
                color: config.barBackgroundColor || 'rgba(180, 180, 180, 0.2)'
            },
            itemStyle: {
                borderRadius: config.horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]
            },
            label: {
                show: true,
                position: config.horizontal ? 'right' : 'top',
                color: '#666'
            },
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowColor: 'rgba(0,0,0,0.3)'
                }
            },
            data: data
        };

        return seriesConfig;
    }
}

// Export factory function for ChartRegistry
module.exports = function(data, config = {}) {
    const transformer = new BarTransformer(config);
    return transformer.transform(data);
};

// Also export the class for direct use
module.exports.BarTransformer = BarTransformer;
