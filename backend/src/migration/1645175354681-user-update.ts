import { MigrationInterface, QueryRunner } from "typeorm";

export class userUpdate1645175354681 implements MigrationInterface {
  name = "userUpdate1645175354681";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` ADD \`verified\` tinyint NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE \`user\` ADD \`is_blind\` tinyint NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE \`user\` ADD \`is_disabled\` tinyint NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE \`user\` ADD \`image\` MEDIUMBLOB NULL`); // Added image field
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`image\``); // Revert image field
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`is_disabled\``);
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`is_blind\``);
    await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`verified\``);
  }
}
