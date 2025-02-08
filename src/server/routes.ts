import { Request, Response, NextFunction, Router } from "express";
import User from "../model/User.js";
import jwt from "jsonwebtoken";
import CST from "../server/constants.js";
import AuthController from "../controller/AuthController.js";
import HolyController from "../controller/HolyController.js";
import CourseController from "../controller/CourseController.js";
import LessonController from "../controller/LessonController.js";
import multer from 'multer';

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

const authJwt = async (req: any, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Token not provided or invalid");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, CST.ADMIN.JWT_SECRET as string, {
      algorithms: ['HS256'],
    }) as { email: string };

    const dbUser = await User.findOne({ email: decoded.email });
    if (!dbUser) {
      res.status(403).send("Access Forbidden");
      return;
    }

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

    const dbUser = await User.findOne({ email: decoded.email });
    if (!dbUser) {
      res.status(403).send("Access Forbidden");
      return;
    }

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

router.get("/holygraph/list", authJwtNotMandatory, HolyController.list)
router.post("/holygraph/add", authJwt, checkRole("admin"), HolyController.add)
router.get("/holygraph/info/:url", authJwt, HolyController.info)

router.get("/courses/list", authJwtNotMandatory, CourseController.list)
router.post("/courses/add", authJwt, checkRole("admin"), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), CourseController.add)
router.get("/courses/update/:id", authJwt, checkRole("admin"), CourseController.update)
router.get("/courses/info/:id", authJwt, CourseController.info)

router.get("/lesson/list", authJwt, checkRole("admin"), LessonController.list)
router.post("/lesson/add", authJwt, checkRole("admin"), LessonController.add)
router.get("/lesson/update/:id", authJwt, checkRole("admin"), LessonController.update)
router.get("/lesson/info/:url", authJwt, LessonController.info)



export default router;
