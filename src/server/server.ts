import express, {Express} from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
// @ts-ignore
import bodyParser from "body-parser";
import setRoutes from "./routes.js";
import morgan from "morgan";

const server : Express = express();
server.use(helmet());
server.use(cookieParser());
server.use(bodyParser.json({ limit: '10gb'}));
server.use(express.urlencoded({ limit: '10gb', extended: true }));
server.use(cors());
server.use(morgan('dev'));
server.use("/v1/api", setRoutes);
export default server;
