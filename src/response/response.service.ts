import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class ResponseService {
  successResponse(message: string, data?: any, pagination?: any) {
    return {
      status: true,
      message,
      data,
      pagination,
    };
  }

  /**
   * Throws an HttpException so that the global HttpExceptionFilter
   * sends the correct HTTP status code on the response.
   */
  errorResponse(
    error: string | Error | any,
    statusCode?: number,
    errors?: any,
  ): never {
    let message = 'Something went wrong';
    let code = statusCode || HttpStatus.BAD_REQUEST;

    if (typeof error === 'string') {
      message = error;
    } else if (error instanceof HttpException) {
      const response = error.getResponse() as any;
      message = response?.message || error.message;
      code = statusCode ?? error.getStatus();
    } else if (error instanceof Error) {
      message = error.message;
    } else if (typeof error?.message === 'string') {
      message = error.message;
    }

    throw new HttpException(
      { status: false, message, statusCode: code, errors },
      code,
    );
  }
}
