import { registerPlugin } from '@capacitor/core';
import type { PrinterSocketPlugin } from './definitions';

const PrinterSocket = registerPlugin<PrinterSocketPlugin>('PrinterSocket');

export * from './definitions';
export { PrinterSocket };
