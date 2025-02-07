import { Request, Response } from "express";
import * as yup from "yup";
import { User } from "../../entity/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";

// Validation schema for incoming request
const schema = yup.object({
  body: yup.object({
    email: yup.string().email().required(),
    password: yup.string().min(3).required(),
  }),
});

export default async (req: Request, res: Response) => {
  let user = null;

  // Validate the incoming request body
  try {
    await schema.validate(req);
  } catch (error: any) {
    return res.status(400).send(error.errors);
  }

  // Find the user in the database by email
  try {
    user = await User.findOneOrFail({ email: req.body.email });
  } catch (error: any) {
    return res.status(404).send(error);
  }

  // Ensure the user is verified
  if (!user.verified) {
    return res.status(400).send("Not verified");
  }

  // Compare the provided password with the stored password
  const match = await bcrypt.compare(req.body.password, user.password);
  if (!match) {
    return res.status(400).send("Password doesn't match");
  }

  // Ensure environment variables are set
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

  if (!accessTokenSecret || !refreshTokenSecret) {
    console.log("You forgot to add .env file to the project?");
    return res.status(500).send("Server error");
  }

  // Clear any existing refresh token before issuing a new one
  res.clearCookie('refreshToken'); // Clears old token before setting a new one


  // Prepare the user object with all necessary fields, including `is_blind`
  const plainUserObject = {
    id: user.id,
    name: user.name,
    citizenshipNumber: user.citizenshipNumber,
    email: user.email,
    admin: user.admin,
    is_blind: user.is_blind, // Ensure this field is passed correctly
  };

  // Log the plainUserObject to verify it's correct
  console.log("PlainUserObject before signing:", plainUserObject);

  // Generate the access token with a 10-minute expiry
  const accessToken = jwt.sign(plainUserObject, accessTokenSecret, {
    expiresIn: "10m", // Increased expiry time
  });

  // Generate the refresh token with a 3-day expiry
  const refreshToken = jwt.sign(plainUserObject, refreshTokenSecret, {
    expiresIn: "1d", // Increased expiry time
  });

  // Set the refresh token in the response cookies
  res.cookie("refreshToken", refreshToken, {
    expires: dayjs().add(1, "day").toDate(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Set secure cookies only in production
  });

  // Log the generated tokens for debugging
  console.log("Generated Access Token:", accessToken);
  console.log("Generated Refresh Token:", refreshToken);

  // Log the user data to ensure the `is_blind` field is correct
  console.log("User in login.ts", user.is_blind);

  // Return the user and access token to the client
  return res.send({
    user: plainUserObject, // Send the plain user object back to the client
    accessToken,
  });
};
