import jwt from "jsonwebtoken";
import cst from "../server/constants.js"

export function generateToken (email: string, permission: string) {
    return jwt.sign(
        { email: email, permission:  permission},
        cst.ADMIN.JWT_SECRET || "",
        { expiresIn: '24h', algorithm: 'HS256' })
}
