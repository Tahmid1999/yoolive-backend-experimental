import cors from 'cors';
import express, { Request, Response } from 'express';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import router from './routes';
import { Morgan } from './shared/morgen';
import notFoundRoute from './app/middlewares/notFoundRoute';
import http from 'http'

const app = express();

// Create HTTP server from Express
const server = http.createServer(app);
// Initialize Socket.io
// initSocket(server);
//morgan
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

//body parser
app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);
 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//file retrieve
app.use(express.static('uploads'));


//router
app.use('/api/v1', router);

//live response
app.get('/', (req: Request, res: Response) => {
  res.send(
    '<h1 style="text-align:center; color:#A55FEF; font-family:Verdana;">backend server running here</h1>',
  );
});

//global error handle
app.use(globalErrorHandler);

//*handle not found route;

app.use(notFoundRoute);

export default app;
