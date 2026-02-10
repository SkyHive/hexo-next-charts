/* global hexo */

'use strict';

const tag = require('./lib/tag');
const injector = require('./lib/injector');
const GeoManager = require('./lib/geo_manager');
const ChartRegistry = require('./lib/chart_registry');

// Track if plugin has been initialized (prevent duplicate output during hexo s reloads)
if (!global._HEXO_NEXT_CHARTS_INITIALIZED) {
    global._HEXO_NEXT_CHARTS_INITIALIZED = true;

    // Initialize GeoManager
    const geoManager = new GeoManager(hexo);

    // Auto-register all chart transformers
    const path = require('path');
    const chartsDir = path.join(__dirname, 'lib', 'charts');
    ChartRegistry.autoLoad(chartsDir);

    // Register Tag
    hexo.extend.tag.register('echart', tag, { async: false });

    // Register Filter: Injector needs access to geoManager
    // We wrap it to pass the instance
    hexo.extend.filter.register('after_post_render', function(data) {
        return injector.call(this, data, geoManager);
    });

    console.log('[hexo-next-charts] Plugin loaded successfully.');
}
