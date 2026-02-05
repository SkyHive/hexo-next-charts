/**
 * Resolve a value from an object using a dot-notation path.
 * E.g., resolvePath({a: {b: 1}}, 'a.b') -> 1
 *
 * @param {Object} obj The source object
 * @param {string} path The path string
 * @returns {*} The resolved value or undefined
 */
function resolvePath(obj, path) {
  if (!path || !obj) return undefined;
  return path.split(".").reduce((prev, curr) => {
    return prev ? prev[curr] : undefined;
  }, obj);
}

module.exports = {
  resolvePath,
};
