import { createConnection } from "typeorm";
import app from "./server";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";

// Allow credentials to be sent from the frontend
app.use(cors({
  origin: "http://localhost:3000", // or your frontend URL
  credentials: true, // Allow credentials (cookies) to be sent
}));

app.use(cookieParser()); // Add cookie-parser middleware


const port = process.env.PORT || 8000;

createConnection()
  .then(async (connection) => {
    app.listen(port, () => console.log(`listening on port ${port} ... `));
  })
  .catch((error) => console.log(error));


