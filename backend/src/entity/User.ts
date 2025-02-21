import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 100 })
  name!: string;

  @Column({ unique: true })
  citizenshipNumber!: string;

  @Column({ length: 180, unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column()
  admin!: boolean;

  @Column({ default: false })
  verified!: boolean;

  @Column({ default: false }) // Added for blind users
  is_blind!: boolean;

  @Column({ default: false }) // Added for disabled users
  is_disabled!: boolean;

  @Column({ type: 'blob', nullable: true }) // Image field, allows NULL value
  image!: Buffer | null;
}
