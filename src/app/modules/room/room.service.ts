import mongoose from "mongoose";
import { Room, RoomMember } from "../room/room.model";
import { generateAgoraToken, toAgoraUid } from "../../../helpers/generateAgoraToken";

const assertHostAccess = async (roomId: string, hostId: string) => {
  const host = await RoomMember.findOne({
    roomId,
    userId: hostId,
    role: "HOST",
    status: "JOINED",
  });

  if (!host) {
    throw new Error("Only host can perform this action");
  }
};

/* =========================
   1. CREATE ROOM (HOST)
========================= */

export const createRoomService = async ({
  userId,
  roomName
}: {
  userId: string;
  roomName: string;
}) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const roomUniqueId = `room_${Date.now()}`;

    const room = await Room.create(
      [
        {
          roomUniqueId,
          roomName,
          hostId: userId
        }
      ],
      { session }
    );

    await RoomMember.create(
      [
        {
          roomId: room[0]._id,
          userId,
          role: "HOST"
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();


    const agoraUid = toAgoraUid(userId);
    const agora = generateAgoraToken({
      channelName: roomUniqueId,
      uid: agoraUid,
      role: "PUBLISHER"
    });

    return {
        room,
        agoraToken: agora,
        agoraUid
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/* =========================
   2. JOIN ROOM AS AUDIENCE
========================= */

export const joinRoomAsAudienceService = async ({
  roomId,
  userId
}: {
  roomId: string;
  userId: string;
}) => {

    console.log(roomId,userId,'checking userid and room id ============>');
  const room = await Room.findById(roomId);
  if (!room || room.status !== "ACTIVE") {
    throw new Error("Room not available");
  }

  const existingStatus = await RoomMember.findOne({
    roomId,
    userId,
    status: { $in: ["BLOCKED", "KICKED"] }
  });
  if (existingStatus) {
    throw new Error("You are not allowed to join this room");
  }

  let member = await RoomMember.findOne({ roomId, userId });
  let created = false;

  if (member) {
    if (member.status !== "JOINED") {
      member.status = "JOINED";
      member.isMuted = false;
      member.joinedAt = new Date();
      await member.save();
    }
  } else {
    member = await RoomMember.create({
      roomId,
      userId,
      role: "AUDIENCE"
    });
    created = true;
  }

  const role =
    member.role === "HOST" || member.role === "GUEST"
      ? "PUBLISHER"
      : "SUBSCRIBER";

  const agoraUid = toAgoraUid(userId);
  const agoraToken = generateAgoraToken({
    channelName: room.roomUniqueId,
    uid: agoraUid,
    role,
  });

  return {
    room,
    member,
    agoraToken,
    agoraUid,
    created,
  };
};

/* =========================
   GET ALL ROOMS
========================= */

export const getAllRoomsService = async () => {
  const rooms = await Room.find({ status: "ACTIVE" })
    .populate("hostId", "name email image country")
    .sort({ createdAt: -1 })
    .lean();

  const roomIds = rooms.map(r => r._id);

  const counts = await RoomMember.aggregate([
    { $match: { roomId: { $in: roomIds }, status: "JOINED" } },
    { $group: { _id: "$roomId", count: { $sum: 1 } } },
  ]);

  const countMap = new Map<string, number>();
  counts.forEach(c => countMap.set(String(c._id), c.count));

  return rooms.map(r => ({
    ...r,
    viewerCount: countMap.get(String(r._id)) || 0,
  }));
};

/* =========================
   UPDATE ROOM
========================= */

export const updateRoomService = async (
  roomId: string,
  payload: {
    roomName?: string;
    status?: "ACTIVE" | "ENDED" | "BLOCKED";
    settings?: {
      canInviteGuest?: boolean;
      audienceCanComment?: boolean;
    };
  }
) => {
  const room = await Room.findById(roomId);
  if (!room) throw new Error("Room not found");

  Object.assign(room, payload);
  await room.save();

  return room;
};


export const getRoomUserListService = async (roomId: string) => {
  const room = await Room.findById(roomId);
  if (!room) throw new Error("Room not found");

  const members = await RoomMember.find({
    roomId,
    status: "JOINED"
  })
    .populate("userId", "name email image")
    .select("userId role status createdAt")
    .sort({ createdAt: 1 });

  return members;
};


/* =========================
   DELETE ROOM
========================= */

export const deleteRoomService = async (roomId: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const room = await Room.findById(roomId).session(session);
    if (!room) throw new Error("Room not found");

    await room.deleteOne({ session });

    await session.commitTransaction();
    session.endSession();

    return true;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const endRoomService = async (roomId: string, hostId: string) => {
  await assertHostAccess(roomId, hostId);
  const room = await Room.findById(roomId);
  if (!room) throw new Error("Room not found");

  room.status = "ENDED";
  await room.save();
  return room;
};

/* =========================
   HOST ACTIONS
========================= */

export const kickMemberService = async ({
  roomId,
  hostId,
  targetUserId
}: {
  roomId: string;
  hostId: string;
  targetUserId: string;
}) => {
  await assertHostAccess(roomId, hostId);

  const updated = await RoomMember.findOneAndUpdate(
    { roomId, userId: targetUserId },
    { status: "KICKED" },
    { new: true }
  );

  if (!updated) throw new Error("User not found in room");
  return updated;
};

export const blockMemberService = async ({
  roomId,
  hostId,
  targetUserId
}: {
  roomId: string;
  hostId: string;
  targetUserId: string;
}) => {
  await assertHostAccess(roomId, hostId);

  const updated = await RoomMember.findOneAndUpdate(
    { roomId, userId: targetUserId },
    { status: "BLOCKED" },
    { new: true }
  );

  if (!updated) throw new Error("User not found in room");
  return updated;
};

export const muteMemberService = async ({
  roomId,
  hostId,
  targetUserId,
  isMuted,
}: {
  roomId: string;
  hostId: string;
  targetUserId: string;
  isMuted: boolean;
}) => {
  await assertHostAccess(roomId, hostId);

  const updated = await RoomMember.findOneAndUpdate(
    { roomId, userId: targetUserId },
    { isMuted },
    { new: true }
  );

  if (!updated) throw new Error("User not found in room");
  return updated;
};
