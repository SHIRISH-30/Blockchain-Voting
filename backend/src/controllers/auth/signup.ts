import { Request, Response } from "express";
import * as yup from "yup";
import { User } from "../../entity/User";
import bcrypt from "bcrypt";

// Validation schema
const schema = yup.object({
  body: yup.object({
    name: yup.string().min(3).required(),
    email: yup.string().email().required(),
    password: yup.string().min(3).required(),
    citizenshipNumber: yup.string().min(4).required(),
    is_blind: yup.boolean().default(false),
    is_disabled: yup.boolean().default(false),
    image: yup.string().required("Photo is required"),
  }),
});

export default async (req: Request, res: Response) => {
  try {
    await schema.validate(req);
  } catch (error: any) {
    return res.status(400).json({ message: error.message });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Validate base64 image
    const base64Regex = /^data:image\/(jpeg|jpg|png);base64,/;
    if (!base64Regex.test(req.body.image)) {
      return res.status(400).json({ message: "Invalid image format" });
    }

    const base64Data = req.body.image.replace(base64Regex, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Validate image size (5MB limit)
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    if (imageBuffer.length > MAX_IMAGE_SIZE) {
      return res.status(400).json({ message: "Image size exceeds 5MB limit" });
    }

    // Create new user
    const newUser = User.create({
      admin: false,
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      citizenshipNumber: req.body.citizenshipNumber,
      is_blind: req.body.is_blind,
      is_disabled: req.body.is_disabled,
      image: imageBuffer,
    });

    // Save user to database
    await User.save(newUser);

    // Return success response
    return res.status(201).json({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      is_blind: newUser.is_blind,
      is_disabled: newUser.is_disabled,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return res.status(400).json({ message: error.message || "Registration failed" });
  }
};