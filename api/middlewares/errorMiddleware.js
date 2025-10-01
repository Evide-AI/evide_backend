import { handleValidationError } from "../utils/validationErrorHandler.js";

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  // Use the validation error handler for Sequelize errors
  if (
    err.name === "SequelizeValidationError" ||
    err.name === "SequelizeUniqueConstraintError" ||
    err.name === "SequelizeForeignKeyConstraintError"
  ) {
    const errorResponse = handleValidationError(err);
    let statusCode = 400;
    if (errorResponse.code === "DUPLICATE_ERROR") statusCode = 409;
    return res.status(statusCode).json(errorResponse);
  }

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;
  let field = null;
  let errors = null;

  // Custom App Error
  if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
    field = err.field;
  }
  // PostgreSQL specific errors
  else if (err.parent?.code === "23505") {
    statusCode = 409;
    message = "Duplicate entry";
  }

  const response = {
    success: false,
    message,
    ...(field && { field }),
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

class AppError extends Error {
  constructor(message, statusCode, field = null) {
    super(message);
    this.statusCode = statusCode;
    this.field = field;
    Error.captureStackTrace(this, this.constructor);
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export { notFound, errorHandler, AppError, asyncHandler };
