import { kebabCase } from "@medusajs/framework/utils";
import {Migration} from "@medusajs/framework/mikro-orm/migrations";

export class Migration20250915144819 extends Migration {

    override async up(): Promise<void> {
        this.addSql(`alter table if exists "producer" add column if not exists "handle" text null;`);

        const producers = await this.execute(`select id, title from "producer"`)
        for (const producer of producers) {
            const handle = kebabCase(producer.title)
            this.addSql(`update "producer"
                         set handle = '${handle}'
                         where id = '${producer.id}'`)
        }

        this.addSql(`alter table if exists "producer" alter column "handle" set not null;`);
    }

    override async down(): Promise<void> {
        this.addSql(`alter table if exists "producer" drop column if exists "handle";`);
    }

}
