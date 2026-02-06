/* global hexo */

'use strict';

const tag = require('./lib/tag');
const injector = require('./lib/injector');
const GeoManager = require('./lib/geo_manager');

// Initialize GeoManager
const geoManager = new GeoManager(hexo);

// Register Tag
hexo.extend.tag.register('echart', tag, { async: false });

// Register Filter: Injector needs access to geoManager
// We wrap it to pass the instance
hexo.extend.filter.register('after_post_render', function(data) {
    return injector.call(this, data, geoManager);
});

console.log('[hexo-next-charts] Plugin loaded successfully.');
