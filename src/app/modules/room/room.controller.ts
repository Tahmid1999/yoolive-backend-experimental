import { Request, Response } from "express";
import {
  createRoomService,
  deleteRoomService,
  getAllRoomsService,
  getRoomUserListService,
  joinRoomAsAudienceService,
  kickMemberService,
  blockMemberService,
  muteMemberService,
  endRoomService,
  updateRoomService,
} from "../room/room.service";

/* =========================
   CREATE ROOM
========================= */

export const createRoom = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id; 
    const { roomName } = req.body;

    const room = await createRoomService({
      userId,
      roomName
    });

    res.status(201).json({
      success: true,
      room: room.room,
      agoraToken: room.agoraToken,
      agoraUid: room.agoraUid,
      channelName: room.roomUniqueId,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/* =========================
   JOIN ROOM AS AUDIENCE
========================= */

export const joinRoom = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { roomId } = req.body;

    const result = await joinRoomAsAudienceService({
      roomId,
      userId
    });

    res.status(200).json({
      success: true,
      room: result.room,
      member: result.member,
      agoraToken: result.agoraToken,
      channelName: result.room.roomUniqueId,
      agoraUid: result.agoraUid,
      created: result.created,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};



/* =========================
   GET ALL ROOMS
========================= */

export const getAllRoomList = async (req: Request, res: Response) => {
  try {
    const rooms = await getAllRoomsService();

    res.status(200).json({
      success: true,
      rooms
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};


/* =========================
  ROOM user list
========================= */


export const getRoomUserList = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    const users = await getRoomUserListService(roomId);

    res.status(200).json({
      success: true,
      users
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/* =========================
   UPDATE ROOM
========================= */

export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payload = req.body;

    const room = await updateRoomService(id, payload);

    res.status(200).json({
      success: true,
      room
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/* =========================
   DELETE ROOM
========================= */

export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await deleteRoomService(id);

    res.status(200).json({
      success: true,
      message: "Room deleted successfully"
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

/* =========================
   HOST CONTROLS
========================= */
const getIO = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (global as any).io as import("socket.io").Server | undefined;
};

export const kickMember = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const hostId = req.user.id;
    const { targetUserId } = req.body;

    const result = await kickMemberService({ roomId, hostId, targetUserId });

    getIO()?.to(roomId).emit("user-kicked", { userId: targetUserId });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const blockMember = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const hostId = req.user.id;
    const { targetUserId } = req.body;

    const result = await blockMemberService({ roomId, hostId, targetUserId });

    getIO()?.to(roomId).emit("user-blocked", { userId: targetUserId });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const muteMember = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const hostId = req.user.id;
    const { targetUserId, isMuted } = req.body;

    const result = await muteMemberService({ roomId, hostId, targetUserId, isMuted });

    getIO()?.to(roomId).emit("user-muted", { userId: targetUserId, isMuted });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const endRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const hostId = req.user.id;

    const room = await endRoomService(roomId, hostId);

    getIO()?.to(roomId).emit("live-ended", { roomId });

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

