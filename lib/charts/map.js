/**
 * Map Chart Transformer
 * Renders location data on geographic maps
 * Coordinates are automatically resolved from ECharts geo data in the frontend
 */

module.exports = function(data, config = {}) {
    if (!Array.isArray(data)) return {};

    const mapType = config.map || 'world';
    
    // 处理数据并分类
    const normalPoints = [];
    const effectPoints = [];

    data.forEach(item => {
        let name, coords;
        let isEffect = false;
        let val = 10;

        // 解析数据项
        if (typeof item === 'string') {
            // 支持纯字符串：城市名或地区代码
            name = item.trim();
            coords = null;  // 前端会从 GeoJSON 或 custom mapping 查找
        } else {
            name = item.label || item.name || item.code || 'Unknown';
            if (name) name = name.trim();
            coords = item.coords;  // 用户可选提供坐标
            isEffect = item.active || item.effect;
            val = item.value || 10;
        }

        const code = (typeof item === 'object' ? (item.code || item.name) : item).trim();

        // 添加到数据点（坐标留空或使用用户提供的）
        const entry = { 
            name, 
            _code: code,
            _label: (typeof item === 'object' && item.label) ? item.label : undefined,
            value: coords ? [...coords, val] : [0, 0, val],  // 临时坐标，前端会替换
            _needsGeoLookup: !coords  // 标记需要查找坐标
        };
        isEffect ? effectPoints.push(entry) : normalPoints.push(entry);
    });

    const result = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            formatter: '{b}'
        },
        toolbox: {
            show: true,
            orient: 'vertical',
            left: 'right',
            top: 'center',
            feature: {
                restore: { show: true, title: '重置' },
                saveAsImage: { show: true, title: '保存图片' }
            }
        },
        graphic: [
            {
                type: 'text',
                left: '10',
                bottom: '10',
                z: 100,  // Ensure hint is above map layers
                style: {
                    text: '💡 鼠标滚轮缩放，拖拽移动',
                    font: '12px sans-serif',
                    fill: '#888'
                }
            }
        ]
    };

    // Single geo layer for all maps
    result.geo = {
        map: mapType,
        roam: true,
        center: config.center || (mapType === 'china' ? [105, 35] : [110, 25]),
        zoom: config.zoom || (mapType === 'china' ? 1.2 : 3.5),
        label: { show: false },
        itemStyle: {
            areaColor: '#f3f3f3',
            borderColor: '#ccc',
            borderWidth: 0.5,
            emphasis: { areaColor: 'rgba(127, 127, 127, 0.2)' }
        }
    };

    // Update series to use appropriate geo index
    result.series = [
        {
            name: 'Points',
            type: 'scatter',
            coordinateSystem: 'geo',
            data: normalPoints,
            symbolSize: config.symbolSize || 10,
            itemStyle: { color: config.color || '#ff5722', opacity: 0.8 }
        },
        {
            name: 'Highlights',
            type: 'effectScatter',
            coordinateSystem: 'geo',
            data: effectPoints,
            symbolSize: (config.symbolSize || 10) * 1.5,
            showEffectOn: 'render',
            rippleEffect: { brushType: 'stroke', scale: 4, period: 4 },
            itemStyle: { color: config.color || '#ff5722', shadowBlur: 10 }
        }
    ];

    // Add title only if provided
    if (config.title) {
        result.title = {
            text: config.title,
            left: 'center',
            top: 10,
            textStyle: { color: 'inherit', fontSize: 18 }
        };
    }

    return result;
};