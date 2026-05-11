export class CreateCompanyDto {
  name!: string;
  shortDescription!: string;
}

export class UpdateCompanyDto {
  name?: string;
  shortDescription?: string;
}
