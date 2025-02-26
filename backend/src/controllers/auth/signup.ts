import { Request, Response } from "express";
import * as yup from "yup";
import { User } from "../../entity/User";
import bcrypt from "bcrypt";

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
    return res.status(400).send(error.errors);
  }

  let hashedPassword: string;
  try {
    hashedPassword = await bcrypt.hash(req.body.password, 10);
  } catch (error) {
    return res.status(500).send({ error: "Password hashing failed" });
  }

  // Convert base64 image to Buffer
  let imageBuffer: Buffer;
  try {
    const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, "");
    imageBuffer = Buffer.from(base64Data, 'base64');
  } catch (error) {
    return res.status(400).send({ error: "Invalid image format" });
  }

  const newUser = new User();
  newUser.admin = false;
  newUser.name = req.body.name;
  newUser.email = req.body.email;
  newUser.password = hashedPassword;
  newUser.citizenshipNumber = req.body.citizenshipNumber;
  newUser.is_blind = req.body.is_blind;
  newUser.is_disabled = req.body.is_disabled;
  newUser.image = imageBuffer;

  try {
    await User.save(newUser);
  } catch (error) {
    return res.status(400).send({ error: "User registration failed" });
  }

  return res.send({
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    is_blind: newUser.is_blind,
    is_disabled: newUser.is_disabled
  });
};