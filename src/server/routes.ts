import { Request, Response, NextFunction, Router } from "express";
import User from "../model/User.js";
import jwt from "jsonwebtoken";
import CST from "../server/constants.js";
import AuthController from "../controller/AuthController.js";
import HolyController from "../controller/HolyController.js";
import CourseController from "../controller/CourseController.js";
import LessonController from "../controller/LessonController.js";
import multer from 'multer';
import ResourceController from "../controller/ResourceController.js";
import UserController from "../controller/UserController.js";
import DiscordController from "../controller/DiscordController.js";
import DiscordServices from "../services/DiscordServices";

const router = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, '/tmp'),
    filename: (req, file, cb) => cb(null, Date.now() + '.mp4')
  })
});
const authJwt = async (req: any, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.get("Authorization");
    let token = "";
    if (!authHeader && !req.query.token) {
      throw new Error("Token not provided or invalid");
    }
    if (authHeader) {
      if (!authHeader.startsWith("Bearer ")) {
        throw new Error("Token not provided or invalid");
      }
      token = authHeader.split(" ")[1];
    } else {
        token = req.query.token as string
    }
    const decoded = jwt.verify(token, CST.ADMIN.JWT_SECRET as string, {
      algorithms: ['HS256'],
    }) as { email: string };

    let dbUser = await User.findOne({ email: decoded.email });
    if (!dbUser) {
      res.status(403).send("Access Forbidden");
      return;
    }
    dbUser.lastLogin = new Date();
    dbUser = await dbUser.save();

    const dbUserWithToken = dbUser.toObject();
    // @ts-ignore
    dbUserWithToken.token = token;

    req.user = dbUserWithToken;
    next();
  } catch (err) {
    console.error(err);
    res.status(403).send("Access Forbidden");
  }
};

const authJwtNotMandatory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Token not provided or invalid");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, CST.ADMIN.JWT_SECRET as string, {
      algorithms: ['HS256'],
    }) as { email: string };

    let dbUser = await User.findOne({ email: decoded.email });
    if (!dbUser) {
      res.status(403).send("Access Forbidden");
      return;
    }
    dbUser.lastLogin = new Date();
    dbUser = await dbUser.save();

    const dbUserWithToken = dbUser.toObject();
    // @ts-ignore
    dbUserWithToken.token = token;

    req.user = dbUserWithToken;
    next();
  } catch (err) {
    delete req.user;
    next();
  }
};

const authAPI = async (req: any, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.get("X-VK-TOKEN");
    if (!authHeader) {
      throw new Error("API Key not provided or invalid");
    }

    if (authHeader !== CST.ADMIN.API_KEY) {
      throw new Error ("API Key is invalid !");
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(403).send("Access Forbidden");
  }
};

const checkRole = (role: string) => async (req: any, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) throw new Error("No credentials found!");
    if (user.permission !== role && user.permission !== "admin") {
      throw new Error("Not authorized!");
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(403).send({ message: "Access Forbidden" });
  }
};

router.post("/login", AuthController.login);
router.post("/register", authAPI, AuthController.register)
router.patch("/register", AuthController.accountConfirmation)
router.get("/me", authJwt, AuthController.me)
router.get("/discord", authJwt, UserController.generateDiscordLink)

router.get("/users/list", authJwt, checkRole("admin"), UserController.list)
router.patch("/users/update/:id", authJwt, checkRole("admin"), UserController.update)
router.post("/users/add", authJwt, checkRole("admin"), UserController.add)
router.delete("/users/delete/:id", authJwt, checkRole("admin"), UserController.delete)
router.get("/users/info/:id", authJwt, checkRole("admin"), UserController.info)

router.get("/holygraph/list", authJwtNotMandatory, HolyController.list)
router.post("/holygraph/add", authJwt, checkRole("admin"), upload.single('video'), HolyController.add)
router.delete("/holygraph/delete/:id", authJwt, checkRole("admin"), HolyController.delete)
router.patch("/holygraph/update/:id", authJwt, checkRole("admin"), upload.single('video'), HolyController.update)
router.get("/holygraph/info/:url", authJwt, HolyController.info)

router.post("/evaluate/add/:url", authJwt, HolyController.generateEvaluation)
router.get("/evaluate/info/:id", authJwt, HolyController.evaluateInfo)
router.patch("/evaluate/update/:id", authJwt, HolyController.evaluateUpdateUser)

router.get("/courses/list", authJwtNotMandatory, CourseController.list)
router.post("/courses/add", authJwt, checkRole("admin"), upload.single('image'), CourseController.add)
router.patch("/courses/update/:id", authJwt, checkRole("admin"), upload.single('image'), CourseController.update)
router.get("/courses/info/:url", authJwt, CourseController.info)
router.delete("/courses/delete/:id", authJwt, checkRole("admin"), CourseController.delete)

router.get("/lessons/list", authJwt, checkRole("admin"), LessonController.list)
router.post("/lessons/add", authJwt, checkRole("admin"), upload.single("video"), LessonController.add)
router.patch("/lessons/update/:id", authJwt, checkRole("admin"), upload.single("video"), LessonController.update)
router.get("/lessons/info/:url", authJwt, LessonController.info)
router.delete("/lessons/delete/:id", authJwt, checkRole("admin"), LessonController.delete)

router.get("/resources/show", authJwt, ResourceController.view)

router.post("/discord/upload", authAPI, DiscordController.uploadDailyStat)
router.get("/discord/stats", authJwt, DiscordController.getStats)
router.get("/discord/schedule", authJwt, DiscordController.getSchedule)



export default router;
