const axios = require('axios');

const http = axios.create({
  timeout: 10_000
});

// Response interceptor to standardize errors for upstream callers
http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const err = new Error(data?.error || data?.Note || data?.Message || 'Upstream API error');
      err.status = status;
      err.code = data?.code || null;
      err.upstream = true;
      throw err;
    }

    const err = new Error(error.message || 'Network Error');
    err.status = 502;
    throw err;
  }
);

module.exports = http;
