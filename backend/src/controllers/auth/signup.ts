import { Request, Response } from "express";
import * as yup from "yup";
import { User } from "../../entity/User";
import bcrypt from "bcrypt";

const schema = yup.object({
  body: yup.object({
    name: yup.string().min(3).required(),
    email: yup.string().email().required(),
    password: yup.string().min(3).required(),
    citizenshipNumber: yup.string().min(4).required(),  // Validate citizenshipNumber length
    is_blind: yup.boolean().default(false), // Optional blind status
    is_disabled: yup.boolean().default(false), // Optional disabled status
  }),
});

export default async (req: Request, res: Response) => {
  try {
    await schema.validate(req);
  } catch (error: any) {
    return res.status(400).send(error.errors);
  }

  let hashedPassword = undefined;

  try {
    hashedPassword = await bcrypt.hash(req.body.password, 10);
  } catch (error) {
    return res.status(500).send({ error });
  }

  const newUser = new User();

  newUser.admin = false;
  newUser.name = req.body.name;
  newUser.email = req.body.email;
  newUser.password = hashedPassword;
  newUser.citizenshipNumber = req.body.citizenshipNumber;
  newUser.is_blind = req.body.is_blind || false; // Allow customization of is_blind
  newUser.is_disabled = req.body.is_disabled || false; // Allow customization of is_disabled
  newUser.image = null; // Default to NULL (you will add the image through SQL CMD later)

  try {
    await User.save(newUser);
  } catch (error) {
    return res.status(400).send(error);
  }

  return res.send(newUser);
};
