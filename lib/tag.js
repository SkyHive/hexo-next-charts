/**
 * Tag Plugin Registration
 * Syntax: {% chart type source [height:400px] %}
 */
module.exports = function(args) {
  const type = args[0] || '';
  const source = args[1] || '';
  const options = {};
  
  // Parse key:value arguments
  args.slice(2).forEach(arg => {
    if (arg.includes(':')) {
      const [key, ...val] = arg.split(':');
      options[key.trim()] = val.join(':').trim().replace(/^["']|["']$/g, '');
    }
  });

  const placeholderId = `echart-${Math.random().toString(36).substring(2, 11)}`;
  
  // Encode all data into a single Base64 string to safely pass through Hexo filters
  const payload = {
    type,
    source,
    title: options.title || '',
    height: options.height || '400px',
    ...options
  };
  const dataPayload = Buffer.from(JSON.stringify(payload)).toString('base64');

  return `<div class="hexo-next-chart-placeholder" id="${placeholderId}" data-chart="${dataPayload}" style="width: 100%; height: ${payload.height}; margin: 20px 0;"></div>`;
};
