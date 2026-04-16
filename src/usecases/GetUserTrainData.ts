import { prisma } from "../lib/db.js";

interface GetUserTrainDataInput {
  userId: string;
}

interface GetUserTrainDataOutput {
  userId: string;
  userName: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number;
}

type UserWithTrainData = {
  id: string;
  name: string;
  weightInGrams: number;
  heightInCentimeters: number;
  age: number;
  bodyFatPercentage: number;
};

export class GetUserTrainData {
  async execute(
    input: GetUserTrainDataInput,
  ): Promise<GetUserTrainDataOutput | null> {
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

  private hasCompleteTrainData(user: {
    id: string;
    name: string;
    weightInGrams: number | null;
    heightInCentimeters: number | null;
    age: number | null;
    bodyFatPercentage: number | null;
  }): user is UserWithTrainData {
    return !(
      user.weightInGrams === null ||
      user.heightInCentimeters === null ||
      user.age === null ||
      user.bodyFatPercentage === null
    );
  }

  private buildGetUserTrainDataResponse(
    user: UserWithTrainData,
  ): GetUserTrainDataOutput {
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
