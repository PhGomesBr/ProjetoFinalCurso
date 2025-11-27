export interface Fornecedor {
  forId: number;
  forNomeFantasia: string;
  forRazaoSocial: string;
  forCnpj: string;

  // Endereço
  endRua: string;
  endNumero: string;
  endCidade: string;
  endCep: string;
  endEstado: string;

  // Contato
  conCelular: string;
  conTelefoneComercial: string;
  conEmail: string;
}
