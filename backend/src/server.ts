import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import bodyParser from 'body-parser';

import authRouter from "./routers/auth";
import pollsRouter from "./routers/polls";
import usersRouter from "./routers/users";

const app = express();

// RFID credentials storage
let rfidCredentials: { email: string; password: string } | null = null;

// Middleware
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '50mb',
  parameterLimit: 100000
}));
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// RFID endpoints
app.post('/rfid-login', (req: Request, res: Response) => {
  const { tag } = req.body;
  if (tag === '22721112346') {
    rfidCredentials = {
      email: 'raj@gmail.com',
      password: 'raj@gmail.com'
    };
    res.sendStatus(200);
  } else {
    rfidCredentials = null;
    res.sendStatus(404);
  }
});

app.get('/rfid-credentials', (req: Request, res: Response) => {
  if (rfidCredentials) {
    res.json(rfidCredentials);
    rfidCredentials = null; // Clear after retrieval
  } else {
    res.sendStatus(404);
  }
});

// Existing routes
app.use("/auth", authRouter);
app.use("/polls", pollsRouter);
app.use("/users", usersRouter);

app.get("/", (req: Request, res: Response) => {
  res.status(404).send("no link matched!");
});

export default app;