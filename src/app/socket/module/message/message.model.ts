import { Schema, model, Types } from "mongoose";

const messageSchema = new Schema(
  {
    roomId: {
      type: Types.ObjectId,
      required: true,
      index: true,
    },
    senderId: {
      type: Types.ObjectId,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const MessageModel = model("Message", messageSchema);
