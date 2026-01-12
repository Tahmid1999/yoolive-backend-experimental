import { Server, Socket } from 'socket.io';
import { MessageModel } from "./message.model";

export const messageHandler = (io: Server, socket: Socket) => {
  try {
    
    // =========================
    // SEND MESSAGE (contract: room-message → room-message-receive)
    // =========================
    const handleSendMessage = async ({ roomId, senderId, message }: any) => {
      const saved = await MessageModel.create({
        roomId,
        senderId,
        text: message ?? "",
      });

      io.to(roomId).emit("room-message-receive", saved);
    };

    socket.on("room-message", handleSendMessage);
    // backward compatibility with old event name
    socket.on("send-message", async ({ roomId, senderId, text }: any) => {
      const saved = await MessageModel.create({ roomId, senderId, text });
      io.to(roomId).emit("room-message-receive", saved);
    });

    // =========================
    // EDIT MESSAGE (REALTIME)
    // =========================
    socket.on(
      "edit-message",
      async ({ messageId, newText }: any) => {
        const updated = await MessageModel.findByIdAndUpdate(
          messageId,
          { text: newText, isEdited: true },
          { new: true }
        );

        if (updated) {
          io.to(updated.roomId.toString()).emit(
            "message-updated",
            updated
          );
        }
      }
    );

    // =========================
    // DELETE MESSAGE
    // =========================
    socket.on(
      "delete-message",
      async ({ messageId }: any) => {
        const deleted = await MessageModel.findByIdAndUpdate(
          messageId,
          { isDeleted: true },
          { new: true }
        );

        if (deleted) {
          io.to(deleted.roomId.toString()).emit(
            "message-deleted",
            { messageId }
          );
        }
      }
    );

    // =========================
    // LOAD HISTORY (ROOM BASE)
    // =========================
    socket.on(
      "load-messages",
      async ({ roomId }: any) => {
        const messages = await MessageModel.find({ roomId })
          .sort({ createdAt: 1 })
          .lean();

        socket.emit("room-messages", messages);
      }
    );

  } catch (error) {
    console.error("Message Handler Error:", error);
  }
};
