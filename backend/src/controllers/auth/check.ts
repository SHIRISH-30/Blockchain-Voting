// check.ts
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";

interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
  admin: boolean;
  is_blind: boolean;
}

export default async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refresh || req.cookies.refreshToken;

  if (!refreshToken) {
    console.error("Refresh token missing in request cookies:", req.cookies);
    return res.status(400).json({ error: "Not authenticated. Refresh token is missing." });
  }

  try {
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

    if (!accessTokenSecret || !refreshTokenSecret) {
      console.error("Missing ACCESS_TOKEN_SECRET or REFRESH_TOKEN_SECRET in .env file.");
      return res.status(500).json({ error: "Server error: missing environment variables" });
    }

    // Verify token
    const decodedToken = jwt.verify(refreshToken, refreshTokenSecret) as jwt.JwtPayload & User;
    console.log("Decoded Token:", decodedToken);
    console.log("Decoded is_blind:", decodedToken.is_blind);
    

    // Ensure is_blind is properly converted (fix for SQL returning TINYINT)
    const userPlainObj = {
      id: decodedToken.id,
      name: decodedToken.name,
      phone: decodedToken.phone,
      email: decodedToken.email,
      admin: decodedToken.admin,
      is_blind: decodedToken.is_blind, // Ensure boolean conversion
    };

    console.log("Decoded is_blind after conversion:", userPlainObj.is_blind);

    // Generate new tokens
    const accessToken = jwt.sign(userPlainObj, accessTokenSecret, { expiresIn: "10m" });
    const newRefreshToken = jwt.sign(userPlainObj, refreshTokenSecret, { expiresIn: "1d" });

    // Set refresh token in cookies
    res.cookie("refreshToken", newRefreshToken, {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "strict",
      expires: dayjs().add(1, "day").toDate(),
    });

    return res.status(200).json({
      user: userPlainObj,
      accessToken,
    });

  } catch (error: any) {
    console.error("Error verifying refresh token:", error.message);
    return res.status(400).json({ error: "Invalid refresh token or authentication failed." });
  }
};
