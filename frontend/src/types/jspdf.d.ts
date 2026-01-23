declare module 'jspdf' {
  export class jsPDF {
    constructor(...args: any[]);
    text(text: string, x: number, y: number, options?: any): void;
    setFontSize(size: number): void;
    save(filename: string): void;
  }
}
