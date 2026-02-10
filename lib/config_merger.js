/**
 * Configuration Merger
 * Deep merges default configuration with user configuration
 * Handles ECharts Option special merging logic
 */

class ConfigMerger {
    /**
     * Deep merge two objects
     * @param {object} target - Target object (defaults)
     * @param {object} source - Source object (user config)
     * @returns {object} Merged object
     */
    merge(target, source) {
        if (!source || typeof source !== 'object') {
            return target;
        }

        if (!target || typeof target !== 'object') {
            return source;
        }

        const result = { ...target };

        for (const key of Object.keys(source)) {
            const sourceValue = source[key];
            const targetValue = target[key];

            // Handle null values
            if (sourceValue === null) {
                result[key] = null;
                continue;
            }

            // Handle arrays - user array replaces default array entirely
            // unless it's a special ECharts array property
            if (Array.isArray(sourceValue)) {
                result[key] = this.mergeArrays(targetValue, sourceValue, key);
                continue;
            }

            // Handle nested objects
            if (typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
                result[key] = this.merge(targetValue || {}, sourceValue);
                continue;
            }

            // Primitive value - source overrides target
            result[key] = sourceValue;
        }

        return result;
    }

    /**
     * Merge arrays with special handling for ECharts properties
     * @param {*} targetArr - Default array
     * @param {Array} sourceArr - User array
     * @param {string} key - Property name
     * @returns {Array}
     */
    mergeArrays(targetArr, sourceArr, key) {
        // For series array, merge by index if types match
        if (key === 'series' && Array.isArray(targetArr)) {
            return sourceArr.map((item, index) => {
                if (index < targetArr.length && typeof item === 'object') {
                    return this.merge(targetArr[index], item);
                }
                return item;
            });
        }

        // For graphic elements, data, and other arrays
        // User array typically replaces default
        return sourceArr;
    }

    /**
     * Merge ECharts options specifically
     * Handles special cases like series, data, etc.
     * @param {object} defaultOption - Default ECharts option
     * @param {object} userOption - User ECharts option
     * @returns {object} Merged option
     */
    mergeEChartsOption(defaultOption, userOption) {
        if (!userOption) return defaultOption;

        const merged = this.merge(defaultOption, userOption);

        // Special handling: if user provides series with same type,
        // try to preserve default formatting unless explicitly overridden
        if (userOption.series && defaultOption.series) {
            merged.series = this.mergeSeries(defaultOption.series, userOption.series);
        }

        return merged;
    }

    /**
     * Merge series arrays with type-aware merging
     * @param {Array} defaultSeries - Default series
     * @param {Array} userSeries - User series
     * @returns {Array}
     */
    mergeSeries(defaultSeries, userSeries) {
        return userSeries.map((userSerie, index) => {
            // Find matching default serie by type
            const matchingDefault = defaultSeries.find(
                ds => ds.type === userSerie.type
            ) || defaultSeries[index];

            if (matchingDefault) {
                return this.merge(matchingDefault, userSerie);
            }

            return userSerie;
        });
    }

    /**
     * Shallow merge for simple objects
     * @param {object} target - Target object
     * @param {object} source - Source object
     * @returns {object}
     */
    shallowMerge(target, source) {
        return { ...target, ...source };
    }
}

module.exports = ConfigMerger;
