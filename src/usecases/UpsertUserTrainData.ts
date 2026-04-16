import { prisma } from "../lib/db.js";

interface UpsertUserTrainDataInput {
  userId: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number;
}

interface UpsertUserTrainDataOutput {
  userId: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number;
}

export class UpsertUserTrainData {
  async execute(
    input: UpsertUserTrainDataInput,
  ): Promise<UpsertUserTrainDataOutput> {
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

  private buildUpsertUserTrainDataResponse(user: {
    id: string;
    weightInGrams: number | null;
    heightInCentimeters: number | null;
    age: number | null;
    bodyFatPercentage: number | null;
  }): UpsertUserTrainDataOutput {
    return {
      userId: user.id,
      weightInGrams: user.weightInGrams!,
      heightInCentimeters: user.heightInCentimeters!,
      age: user.age!,
      bodyFatPercentage: user.bodyFatPercentage!,
    };
  }
}
