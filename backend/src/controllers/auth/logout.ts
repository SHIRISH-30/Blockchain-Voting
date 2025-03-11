import { Request, Response } from "express";

export default (req: Request, res: Response) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Secure flag in production
    sameSite: "strict",
  });

  console.log("Logging out...");
  
  res.status(200).json({ message: "Logged out successfully" });
};



