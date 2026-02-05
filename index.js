/* global hexo */

'use strict';

const tag = require('./lib/tag');
const injector = require('./lib/injector');

// Register Tag (renamed to echart to avoid conflicts)
hexo.extend.tag.register('echart', tag, { async: false });

// Register Filter
hexo.extend.filter.register('after_post_render', injector);

console.log('[hexo-next-charts] Plugin loaded successfully.');
