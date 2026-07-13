export enum ChannelType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  ZALO = 'ZALO',
}

export interface RecipientInfo {
  email?: string;
  phone?: string;
  zaloId?: string;
  name?: string;
}

export interface INotificationChannel {
  send(recipient: RecipientInfo, templateId: string, data: any): Promise<boolean>;
}
