/**
 * Radar Chart Transformer
 * @param {Array} data Array of {label, value}
 * @param {Object} config Optional configuration
 * @returns {Object} ECharts Option
 */
module.exports = function(data, config = {}) {
  if (!Array.isArray(data)) return {};

  const indicators = data.map(item => ({
    name: item.label || item.name || '',
    max: 100
  }));

  const values = data.map(item => item.value || item.score || 0);

  return {
    title: {
      text: config.title || '',
      left: 'center',
      top: 10
    },
    radar: {
      indicator: indicators,
      shape: 'circle',
      axisName: { color: '#888' },
      splitArea: { show: false }
    },
    series: [{
      type: 'radar',
      data: [{
        value: values,
        areaStyle: { color: 'rgba(64, 158, 255, 0.3)' },
        lineStyle: { color: '#409eff', width: 2 }
      }]
    }]
  };
};
