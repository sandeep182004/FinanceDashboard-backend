const { PORT } = process.env;
const port = PORT || 4001;

module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Finance Dashboard API',
    version: '1.0.0',
    description: 'Proxy API to fetch market quotes via Alpha Vantage and Finnhub'
  },
  servers: [{ url: `http://localhost:${port}/api`, description: 'Local server' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: { '200': { description: 'OK' } }
      }
    },
    '/proxy/alpha/quote': {
      get: {
        summary: 'Get latest quote from Alpha Vantage',
        parameters: [
          {
            name: 'symbol',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Ticker symbol (e.g. AAPL)'
          }
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Bad Request' },
          '429': { description: 'Rate limit exceeded' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/proxy/finnhub/quote': {
      get: {
        summary: 'Get latest quote from Finnhub',
        parameters: [
          {
            name: 'symbol',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Ticker symbol (e.g. MSFT)'
          }
        ],
        responses: {
          '200': { description: 'OK' },
          '400': { description: 'Bad Request' },
          '429': { description: 'Rate limit exceeded' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/config/{id}': {
      get: {
        summary: 'Get a saved dashboard config by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'OK' }, '404': { description: 'Not Found' } }
      },
      post: {
        summary: 'Save a dashboard config by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Saved' } }
      }
    },
    '/config/export/all': {
      get: { summary: 'Export all dashboard configs', responses: { '200': { description: 'OK' } } }
    },
    '/config/import/merge': {
      post: {
        summary: 'Import and merge dashboard configs',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'Merged' } }
      }
    },
    '/utils/flatten': {
      post: {
        summary: 'Flatten JSON to dot-paths',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { '200': { description: 'OK' } }
      }
    },
    '/utils/schema': {
      get: {
        summary: 'Fetch sample data and emit flattened schema paths',
        parameters: [
          { name: 'provider', in: 'query', required: true, schema: { type: 'string', enum: ['alpha','finnhub'] } },
          { name: 'symbol', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'type', in: 'query', required: false, schema: { type: 'string', enum: ['quote','history'] } }
        ],
        responses: { '200': { description: 'OK' }, '400': { description: 'Bad Request' } }
      }
    },
    '/templates': {
      get: { summary: 'List available dashboard templates', responses: { '200': { description: 'OK' } } }
    }
  },
  components: {
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object' },
          meta: { type: 'object' }
        }
      }
    }
  }
};
