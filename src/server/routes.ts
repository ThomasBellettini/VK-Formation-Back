import { Request, Response, Express, NextFunction, Router } from "express";
import User from "../model/User.js";
import jwt from "jsonwebtoken";
import CST from "../server/constants.js";
import multer from "multer";

export default (server: Express) => {

  const router = Router();

  const authJwt = async (req: any, res: Response, next: NextFunction) => {
    try {
      let token = "";

      const authHeader = req.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Token not provided or invalid");
      }
      token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, CST.ADMIN.JWT_SECRET as string, {
        algorithms: ['HS256'],
      }) as { email: string } ;

      let dbUser = await User.findOne({ email: decoded.email });
      let dbUserWithToken = dbUser?.toObject();
      // @ts-ignore
      dbUserWithToken.token = token;

      if (!dbUser) {
        res.status(403).send("Access Forbidden");
        return;
      } else {
        req.user = dbUserWithToken;
        next();
      }
    } catch (err) {
      console.log(err);
      res.status(403).send("Access Forbidden");
    }
  };

  const checkRole =
    (role: string) => async (req: any, res: Response, next: NextFunction) => {
      try {
        const user = req.user;
        if (!user) throw "No credential found !";
        if (user.role !== role && user.role !== "admin")
          throw "Not authorized !";
        next();
      } catch (err) {
        console.log(err);
        res.status(403).send({ message: "Access Forbidden" });
      }
    };

  router.get("/test", (req: Request, res: Response) => { return (res.status(200).send("OK")); });

  return router;
};
