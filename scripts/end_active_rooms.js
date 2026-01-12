require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });
const mongoose = require('mongoose');
const { Room, RoomMember } = require('../src/app/modules/room/room.model');

(async () => {
  await mongoose.connect(process.env.DATABASE_URL);
  const active = await Room.find({ status: 'ACTIVE' }, 'roomUniqueId createdAt');
  const ids = active.map(r => r._id);
  const endRes = await Room.updateMany({ _id: { $in: ids } }, { status: 'ENDED' });
  await RoomMember.updateMany({ roomId: { $in: ids } }, { status: 'LEFT' });
  console.log(JSON.stringify({
    activeCount: active.length,
    endedCount: endRes.modifiedCount,
    activeRooms: active.map(r => r.roomUniqueId),
  }, null, 2));
  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

