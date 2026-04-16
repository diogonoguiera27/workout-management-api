import { prisma } from "../lib/db.js";
export class GetUserTrainData {
    async execute(input) {
        const user = await prisma.user.findUnique({
            where: { id: input.userId },
        });
        if (!user) {
            return null;
        }
        if (!this.hasCompleteTrainData(user)) {
            return null;
        }
        return this.buildGetUserTrainDataResponse(user);
    }
    hasCompleteTrainData(user) {
        return !(user.weightInGrams === null ||
            user.heightInCentimeters === null ||
            user.age === null ||
            user.bodyFatPercentage === null);
    }
    buildGetUserTrainDataResponse(user) {
        return {
            userId: user.id,
            userName: user.name,
            weightInGrams: user.weightInGrams,
            heightInCentimeters: user.heightInCentimeters,
            age: user.age,
            bodyFatPercentage: user.bodyFatPercentage,
        };
    }
}
