export interface AppFeatures {
  auditLogging: boolean;
  userRegistration: boolean;
  aiAssistant: 'voice' | 'chat' | 'disabled';
}

export interface AppSettings {
  id: 'app';
  appName: string;
  defaultGroupId: string;
  features: AppFeatures;
  updatedAt: Date;
  updatedBy: string;
}

export interface UpdateSettingsInput {
  appName?: string;
  defaultGroupId?: string;
  features?: Partial<AppFeatures>;
}
