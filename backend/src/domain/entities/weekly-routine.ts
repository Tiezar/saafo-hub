export interface RoutineSlot {
  startTime: string;
  endTime: string;
}

export class WeeklyRoutine {
  constructor(
    public readonly id: string,
    public userId: string,
    public label: string,
    public color: string,
    public days: number[],
    public slots: RoutineSlot[],
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}
