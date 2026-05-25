import serverless from "serverless-http";
import { app } from "../backend/server.js";

const handler = serverless(app);

export const config = {
  maxDuration: 60
};

export default handler;
