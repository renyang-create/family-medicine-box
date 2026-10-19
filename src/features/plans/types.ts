export type MedicationPlan = {
  id: string;
  boxId: string;
  medicineId: string;
  dosageAmount: number;
  /** 形如 ['08:00', '20:00']，空数组表示未设置 */
  timesOfDay: string[];
  isActive: boolean;
};

export type PlanReminder = {
  id: string;
  planId: string;
  timeLabel: string;
  notificationId: string | null;
  scheduledAt: string | null;
};

export type PlanRow = {
  id: string;
  box_id: string;
  medicine_id: string;
  dosage_amount: number | string;
  times_of_day: string[] | null;
  is_active: boolean;
};

export type ReminderRow = {
  id: string;
  plan_id: string;
  time_label: string;
  notification_id: string | null;
  scheduled_at: string | null;
};
