declare module "@novnc/novnc" {
  export default class RFB {
    constructor(target: HTMLElement, url: string, options?: { credentials?: object });
    viewOnly: boolean;
    scaleViewport: boolean;
    disconnect(): void;
    addEventListener(type: "connect" | "disconnect" | "securityfailure" | "credentialsrequired", listener: (event: Event) => void): void;
    removeEventListener(type: "connect" | "disconnect" | "securityfailure" | "credentialsrequired", listener: (event: Event) => void): void;
  }
}
