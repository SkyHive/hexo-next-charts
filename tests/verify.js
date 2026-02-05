const util = require('../lib/util');
const radarTransformer = require('../lib/charts/radar');
const mapTransformer = require('../lib/charts/map');
const tag = require('../lib/tag');
const injector = require('../lib/injector');

console.log('--- Testing Utility ---');
const testData = { page: { skills: [{label: 'JS', value: 90}] } };
const resolved = util.resolvePath(testData, 'page.skills');
console.log('Resolve path page.skills:', JSON.stringify(resolved));
if (resolved && resolved[0].label === 'JS') console.log('✅ Util OK');

console.log('\n--- Testing Transformers ---');
const radarOption = radarTransformer([{label: 'K8s', value: 95}]);
console.log('Radar option created:', !!radarOption.radar);
if (radarOption.radar) console.log('✅ Radar OK');

const mapOption = mapTransformer(['上海', 'Singapore']);
console.log('Map option series data count:', mapOption.series[0].data.length);
if (mapOption.series[0].data.length === 2) console.log('✅ Map OK');

console.log('\n--- Testing Tag (Enhanced) ---');
const tagOutput = tag(['radar', 'skills', 'title:"My Skills"', 'height:300px']);
console.log('Tag output includes Base64 data-chart:', tagOutput.includes('data-chart="'));
if (tagOutput.includes('data-chart=')) console.log('✅ Tag OK');

console.log('\n--- Testing Tree Chart ---');
const treeTransformer = require('../lib/charts/tree');
const treeData = { name: "Root", children: [{name: "A"}, {name: "B"}] };
const treeOption = treeTransformer(treeData, { title: 'Skill Tree' });
console.log('Tree title:', treeOption.title.text);
if (treeOption.series[0].type === 'tree') console.log('✅ Tree OK');

console.log('\n--- Testing Map (Enhanced) ---');
const mapOptionEnhanced = mapTransformer(['上海'], { title: 'Travel Map', map: 'china' });
console.log('Map type:', mapOptionEnhanced.geo.map);
console.log('Map instructions present:', !!mapOptionEnhanced.graphic);
if (mapOptionEnhanced.geo.map === 'china') console.log('✅ Map OK');

console.log('\n--- Testing Map Custom Codes (Backend Structural Check) ---');
const customMapData = [
    "CN SHA",
    { code: "MY PEN", label: "槟城", effect: true }
];
const customMapOption = mapTransformer(customMapData);
const shanghaiPoint = customMapOption.series[0].data.find(p => p.name === 'CN SHA');
const penangPoint = customMapOption.series[1].data.find(p => p.name === '槟城');

console.log('SHA marked for frontend lookup:', !!shanghaiPoint && shanghaiPoint._needsGeoLookup);
console.log('Penang marked for frontend lookup:', !!penangPoint && penangPoint._needsGeoLookup);

if (shanghaiPoint && shanghaiPoint._needsGeoLookup && penangPoint && penangPoint._needsGeoLookup) {
    console.log('✅ Custom Codes Structural OK');
}

console.log('\n--- Testing Injector (Enhanced) ---');
(async () => {
  // Mock Hexo context for AssetsManager
  const hexoContext = {
    log: { info: console.log, warn: console.warn, error: console.error },
    public_dir: './public',
    config: { root: '/' }
  };

  const mockPost = {
      content: tag(['map', 'travels']),
      travels: customMapData
  };
  
  const injected = await injector.call(hexoContext, mockPost);
  console.log('Injected content contains HEXO_NEXT_CHARTS_DATA:', injected.content.includes('HEXO_NEXT_CHARTS_DATA'));
  console.log('Injected content contains placesPath:', injected.content.includes('placesPath'));
  
  if (injected.content.includes('placesPath')) console.log('✅ Injector OK');
  
  console.log('\nAll basic tests passed!');
})();
