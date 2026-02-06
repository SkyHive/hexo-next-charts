const fs = require('fs');
const path = require('path');
const GeoManager = require('../lib/geo_manager');

// Mock Hexo
const hexo = {
    base_dir: __dirname,
    source_dir: path.join(__dirname, 'mock_source'),
    log: {
        info: console.log,
        warn: console.warn,
        error: console.error
    },
    config: {
        next_charts: {}
    }
};

// Mock Axios
jest.mock('axios');
const axios = require('axios');

describe('GeoManager', () => {
    let geoManager;
    const placesPath = path.join(hexo.source_dir, '_data', 'places.json');

    beforeEach(() => {
        // Clean up mock FS
        if (fs.existsSync(placesPath)) {
            fs.unlinkSync(placesPath);
        }
        if (fs.existsSync(path.dirname(placesPath))) {
            fs.rmdirSync(path.dirname(placesPath));
        }
        
        geoManager = new GeoManager(hexo);
    });

    afterAll(() => {
         if (fs.existsSync(placesPath)) {
            fs.unlinkSync(placesPath);
        }
    });

    test('Normalization', () => {
        expect(geoManager.normalize('张掖市')).toBe('张掖'); 
        expect(geoManager.normalize('Beijing City')).toBe('beijing city'); // "City" is not in regex
        expect(geoManager.normalize('Shanghai')).toBe('shanghai');
    });

    test('Resolve via Mock API', async () => {
        // Mock OSM response
        axios.get.mockResolvedValue({
            data: [{
                display_name: 'Test City, Country',
                lon: '100.1',
                lat: '30.2'
            }]
        });

        geoManager.register('Test City');
        await geoManager.resolve();

        const resolved = geoManager.getResolved('Test City');
        expect(resolved).not.toBeNull();
        expect(resolved.coords).toEqual([100.1, 30.2]);
        expect(resolved.source).toBe('osm');
        
        // Check file persistence
        expect(fs.existsSync(placesPath)).toBe(true);
        const fileContent = JSON.parse(fs.readFileSync(placesPath, 'utf8'));
        expect(fileContent.store['test_city']).toBeDefined();
    });
});
