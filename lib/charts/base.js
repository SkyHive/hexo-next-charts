/**
 * Base Chart Transformer
 * Provides unified interface for all chart transformers
 */

const ConfigMerger = require('../config_merger');

class BaseTransformer {
    /**
     * @param {object} config - User configuration
     */
    constructor(config = {}) {
        this.config = config;
        this.merger = new ConfigMerger();
    }

    /**
     * Get default configuration for this chart type
     * Override in subclasses to provide chart-specific defaults
     * @returns {object}
     */
    getDefaultConfig() {
        return {
            backgroundColor: 'transparent'
        };
    }

    /**
     * Validate input data
     * Override in subclasses for chart-specific validation
     * @param {*} _data - Input data
     * @returns {object} { valid: boolean, error?: string }
     */
    validate(_data) {
        return { valid: true };
    }

    /**
     * Merge user config with defaults
     * @param {object} userConfig - User-provided configuration
     * @returns {object} Merged configuration
     */
    mergeConfig(userConfig = {}) {
        const defaults = this.getDefaultConfig();
        return this.merger.merge(defaults, userConfig);
    }

    /**
     * Transform data to ECharts option
     * Must be implemented by subclasses
     * @param {*} _data - Input data
     * @returns {object} ECharts option
     */
    transform(_data) {
        throw new Error('transform() must be implemented by subclass');
    }

    /**
     * Build common title configuration
     * @param {string} title - Title text
     * @param {object} options - Additional options
     * @returns {object|null}
     */
    buildTitle(title, options = {}) {
        if (!title) return null;

        return {
            text: title,
            left: options.left || 'center',
            top: options.top || 10,
            textStyle: {
                color: options.color || 'inherit',
                fontSize: options.fontSize || 18
            }
        };
    }

    /**
     * Build common tooltip configuration
     * @param {string} trigger - Trigger type: 'item' or 'axis'
     * @param {object} options - Additional options
     * @returns {object}
     */
    buildTooltip(trigger = 'item', options = {}) {
        const tooltip = {
            trigger,
            ...options
        };

        if (trigger === 'item' && !options.formatter) {
            tooltip.formatter = '{b}';
        }

        return tooltip;
    }

    /**
     * Build common toolbox configuration
     * @param {object} options - Tool options
     * @returns {object}
     */
    buildToolbox(options = {}) {
        const features = {};

        if (options.restore !== false) {
            features.restore = { show: true, title: '重置' };
        }

        if (options.saveAsImage !== false) {
            features.saveAsImage = { show: true, title: '保存图片' };
        }

        return {
            show: true,
            orient: options.orient || 'vertical',
            left: options.left || 'right',
            top: options.top || 'center',
            feature: features
        };
    }

    /**
     * Build graphic elements
     * @param {Array} elements - Graphic elements
     * @returns {Array}
     */
    buildGraphic(elements = []) {
        return elements;
    }

    /**
     * Build common series configuration
     * @param {string} type - Series type
     * @param {object} options - Series options
     * @returns {object}
     */
    buildSeries(type, options = {}) {
        return {
            type,
            ...options
        };
    }
}

module.exports = BaseTransformer;
