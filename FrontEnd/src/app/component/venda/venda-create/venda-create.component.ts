import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Product } from '../../product/product.model';
import { ProductService } from '../../product/product.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { VendaService } from '../venda.service';
import { Venda, VendaItem } from '../venda.model';
import { Cliente } from '../../cliente/cliente.model';
import { FormaPagamento } from '../../formaPagamento/formaPagamento.model';
import { ClienteContatoService } from '../../cliente/cliente.service';
import { formaPagamentoService } from '../../formaPagamento/formaPagamento.service';
import { VendaNotificacaoService } from '../vendaNotificacaoService.ts/VendaNotificacaoService';

@Component({
  selector: 'app-venda-create',
  templateUrl: './venda-create.component.html',
  styleUrls: ['./venda-create.component.css']
})
export class VendaCreateComponent implements OnInit {
  vendaForm!: FormGroup;
  products: Product[] = [];
  produtoControl = new FormControl('');
  produtoFiltrados: Product[] = [];
  clienteControl = new FormControl('');
  clientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  formaPagamentos: FormaPagamento[] = [];
  formaPagamentoControl = new FormControl('');
  formaPagamentosFiltrados: FormaPagamento[] = [];


  constructor(
    private fb: FormBuilder,
    private productService: ProductService,
    private clienteService: ClienteContatoService,
    private snackBar: MatSnackBar,
    private router: Router,
    private vendaService: VendaService,
    private formaPagamentoService: formaPagamentoService,
    private vendaNotificacaoService: VendaNotificacaoService,
  ) {}

  generateVendaCodigo(): string {
    const codigo = Math.floor(Math.random() * 1000000);
    return codigo.toString().padStart(6, '0');
  }

  ngOnInit(): void {
    this.vendaForm = this.fb.group({
      vendaCodigo: [this.generateVendaCodigo(), Validators.required],
      vendaData: [new Date(), Validators.required],
      cliId: [null, Validators.required],
      fpgId: [null, Validators.required],
      proId: [null, Validators.required],
      compras: this.fb.array([], Validators.required)
    });

    this.productService.read().subscribe({
      next: produtos => (this.products = produtos),
      error: err => this.snackBar.open('Erro ao carregar produtos', 'X', { duration: 3000 })
    });

    this.clienteService.readClientes().subscribe(clientes => {
      this.clientes = clientes;
      this.clientesFiltrados = clientes;

      this.clienteControl.valueChanges.subscribe(value => {
        const filter = typeof value === 'string' ? value.toLowerCase() : '';
        this.clientesFiltrados = this.clientes.filter(cliente =>
          cliente.cliNome.toLowerCase().includes(filter)
        );
      });
      
    });

    this.formaPagamentoService.read().subscribe(fp => {
      this.formaPagamentos = fp;
      this.formaPagamentosFiltrados = fp;

      this.formaPagamentoControl.valueChanges.subscribe(value => {
        const filter = typeof value === 'string' ? value.toLowerCase() : '';
        this.formaPagamentosFiltrados = this.formaPagamentos.filter(fp =>
          fp.fpgTipo.toLowerCase().includes(filter)
        );
      });
      
    });

    this.productService.read().subscribe(p => {
      this.products = p;
      this.produtoFiltrados = p;

      this.produtoControl.valueChanges.subscribe(value => {
        const filter = typeof value === 'string' ? value.toLowerCase() : '';
        this.produtoFiltrados = this.products.filter(p =>
          p.proNome.toLowerCase().includes(filter)
        );
      });
      
    });

    this.addCompra(); // Adiciona uma compra inicial ao formulário
  }

  get vendaItem(): FormArray {
    return this.vendaForm.get('compras') as FormArray;
  }

  createCompra(): FormGroup {
    return this.fb.group({
      proId: [null, Validators.required],
      compraQuantidade: [1, [Validators.required, Validators.min(1)]],
      compraPrecoVenda: [0, [Validators.required, Validators.min(0)]]
    });
  }

  addCompra(): void {
    this.vendaItem.push(this.createCompra());
  }

  removeCompra(index: number): void {
    this.vendaItem.removeAt(index);
  }

  cancel(): void {
    this.router.navigate(['/venda']);
  }

  onProdutoChange(index: number): void {
    const compraGroup = this.vendaItem.at(index);
    const proId = compraGroup.get('proId')?.value;

    const produto = this.products.find(p => p.proId === proId);
    if (produto) {
      compraGroup.patchValue({
        compraPrecoVenda: produto.proPrecoVenda
      });
    } else {
      compraGroup.patchValue({
        compraPrecoVenda: 0
      });
    }
  }

  onSubmit(): void {
    const raw = this.vendaForm.value;

    const vendaValorTotal = raw.compras.reduce(
      (sum: number, item: any) => sum + item.compraQuantidade * item.compraPrecoVenda,
      0
    );

    const venda: Venda = {
      vendaCodigo: raw.vendaCodigo,
      venData: new Date(raw.vendaData).toISOString(),
      valorTotal: vendaValorTotal,
      cliId: raw.cliId,
      fpgId: raw.fpgId,
      itens: raw.compras.map((item: any) => ({
        proId: item.proId,
        quantidade: item.compraQuantidade,
        precoUnitario: item.compraPrecoVenda
      }))
    };

    this.vendaService.create(venda).subscribe({
      next: () => {
        this.snackBar.open('Venda criada com sucesso!', 'X', { duration: 3000 });
        this.router.navigate(['/venda']);
      },
      error: (err) => {
        if (err.status === 409) {
          const novoCodigo = this.generateVendaCodigo();
          this.vendaForm.get('vendaCodigo')?.setValue(novoCodigo);
          this.snackBar.open('Código duplicado. Novo código gerado automaticamente.', 'X', { duration: 3000 });
        } else {
          this.snackBar.open('Erro ao criar venda', 'X', { duration: 3000 });
          console.error(err);
        }
      }
    });
  }

  displayCliente(cliente: Cliente): string {
    return cliente.cliNome;
  }
  

  onClienteSelecionado(cliente: Cliente): void {
    this.vendaForm.get('cliId')?.setValue(cliente.cliId);
  }

  displayFormaPagamento(fp: FormaPagamento): string {
    return fp?.fpgTipo || '';
  }
  

  onFormaPagamentoSelecionada(fp: FormaPagamento): void {
    this.vendaForm.get('fpgId')?.setValue(fp.fpgId);
  }

  displayProduto(produto: Product): string {
    return produto?.proNome || '';
  }
  
  onProdutoSelecionado(produto: Product, index: number): void {
    const compraGroup = this.vendaItem.at(index);
  
    compraGroup.patchValue({
      proId: produto.proId,
      compraPrecoVenda: produto.proPrecoVenda
    });
  }
  
  
  
}