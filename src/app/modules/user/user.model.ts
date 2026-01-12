/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from 'bcrypt';
import { StatusCodes } from 'http-status-codes';
import { model, Schema } from 'mongoose';
import config from '../../../config';
import { IUser, UserModal } from './user.interface';
import AppError from '../../errors/AppError';

const userSchema = new Schema<IUser, UserModal>(
  {
    name: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: false,
      default: '',
    },
    userName: {
      type: String,
      required: false,
      default: '',
    },
    email: {
      type: String,
      lowercase: true,
    },
    password: {
      type: String,
      required: false,
      select: 0,
    },
    googleId: {
      type: String,
    },
    facebookId: {
      type: String,
    },
    appleId: {
      type: String,
    },
    phone: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      default: 'USER',
    },
    image: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHERS'],
      required: false,
    },
    age: {
      type: Number,
      required: false,
    },
    bio: {
      type: String,
      required: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },

    authentication: {
      type: {
        isResetPassword: {
          type: Boolean,
          default: false,
        },
        oneTimeCode: {
          type: Number,
          default: null,
        },
        expireAt: {
          type: Date,
          default: null,
        },
      },
      select: 0,
    },
  },
  { timestamps: true },
);

//exist user check
userSchema.statics.isExistUserById = async (id: string) => {
  const isExist = await User.findById(id);
  return isExist;
};

userSchema.statics.isExistUserByEmail = async (email: string) => {
  const isExist = await User.findOne({ email });
  return isExist;
};

//account check
userSchema.statics.isAccountCreated = async (id: string) => {
  const isUserExist: any = await User.findById(id);
  return isUserExist.accountInformation.status;
};

//is match password
userSchema.statics.isMatchPassword = async (
  password: string,
  hashPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hashPassword);
};

//check user
userSchema.pre('save', async function (next) {
  //check user
  const isExist = await User.findOne({ email: this.email });
  if (isExist) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Email already used');
  }

  if (this.password) {
    this.password = (await bcrypt.hash(
      this.password,
      Number(config.bcrypt_salt_rounds),
    )) as string;
  }
  next();
});

export const User = model<IUser, UserModal>('User', userSchema);
