import { ApiResponse } from '../interfaces';

export class ResponseUtil {
  static success<T>(
    data?: T,
    message = 'Operation successful',
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
    };
  }

  static error(message = 'Operation failed', errors?: any[]): ApiResponse {
    return {
      success: false,
      message,
      errors,
    };
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message = 'Data retrieved successfully',
  ): ApiResponse<T[]> {
    return {
      success: true,
      message,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
