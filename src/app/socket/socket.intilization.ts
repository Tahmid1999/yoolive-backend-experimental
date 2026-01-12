// app/socket.ts
import { Server, Socket } from 'socket.io';
import roomHandler from './module/room/room.handler';
import { messageHandler } from './module/message/message.handler';

export const socketInilization = (io: Server) => {

         io.on('connection', (socket: Socket) => {
             console.log('connected server =====>');
             
             roomHandler(io, socket); 
             messageHandler(io, socket);

             socket.on("test",(data)=>{
                console.log(data,'checking data here ====++++>');
             });
         });
};

