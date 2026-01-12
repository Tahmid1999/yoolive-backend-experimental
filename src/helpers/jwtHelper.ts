// import jwt, { JwtPayload, Secret } from 'jsonwebtoken';

// const createToken = (payload: object, secret: Secret, expireTime: string) => {
//   return jwt.sign(payload, secret, { expiresIn: expireTime });
// };

// const verifyToken = (token: string, secret: Secret) => {
//   return jwt.verify(token, secret) as JwtPayload;
// };

// export const jwtHelper = { createToken, verifyToken };

import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';

interface Payload {
  [key: string]: any;
}

const createToken = (payload: Payload, secret: Secret, expireTime: any): string => {
  const options: SignOptions = { 
    expiresIn: expireTime as any// type-cast to satisfy TS
  };
  return jwt.sign(payload, secret, options);
};

const verifyToken = (token: string, secret: Secret): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (err) {
    console.error('JWT verification failed:', err);
    return null;
  }
};

export const jwtHelper = { createToken, verifyToken };
