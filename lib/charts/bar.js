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
        const { categories, seriesMap } = this.processData(data);

        // Build series
        const seriesNames = Object.keys(seriesMap);
        const series = seriesNames.map(name => {
            const displayName = (name === 'Value' && config.seriesName && seriesNames.length === 1) 
                ? config.seriesName : name;
            return this.buildBarSeries(displayName, seriesMap[name], config);
        });

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
            series: series
        };

        // Configure axes based on orientation
        if (config.horizontal) {
            option.xAxis = {
                type: 'value',
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: '#eee' } },
                axisLabel: { 
                    color: '#666',
                    margin: config.yAxisMargin !== undefined ? config.yAxisMargin : 8
                }
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
                boundaryGap: config.boundaryGap !== undefined ? config.boundaryGap : true,
                data: categories,
                axisLine: { lineStyle: { color: '#666' } },
                axisLabel: { color: '#666' }
            };
            option.yAxis = {
                type: 'value',
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: '#eee' } },
                axisLabel: { 
                    color: '#666',
                    margin: config.yAxisMargin !== undefined ? config.yAxisMargin : 8
                }
            };
        }

        // Add legend if multiple series or explicitly requested
        if ((seriesNames.length > 1 || config.showLegend) && config.showLegend !== false) {
            const legendConfig = {
                data: series.map(s => s.name),
                textStyle: { color: '#666' }
            };
            
            const legendPos = config.legendPosition || 'bottom';
            if (legendPos === 'left') {
                legendConfig.orient = 'vertical';
                legendConfig.left = 'left';
                legendConfig.top = 'center';
                if (option.grid.left === '3%') option.grid.left = '15%';
            } else if (legendPos === 'right') {
                legendConfig.orient = 'vertical';
                legendConfig.right = 'right';
                legendConfig.top = 'center';
                if (option.grid.right === '4%') option.grid.right = '15%';
            } else if (legendPos === 'top') {
                legendConfig.top = 'top';
            } else {
                legendConfig.bottom = 0;
                if (option.grid.bottom === '3%') option.grid.bottom = '15%';
            }
            
            option.legend = legendConfig;
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
        const seriesMap = {};

        data.forEach((item, index) => {
            if (typeof item === 'object') {
                categories.push(item.label || item.name || item.x || `Item ${index + 1}`);
                
                // Get all keys except category labels
                const reservedKeys = ['label', 'name', 'x'];
                const keys = Object.keys(item).filter(k => !reservedKeys.includes(k));
                
                if (keys.length === 1 && (keys[0] === 'value' || keys[0] === 'y')) {
                    // Single series case
                    if (!seriesMap['Value']) seriesMap['Value'] = Array(index).fill(0);
                    seriesMap['Value'].push(item[keys[0]]);
                } else if (keys.length > 0) {
                    // Multiple series case
                    keys.forEach(k => {
                        if (!seriesMap[k]) seriesMap[k] = Array(index).fill(0);
                        seriesMap[k].push(item[k]);
                    });
                } else {
                    // Missing values
                    if (!seriesMap['Value']) seriesMap['Value'] = Array(index).fill(0);
                    seriesMap['Value'].push(0);
                }
                
                // Fill missing values for series that weren't in this item
                Object.keys(seriesMap).forEach(k => {
                    if (seriesMap[k].length <= index) {
                        seriesMap[k].push(0);
                    }
                });
            } else {
                categories.push(`Item ${index + 1}`);
                if (!seriesMap['Value']) seriesMap['Value'] = Array(index).fill(0);
                seriesMap['Value'].push(item);
                
                // Fill missing values for other series
                Object.keys(seriesMap).forEach(k => {
                    if (seriesMap[k].length <= index) {
                        seriesMap[k].push(0);
                    }
                });
            }
        });

        return { categories, seriesMap };
    }

    /**
     * Build bar series configuration
     * @param {string} seriesName - Series name
     * @param {Array} data - Series data
     * @param {object} config - Configuration
     * @returns {object}
     */
    buildBarSeries(seriesName, data, config) {
        const seriesConfig = {
            name: seriesName,
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
                show: config.showLabel !== false,
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
