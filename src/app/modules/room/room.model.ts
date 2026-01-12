import mongoose, { Schema, model, models } from "mongoose";

/* ======================
   ROOM SCHEMA
========================= */

const RoomSchema = new Schema(
  {
    roomUniqueId: {
      type: String,
      unique: true,
      index: true,
      required: true
    },

    roomName: {
      type: String,
      required: true
    },

    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "ENDED", "BLOCKED"],
      default: "ACTIVE"
    },

    settings: {
      canInviteGuest: {
        type: Boolean,
        default: true
      },
      audienceCanComment: {
        type: Boolean,
        default: true
      }
    }
  },
  { timestamps: true }
);

/* =========================
   ROOM MEMBER SCHEMA
========================= */

const RoomMemberSchema = new Schema(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "Room",
      index: true,
      required: true
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true
    },

    role: {
      type: String,
      enum: ["HOST", "GUEST", "AUDIENCE"],
      required: true
    },

    isMuted: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: ["JOINED", "LEFT", "KICKED", "BLOCKED"],
      default: "JOINED"
    },

    joinedAt: {
      type: Date,
      default: Date.now
    },

    leftAt: Date
  },
  { timestamps: false }
);

/* =========================
   INDEXES (IMPORTANT)
========================= */

RoomMemberSchema.index(
  { roomId: 1, userId: 1 },
  { unique: true }
);

/* =========================
   MODELS
========================= */
export const Room =
  models.Room || model("Room", RoomSchema);

export const RoomMember =
  models.RoomMember || model("RoomMember", RoomMemberSchema);
