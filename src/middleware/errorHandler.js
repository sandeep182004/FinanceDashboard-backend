/* eslint-disable no-console */
module.exports = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  const payload = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || null,
      details: err.details || null
    }
  };

  // Log server-side errors
  if (status >= 500) console.error(err);

  res.status(status).json(payload);
};
