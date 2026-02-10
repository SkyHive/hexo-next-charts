/**
 * Path Resolver Utilities
 * Provides path resolution and manipulation functions
 */

/**
 * Resolve a value from an object using a dot-notation path.
 * @param {object} obj - Object to resolve from
 * @param {string} path - Dot-notation path (e.g., 'page.data.chart')
 * @returns {any} Resolved value or undefined
 */
function resolvePath(obj, path) {
    if (!path || !obj) return undefined;
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : undefined;
    }, obj);
}

/**
 * Set a value at a dot-notation path in an object
 * @param {object} obj - Object to modify
 * @param {string} path - Dot-notation path
 * @param {any} value - Value to set
 */
function setPath(obj, path, value) {
    if (!path || !obj) return;

    const keys = path.split('.');
    const lastKey = keys.pop();

    let current = obj;
    for (const key of keys) {
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }

    current[lastKey] = value;
}

/**
 * Check if a path exists in an object
 * @param {object} obj - Object to check
 * @param {string} path - Dot-notation path
 * @returns {boolean}
 */
function hasPath(obj, path) {
    if (!path || !obj) return false;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
        if (current === null || current === undefined || !(key in current)) {
            return false;
        }
        current = current[key];
    }

    return true;
}

/**
 * Normalize a file path for cross-platform compatibility
 * @param {string} filePath - Path to normalize
 * @returns {string}
 */
function normalizePath(filePath) {
    return filePath.replace(/\\/g, '/');
}

/**
 * Join URL parts correctly handling slashes
 * @param {...string} parts - URL parts to join
 * @returns {string}
 */
function joinUrl(...parts) {
    return parts
        .map(part => part.replace(/^\/+|\/+$/g, ''))
        .filter(part => part)
        .join('/');
}

/**
 * Resolve URL with site root (for subdirectory deployments)
 * @param {string} root - Site root path
 * @param {string} url - Relative URL
 * @returns {string}
 */
function resolveWithRoot(root, url) {
    const normalizedRoot = root ? root.replace(/\/$/, '') : '';
    const normalizedUrl = url ? url.replace(/^\//, '') : '';

    if (!normalizedRoot) return `/${normalizedUrl}`;
    return `${normalizedRoot}/${normalizedUrl}`;
}

/**
 * Get filename from path without extension
 * @param {string} filePath - File path
 * @returns {string}
 */
function getFilename(filePath) {
    const base = filePath.split(/[\\/]/).pop();
    const dotIndex = base.lastIndexOf('.');
    return dotIndex > 0 ? base.substring(0, dotIndex) : base;
}

module.exports = {
    resolvePath,
    setPath,
    hasPath,
    normalizePath,
    joinUrl,
    resolveWithRoot,
    getFilename
};
