/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../../../enums/user";

import {
  createRoom,
  deleteRoom,
  getAllRoomList,
  getRoomUserList,
  joinRoom,
  updateRoom,
  blockMember,
  kickMember,
  muteMember,
  endRoom
} from "./room.controller";

const router = express.Router();

/* ============================
   CREATE ROOM (HOST)
   POST /rooms
============================ */

router.post(
  "/",
  auth(USER_ROLES.USER),
  createRoom
);

/* ============================
   JOIN ROOM AS AUDIENCE
   POST /rooms/:roomId/join
============================ */

router.post(
  "/join-room",
  auth(USER_ROLES.USER),
  joinRoom
);

router.get(
  "/get-all-room",
  auth(USER_ROLES.USER),
  getAllRoomList
)

router.get(
  "/room-user-list/:roomId",
  auth(USER_ROLES.USER),
  getRoomUserList
)

router.put(
  "/update-room/:id",
  auth(USER_ROLES.USER),
  updateRoom
);

router.delete(
  "/deleteRoom/:id",
  auth(USER_ROLES.USER),
  deleteRoom
)

// host controls
router.post(
  "/:roomId/kick",
  auth(USER_ROLES.USER),
  kickMember
);

router.post(
  "/:roomId/block",
  auth(USER_ROLES.USER),
  blockMember
);

router.post(
  "/:roomId/mute",
  auth(USER_ROLES.USER),
  muteMember
);

router.post(
  "/:roomId/end",
  auth(USER_ROLES.USER),
  endRoom
);


export const RoomRoutes = router;