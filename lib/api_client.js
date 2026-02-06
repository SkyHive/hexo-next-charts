const axios = require('axios');
const CoordHelper = require('./coord_helper');

class ApiClient {
    constructor(config, log) {
        this.config = config || {};
        this.log = log || console;
        this.amapKey = this.config.amap_key || process.env.AMAP_KEY;
    }

    async resolve(address) {
        // 1. Try Amap if key is available
        if (this.amapKey) {
            try {
                const result = await this.queryAmap(address);
                if (result) return result;
            } catch (e) {
                this.log.warn(`[hexo-next-charts] Amap query failed for ${address}: ${e.message}`);
            }
        }

        // 2. Fallback to OpenStreetMap (Nominatim)
        try {
            const result = await this.queryOSM(address);
            if (result) return result;
        } catch (e) {
            this.log.warn(`[hexo-next-charts] OSM query failed for ${address}: ${e.message}`);
        }

        return null;
    }

    async queryAmap(address) {
        const url = 'https://restapi.amap.com/v3/geocode/geo';
        const res = await axios.get(url, {
            params: {
                address: address,
                key: this.amapKey,
                output: 'json'
            },
            timeout: 5000
        });

        if (res.data.status === '1' && res.data.geocodes && res.data.geocodes.length > 0) {
            const geocode = res.data.geocodes[0];
            const [lng, lat] = geocode.location.split(',').map(Number);
            
            // Amap returns GCJ02, convert to WGS84
            const [wgsLng, wgsLat] = CoordHelper.gcj02ToWgs84(lng, lat);
            
            return {
                name_cn: geocode.formatted_address || geocode.city || address,
                coords: [Number(wgsLng.toFixed(6)), Number(wgsLat.toFixed(6))], // Round to 6 decimals
                source: 'amap'
            };
        }
        return null;
    }

    async queryOSM(address) {
        const url = 'https://nominatim.openstreetmap.org/search';
        const res = await axios.get(url, {
            params: {
                q: address,
                format: 'json',
                limit: 1,
                addressdetails: 1
            },
            headers: {
                'User-Agent': 'HexoNextCharts/1.0 (https://github.com/moshuchina/hexo-next-charts)'
            },
            timeout: 10000
        });

        if (res.data && res.data.length > 0) {
            const item = res.data[0];
            return {
                name_cn: item.display_name.split(',')[0], // Take first part as name
                coords: [Number(item.lon), Number(item.lat)],
                source: 'osm'
            };
        }
        return null;
    }
}

module.exports = ApiClient;
