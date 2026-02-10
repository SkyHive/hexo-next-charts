/**
 * Chart Registry
 * Maintains mapping from chart types to transformers
 * Supports dynamic registration and auto-loading
 */

const fs = require('fs');
const path = require('path');

class ChartRegistry {
    constructor() {
        this.transformers = new Map();
        this.defaultConfigs = new Map();
        this._hasAutoLoaded = false;
    }

    /**
     * Register a chart transformer
     * @param {string} type - Chart type identifier
     * @param {class|function} transformer - Transformer class or factory function
     * @param {object} defaultConfig - Default configuration for this chart type
     */
    register(type, transformer, defaultConfig = {}) {
        this.transformers.set(type, transformer);
        this.defaultConfigs.set(type, defaultConfig);
    }

    /**
     * Get transformer for a chart type
     * @param {string} type - Chart type
     * @returns {class|function|null}
     */
    get(type) {
        return this.transformers.get(type) || null;
    }

    /**
     * Get default config for a chart type
     * @param {string} type - Chart type
     * @returns {object}
     */
    getDefaultConfig(type) {
        return this.defaultConfigs.get(type) || {};
    }

    /**
     * Check if a chart type is registered
     * @param {string} type - Chart type
     * @returns {boolean}
     */
    has(type) {
        return this.transformers.has(type);
    }

    /**
     * Get all registered chart types
     * @returns {string[]}
     */
    getTypes() {
        return Array.from(this.transformers.keys());
    }

    /**
     * Auto-load all transformers from the charts directory
     * @param {string} chartsDir - Path to charts directory
     */
    autoLoad(chartsDir) {
        // Prevent duplicate auto-loading (e.g., during hexo s reloads)
        if (this._hasAutoLoaded) {
            return;
        }
        this._hasAutoLoaded = true;

        if (!fs.existsSync(chartsDir)) {
            console.warn(`[ChartRegistry] Charts directory not found: ${chartsDir}`);
            return;
        }

        const files = fs.readdirSync(chartsDir);

        for (const file of files) {
            // Skip non-js files and base.js
            if (!file.endsWith('.js') || file === 'base.js') {
                continue;
            }

            const type = path.basename(file, '.js');
            const filePath = path.join(chartsDir, file);

            try {
                const transformer = require(filePath);

                // Check if it's a class-based transformer (has transform method)
                // or a function-based transformer
                if (typeof transformer === 'function') {
                    this.register(type, transformer);
                } else if (transformer && typeof transformer.transform === 'function') {
                    this.register(type, transformer);
                }
            } catch (e) {
                console.error(`[ChartRegistry] Failed to load transformer for ${type}:`, e.message);
            }
        }

        console.log(`[ChartRegistry] Loaded ${this.transformers.size} chart types: ${this.getTypes().join(', ')}`);
    }

    /**
     * Create transformer instance for a chart type
     * @param {string} type - Chart type
     * @param {object} config - Configuration
     * @returns {object|null}
     */
    create(type, config = {}) {
        const TransformerClass = this.get(type);

        if (!TransformerClass) {
            return null;
        }

        // If it's a class with transform method, instantiate it
        if (TransformerClass.prototype && typeof TransformerClass.prototype.transform === 'function') {
            return new TransformerClass(config);
        }

        // If it's a factory function that returns an object with transform method
        if (typeof TransformerClass === 'function' && TransformerClass.length <= 1) {
            const instance = new TransformerClass(config);
            if (instance.transform) {
                return instance;
            }
        }

        // Legacy function-based transformer - wrap it
        return {
            transform: (data) => TransformerClass(data, config)
        };
    }

    /**
     * Transform data using registered transformer
     * @param {string} type - Chart type
     * @param {*} data - Input data
     * @param {object} config - Configuration
     * @returns {object|null}
     */
    transform(type, data, config = {}) {
        const transformer = this.create(type, config);

        if (!transformer) {
            console.error(`[ChartRegistry] Unknown chart type: ${type}`);
            return null;
        }

        try {
            // Validate if method exists
            if (transformer.validate && typeof transformer.validate === 'function') {
                const validation = transformer.validate(data);
                if (!validation.valid) {
                    console.error(`[ChartRegistry] Validation failed for ${type}:`, validation.error);
                    return null;
                }
            }

            return transformer.transform(data);
        } catch (e) {
            console.error(`[ChartRegistry] Transform failed for ${type}:`, e.message);
            return null;
        }
    }
}

// Export singleton instance
module.exports = new ChartRegistry();
