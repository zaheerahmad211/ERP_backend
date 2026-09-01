const successResponse = (res, message = 'Success', data = {}, statusCode = 200, meta = null) => {
  const response = {
    success: true,
    message,
    data,
  };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
};

const errorResponse = (res, message = 'An error occurred', errors = [], statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors],
  });
};

const paginateResponse = (res, message = 'Data retrieved successfully', data = [], page = 1, limit = 10, total = 0) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      totalPages,
    },
  });
};

module.exports = {
  successResponse,
  errorResponse,
  paginateResponse,
};
