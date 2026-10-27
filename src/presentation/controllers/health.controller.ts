import { EntityManager } from "@mikro-orm/postgresql";
import { Controller, Get } from "@nestjs/common";

@Controller('health')
export class HealthController{

    constructor(private readonly em: EntityManager) {}

    @Get('live')
    live(){
        return { status: 'UP', timestamp: new Date().toISOString() };
    }

    @Get('ready')
    async ready() {
        try {
            //tests Postgres connection
           await this.em.getConnection().execute('SELECT 1');
            return { status: 'UP', database: 'CONNECTED', timestamp: new Date().toISOString() };
        } catch (e : any) {
            return { status: 'DOWN', database: 'DISCONNECTED', error: e.message };
        }
    }
}