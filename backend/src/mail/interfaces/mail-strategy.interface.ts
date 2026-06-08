export interface IMailStrategy {
  sendMail(to: string, subject: string, html: string): Promise<boolean>;
}
