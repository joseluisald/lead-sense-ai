import { LogModel } from '../models/log.model';

export class LogController {
    static async getLogs(set: { status?: number | string }) {
        try {
            return await LogModel.list();
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }
}
