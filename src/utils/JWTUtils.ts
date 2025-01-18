import jwt from "jsonwebtoken";
import cst from "../server/constants.js"

export function generateToken (email: string) {
    return jwt.sign(
        { email: email },
        cst.ADMIN.JWT_SECRET || "",
        { expiresIn: '12h', algorithm: 'HS256' })
}
