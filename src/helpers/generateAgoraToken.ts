import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

// Stable numeric uid from ObjectId or number
export const toAgoraUid = (uid: string | number) => {
  if (typeof uid === 'number') return uid;
  const numeric = parseInt(uid.toString().slice(-8), 16);
  return Number.isNaN(numeric) ? 0 : numeric;
};

export function generateAgoraToken({
  channelName,
  uid,
  role,
}: {
  channelName: string;
  uid: string | number;
  role: 'PUBLISHER' | 'SUBSCRIBER';
}) {
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTime = currentTimestamp + expirationTimeInSeconds;

  return RtcTokenBuilder.buildTokenWithUid(
    process.env.AGORA_APP_ID!,
    process.env.AGORA_APP_CERT!,
    channelName,
    toAgoraUid(uid),
    role === 'PUBLISHER' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
    privilegeExpireTime,
  );
}
