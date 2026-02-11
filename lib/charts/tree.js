/**
 * Tree Chart Transformer (Skill Tree)
 * Renders hierarchical tree structures
 */

const BaseTransformer = require('./base');

class TreeTransformer extends BaseTransformer {
    /**
     * Get default configuration for tree charts
     * @returns {object}
     */
    getDefaultConfig() {
        return {
            backgroundColor: 'transparent',
            orient: 'LR', // Left to Right
            symbolSize: 7,
            top: '15%',
            left: '10%',
            bottom: '10%',
            right: '20%'
        };
    }

    /**
     * Validate input data
     * @param {*} data - Input data
     * @returns {object}
     */
    validate(data) {
        if (!data || typeof data !== 'object') {
            return { valid: false, error: 'Tree data must be an object or array' };
        }
        return { valid: true };
    }

    /**
     * Transform data to ECharts option
     * @param {object|Array} data - Hierarchical object { name, children: [] }
     * @returns {object} ECharts option
     */
    transform(data) {
        const validation = this.validate(data);
        if (!validation.valid) {
            return {};
        }

        const config = this.mergeConfig(this.config);

        // If data is an array, wrap it in a root node
        const treeData = Array.isArray(data)
            ? { name: config.title || 'Root', children: data }
            : data;

        // Build base option
        const option = {
            backgroundColor: config.backgroundColor,
            tooltip: {
                trigger: 'item',
                triggerOn: 'mousemove'
            },
            series: [{
                type: 'tree',
                data: [treeData],
                top: config.top,
                left: config.left,
                bottom: config.bottom,
                right: config.right,
                symbolSize: config.symbolSize,
                label: {
                    position: 'left',
                    verticalAlign: 'middle',
                    align: 'right',
                    fontSize: 12
                },
                leaves: {
                    label: {
                        position: 'right',
                        verticalAlign: 'middle',
                        align: 'left'
                    }
                },
                emphasis: {
                    focus: 'descendant'
                },
                expandAndCollapse: true,
                animationDuration: 550,
                animationDurationUpdate: 750
            }]
        };

        // Add title if provided
        const title = this.buildTitle(config.title);
        if (title) {
            option.title = title;
        }

        // Add toolbox with saveAsImage only (no restore for non-map charts)
        option.toolbox = this.buildToolbox({ restore: false });

        // Allow user config to override everything
        return this.merger.merge(option, config.option || {});
    }
}

// Export factory function for backward compatibility
module.exports = function(data, config = {}) {
    const transformer = new TreeTransformer(config);
    return transformer.transform(data);
};

// Also export the class for direct use
module.exports.TreeTransformer = TreeTransformer;
