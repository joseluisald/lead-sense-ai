import { StatModel } from '../models/stat.model';

export class StatController {
    static async getStats(clientId: string | undefined, set: { status?: number | string }) {
        try {
            return await StatModel.get(clientId);
        } catch (error: any) {
            set.status = 500;
            return { error: error.message };
        }
    }
}
