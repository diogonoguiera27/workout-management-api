import { prisma } from "../lib/db.js";
export class UpsertUserTrainData {
    async execute(input) {
        const user = await prisma.user.update({
            where: { id: input.userId },
            data: {
                weightInGrams: input.weightInGrams,
                heightInCentimeters: input.heightInCentimeters,
                age: input.age,
                bodyFatPercentage: input.bodyFatPercentage,
            },
        });
        return this.buildUpsertUserTrainDataResponse(user);
    }
    buildUpsertUserTrainDataResponse(user) {
        return {
            userId: user.id,
            weightInGrams: user.weightInGrams,
            heightInCentimeters: user.heightInCentimeters,
            age: user.age,
            bodyFatPercentage: user.bodyFatPercentage,
        };
    }
}
