export interface PrinterSocketPlugin {
  send(options: { ipAddress: string; port: number; data: string }): Promise<void>;
}
