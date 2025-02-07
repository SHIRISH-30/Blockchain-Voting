import { Request, Response } from "express";

export default (req: Request, res: Response) => {
  res.clearCookie('refreshToken');
  console.log("Logouttting")
  res.status(200).send({ message: "Logged out successfully" });
};
