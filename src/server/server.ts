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
server.use((req, res, next) => {
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('application/json')) {
        express.json({ limit: '10gb' })(req, res, next);
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
        express.urlencoded({ limit: '10gb', extended: true })(req, res, next);
    } else {
        next();
    }
});
server.use(cors());
server.use(morgan('dev'));
server.use("/v1/api", setRoutes);
export default server;
