import { Response } from "express";

type SendResponseParams<T> = {
  res: Response;
  statusCode?: number;
  success?: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, any>;
};

export const sendResponse = <T>({
  res,
  statusCode = 200,
  success = true,
  message = "Request successful",
  data,
  meta
}: SendResponseParams<T>) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
    ...(meta && { meta })
  });
};
