/**
 * Tree Chart Transformer (Skill Tree)
 * @param {Object} data Hierarchical object { name, children: [] }
 * @param {Object} config Optional configuration
 * @returns {Object} ECharts Option
 */
module.exports = function(data, config = {}) {
  if (!data || typeof data !== 'object') return {};

  // If data is an array, wrap it in a root node if it doesn't have one
  const treeData = Array.isArray(data) ? { name: config.title || 'Root', children: data } : data;

  return {
    title: {
      text: config.title || '',
      left: 'center',
      top: 10
    },
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove'
    },
    series: [
      {
        type: 'tree',
        data: [treeData],
        top: '15%',
        left: '10%',
        bottom: '10%',
        right: '20%',
        symbolSize: 7,
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
      }
    ]
  };
};
