declare module "@novnc/novnc" {
  export default class RFB {
    constructor(target: HTMLElement, url: string, options?: { credentials?: object });
    viewOnly: boolean;
    scaleViewport: boolean;
    disconnect(): void;
  }
}
