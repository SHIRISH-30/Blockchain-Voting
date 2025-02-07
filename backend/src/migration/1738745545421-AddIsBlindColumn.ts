import {MigrationInterface, QueryRunner} from "typeorm";

export class AddIsBlindColumn1738745545421 implements MigrationInterface {
    name = 'AddIsBlindColumn1738745545421'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` ADD \`is_blind\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user\` DROP COLUMN \`is_blind\``);
    }

}
