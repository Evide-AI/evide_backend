import { ValidationError } from "sequelize";

/**
 * Transform Sequelize validation errors into user-friendly messages
 * @param {Error} error - The error object
 * @returns {Object} - Formatted error response
 */
export const handleValidationError = (error) => {
  if (error instanceof ValidationError) {
    const validationErrors = error.errors.map((err) => ({
      field: err.path,
      message: err.message,
      value: err.value,
    }));

    return {
      success: false,
      message: "Validation failed",
      errors: validationErrors,
      code: "VALIDATION_ERROR",
    };
  }

  // Handle other specific error types
  if (error.name === "SequelizeUniqueConstraintError") {
    const field = error.errors[0]?.path || "field";
    return {
      success: false,
      message: `${field} already exists. Please use a different value.`,
      code: "DUPLICATE_ERROR",
    };
  }

  if (error.name === "SequelizeForeignKeyConstraintError") {
    return {
      success: false,
      message: "Referenced record does not exist",
      code: "FOREIGN_KEY_ERROR",
    };
  }

  // Default error response
  return {
    success: false,
    message: error.message || "An unexpected error occurred",
    code: "INTERNAL_ERROR",
  };
};

/**
 * Express middleware to handle validation errors
 */
export const validationErrorMiddleware = (error, req, res, next) => {
  const errorResponse = handleValidationError(error);

  // Set appropriate HTTP status code
  let statusCode = 500;
  if (errorResponse.code === "VALIDATION_ERROR") {
    statusCode = 400;
  } else if (errorResponse.code === "DUPLICATE_ERROR") {
    statusCode = 409;
  } else if (errorResponse.code === "FOREIGN_KEY_ERROR") {
    statusCode = 400;
  }

  res.status(statusCode).json(errorResponse);
};
