import { Server, Socket } from "socket.io";
import { generateAgoraToken, toAgoraUid } from "../../../../helpers/generateAgoraToken";
import { Room, RoomMember } from "../../../modules/room/room.model";

/* =========================
   ROOM HANDLER
   Handles:
   - Join room
   - Leave room 
   - Promote audience → guest
   - message 
========================= */

const roomHandler = (io: Server, socket: Socket) => {
        console.log('call the custom server ::>');

  // ================================
  // GET ROOM USER LIST (SOCKET)
  // ================================
  socket.on("join-room", async ({ roomId }) => {
    try {

      if (!roomId) {
        return socket.emit("room-user-list-error", {
          message: "roomId is required"
        });
      }

      const room = await Room.findById(roomId);
      if (!room) {
        return socket.emit("room-user-list-error", {
          message: "Room not found"
        });
      }

      socket.join(roomId);

      const members = await RoomMember.find({
        roomId,
        status: "JOINED"
      })
        .populate("userId", "name email avatar")
        .select("userId role status createdAt")
        .sort({ createdAt: 1 });

      socket.emit("room-user-list", {
        roomId,
        members
      });

      io.to(roomId).emit("viewer-count", {
        roomId,
        count: members.length,
      });

    } catch (err: any) {
      console.error("Get room user list error:", err);

      socket.emit("room-user-list-error", {
        message: err.message || "Failed to fetch room users"
      });
    }
  });

  // ===== Promote Audience  Guest =====
  socket.on("promote-to-guest", async ({ roomId, hostId, targetUserId }: { roomId: string; hostId: string; targetUserId: string }) => {
    try {

      console.log(roomId, hostId, targetUserId,'checking user id =============>');
      const room = await Room.findById(roomId);
      if (!room) {
        return socket.emit("error", { message: "Room not found" });
      }

      const host = await RoomMember.findOne({
        roomId,
        userId: hostId,
        role: "HOST",
        status: "JOINED",
      });

      if (!host) {
        return socket.emit("error", { message: "Only host can invite" });
      }

      const member = await RoomMember.findOne({
        roomId,
        userId: targetUserId,
        status: "JOINED",
      });

      if (!member) {
        return socket.emit("error", { message: "User not in room" });
      }

      if (member.role === "GUEST") {
        return socket.emit("error", { message: "Already a guest" });
      }

      const guestCount = await RoomMember.countDocuments({
        roomId,
        role: "GUEST",
        status: "JOINED",
      });
      if (guestCount >= 3) {
        return socket.emit("error", { message: "Guest limit reached" });
      }

      member.role = "GUEST";
      member.isMuted = false;
      await member.save();

      const agoraToken = generateAgoraToken({
        channelName: room.roomUniqueId,
        uid: toAgoraUid(targetUserId), 
        role: "PUBLISHER",
      });

      // Send token directly to the promoted user
      socket.to(roomId).emit("user-promoted", { userId: targetUserId });
      io.to(roomId).emit("agora-token-update", {
        userId: targetUserId,
        token: agoraToken,
        role: "GUEST",
      });

    } catch (err: any) {
      console.error("Promote to guest error:", err);
      socket.emit("error", { message: err.message || "Promotion failed" });
    }
  });

  // ===== Leave Room =====
  socket.on("leave-room", async ({ roomId, userId }: { roomId: string; userId: string }) => {
    try {

      socket.leave(roomId);

      const member = await RoomMember.findOneAndUpdate(
        { roomId, userId },
        { status: "LEFT" },
        { new: true }
      );

      if (member?.role === "HOST") {
        await Room.findByIdAndUpdate(roomId, { status: "ENDED" });
        await RoomMember.updateMany({ roomId }, { status: "LEFT" });
        io.to(roomId).emit("live-ended", { roomId });
      } else {
        socket.to(roomId).emit("user-left", { userId });

        const count = await RoomMember.countDocuments({
          roomId,
          status: "JOINED",
        });
        io.to(roomId).emit("viewer-count", { roomId, count });
      }
    } catch (err: any) {
      console.error("Leave room error:", err);
      socket.emit("error", { message: err.message || "Leave room failed" });
    }
  });

  // User-driven mic/camera state
  socket.on("mic-state-changed", ({ roomId, userId, isMuted }: { roomId: string; userId: string; isMuted: boolean }) => {
    socket.to(roomId).emit("mic-state-changed", { userId, isMuted });
  });

  socket.on("camera-state-changed", ({ roomId, userId, isCameraOn }: { roomId: string; userId: string; isCameraOn: boolean }) => {
    socket.to(roomId).emit("camera-state-changed", { userId, isCameraOn });
  });
}


export default roomHandler;
