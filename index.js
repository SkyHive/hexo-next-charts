/* global hexo */

'use strict';

const tag = require('./lib/tag');
const injector = require('./lib/injector');
const GeoManager = require('./lib/geo_manager');
const ChartRegistry = require('./lib/chart_registry');

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
