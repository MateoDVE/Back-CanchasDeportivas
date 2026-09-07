export class Complex {
  constructor(
    public id: number,
    public name: string,
    public location: string,
    public contactInfo: string,
    public paymentQrUrl: string | null = null,
    public isActive: boolean = true,
  ) {}

  public activate(): void {
    this.isActive = true;
  }

  public deactivate(): void {
    this.isActive = false;
  }
}
