import serverless from "serverless-http";
import { app } from "../backend/server.js";

export const config = {
  api: {
    bodyParser: false,
    maxDuration: 60
  }
};

export default serverless(app);
