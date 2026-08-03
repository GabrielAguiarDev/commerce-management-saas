import { proximoId } from "@/lib/dados/uid";
import type { FormaPagamento, PerfilKey, Venda } from "@/types/types";

/** [dias atrás, hora, [[nome, qtd, preço]], forma de pagamento, estornada] */
type LinhaVenda = [number, string, [string, number, number][], FormaPagamento, boolean];

export const FORMAS: FormaPagamento[] = ["Dinheiro", "Pix", "Débito", "Crédito"];

/** O que a pessoa precisa lembrar de conferir em cada forma, no fechamento. */
export const NOTA_FORMA: Record<FormaPagamento, string> = {
  Dinheiro: "Entra na gaveta automaticamente",
  Pix: "Cai na conta, não na gaveta",
  Débito: "Confira na maquininha",
  Crédito: "Confira na maquininha",
};

const SEED: Record<PerfilKey, LinhaVenda[]> = {
  petshop: [
    [0, "14:32", [["Banho e tosa", 1, 90]], "Pix", false],
    [0, "13:58", [["Ração premium 15kg", 1, 189.9]], "Crédito", false],
    [0, "13:20", [["Antipulgas", 1, 48.5], ["Coleira ajustável", 1, 26]], "Débito", false],
    [0, "12:44", [["Areia sanitária 4kg", 1, 32]], "Dinheiro", false],
    [0, "11:15", [["Consulta veterinária", 1, 120]], "Pix", false],
    [0, "10:40", [["Banho e tosa", 2, 90]], "Débito", false],
    [0, "09:25", [["Ração premium 15kg", 1, 189.9], ["Shampoo neutro 500ml", 1, 34.9]], "Pix", false],
    [1, "17:05", [["Brinquedo mordedor", 2, 24.9]], "Pix", true],
    [1, "16:10", [["Consulta veterinária", 1, 120], ["Antipulgas", 1, 48.5]], "Crédito", false],
    [1, "13:35", [["Ração premium 15kg", 2, 189.9]], "Pix", false],
    [1, "11:48", [["Banho e tosa", 3, 90]], "Débito", false],
    [1, "10:22", [["Areia sanitária 4kg", 2, 32], ["Coleira ajustável", 1, 26]], "Dinheiro", false],
    [2, "16:55", [["Banho e tosa", 2, 90]], "Pix", false],
    [2, "14:20", [["Ração premium 15kg", 1, 189.9]], "Crédito", false],
    [2, "12:05", [["Consulta veterinária", 2, 120]], "Pix", false],
    [2, "10:15", [["Shampoo neutro 500ml", 2, 34.9], ["Brinquedo mordedor", 2, 24.9]], "Dinheiro", false],
    [3, "17:30", [["Banho e tosa", 4, 90]], "Pix", false],
    [3, "15:40", [["Ração premium 15kg", 2, 189.9]], "Crédito", false],
    [3, "13:12", [["Antipulgas", 3, 48.5]], "Débito", false],
    [3, "11:02", [["Areia sanitária 4kg", 3, 32], ["Coleira ajustável", 2, 26]], "Dinheiro", false],
    [4, "16:40", [["Consulta veterinária", 1, 120], ["Shampoo neutro 500ml", 1, 34.9]], "Pix", false],
    [4, "14:08", [["Banho e tosa", 2, 90]], "Débito", false],
    [4, "11:55", [["Ração premium 15kg", 1, 189.9], ["Brinquedo mordedor", 3, 24.9]], "Crédito", false],
    [4, "09:50", [["Antipulgas", 2, 48.5]], "Dinheiro", false],
    [5, "18:00", [["Banho e tosa", 3, 90]], "Pix", false],
    [5, "15:22", [["Ração premium 15kg", 2, 189.9]], "Crédito", false],
    [5, "12:30", [["Consulta veterinária", 1, 120], ["Coleira ajustável", 2, 26]], "Débito", false],
    [5, "10:05", [["Areia sanitária 4kg", 4, 32]], "Dinheiro", false],
    [6, "17:15", [["Banho e tosa", 2, 90], ["Shampoo neutro 500ml", 2, 34.9]], "Pix", false],
    [6, "14:45", [["Ração premium 15kg", 1, 189.9]], "Crédito", false],
    [6, "12:18", [["Consulta veterinária", 2, 120]], "Pix", false],
    [6, "10:30", [["Antipulgas", 2, 48.5], ["Brinquedo mordedor", 2, 24.9]], "Dinheiro", false],
    [9, "15:20", [["Banho e tosa", 4, 90], ["Ração premium 15kg", 2, 189.9]], "Pix", false],
    [9, "09:30", [["Shampoo neutro 500ml", 3, 34.9], ["Consulta veterinária", 2, 120]], "Crédito", false],
    [12, "16:10", [["Ração premium 15kg", 3, 189.9], ["Antipulgas", 4, 48.5]], "Débito", false],
    [12, "11:25", [["Banho e tosa", 5, 90]], "Pix", false],
    [16, "14:50", [["Consulta veterinária", 3, 120], ["Coleira ajustável", 3, 26]], "Pix", false],
    [16, "10:40", [["Banho e tosa", 4, 90], ["Areia sanitária 4kg", 5, 32]], "Dinheiro", false],
    [21, "15:05", [["Ração premium 15kg", 4, 189.9]], "Crédito", false],
    [21, "11:10", [["Banho e tosa", 5, 90], ["Brinquedo mordedor", 4, 24.9]], "Pix", false],
    [26, "16:35", [["Consulta veterinária", 4, 120], ["Antipulgas", 3, 48.5]], "Débito", false],
    [26, "10:20", [["Banho e tosa", 6, 90], ["Shampoo neutro 500ml", 4, 34.9]], "Pix", false],
  ],
  acaraje: [
    [0, "15:10", [["Acarajé completo", 2, 12]], "Pix", false],
    [0, "14:52", [["Abará", 1, 10], ["Refrigerante lata", 1, 6]], "Dinheiro", false],
    [0, "14:31", [["Acarajé completo", 3, 12]], "Pix", false],
    [0, "14:05", [["Acarajé sem pimenta", 1, 11]], "Dinheiro", false],
    [0, "13:20", [["Acarajé completo", 5, 12], ["Refrigerante lata", 3, 6]], "Pix", false],
    [0, "12:15", [["Abará", 3, 10], ["Vatapá extra", 2, 5]], "Dinheiro", false],
    [0, "11:40", [["Acarajé completo", 6, 12], ["Água mineral", 3, 4]], "Pix", false],
    [1, "16:20", [["Acarajé completo", 4, 12], ["Água mineral", 2, 4]], "Pix", true],
    [1, "15:35", [["Acarajé completo", 7, 12], ["Refrigerante lata", 4, 6]], "Dinheiro", false],
    [1, "14:10", [["Abará", 4, 10], ["Vatapá extra", 3, 5]], "Pix", false],
    [1, "12:50", [["Acarajé sem pimenta", 5, 11]], "Dinheiro", false],
    [2, "16:05", [["Acarajé completo", 8, 12]], "Pix", false],
    [2, "14:22", [["Abará", 3, 10], ["Refrigerante lata", 3, 6]], "Dinheiro", false],
    [2, "13:00", [["Acarajé completo", 6, 12], ["Água mineral", 4, 4]], "Pix", false],
    [3, "17:10", [["Acarajé completo", 9, 12], ["Vatapá extra", 4, 5]], "Pix", false],
    [3, "15:00", [["Abará", 5, 10], ["Refrigerante lata", 5, 6]], "Dinheiro", false],
    [3, "12:35", [["Acarajé sem pimenta", 6, 11]], "Pix", false],
    [4, "16:45", [["Acarajé completo", 7, 12], ["Água mineral", 5, 4]], "Dinheiro", false],
    [4, "14:15", [["Abará", 4, 10], ["Vatapá extra", 3, 5]], "Pix", false],
    [4, "12:20", [["Acarajé completo", 5, 12], ["Refrigerante lata", 4, 6]], "Dinheiro", false],
    [5, "17:30", [["Acarajé completo", 10, 12]], "Pix", false],
    [5, "15:12", [["Abará", 6, 10], ["Refrigerante lata", 6, 6]], "Dinheiro", false],
    [5, "13:05", [["Acarajé sem pimenta", 7, 11], ["Água mineral", 4, 4]], "Pix", false],
    [6, "16:50", [["Acarajé completo", 8, 12], ["Vatapá extra", 5, 5]], "Pix", false],
    [6, "14:40", [["Abará", 5, 10], ["Refrigerante lata", 4, 6]], "Dinheiro", false],
    [6, "12:10", [["Acarajé completo", 6, 12]], "Pix", false],
    [8, "15:40", [["Acarajé completo", 12, 12], ["Refrigerante lata", 6, 6]], "Pix", false],
    [8, "12:10", [["Abará", 8, 10], ["Água mineral", 5, 4]], "Dinheiro", false],
    [11, "16:00", [["Acarajé completo", 14, 12], ["Vatapá extra", 6, 5]], "Pix", false],
    [11, "12:45", [["Acarajé sem pimenta", 9, 11]], "Dinheiro", false],
    [15, "15:25", [["Acarajé completo", 11, 12], ["Refrigerante lata", 7, 6]], "Pix", false],
    [15, "12:00", [["Abará", 7, 10], ["Vatapá extra", 4, 5]], "Dinheiro", false],
    [19, "16:15", [["Acarajé completo", 13, 12], ["Água mineral", 6, 4]], "Pix", false],
    [19, "12:30", [["Abará", 6, 10], ["Refrigerante lata", 5, 6]], "Dinheiro", false],
    [24, "15:50", [["Acarajé completo", 15, 12], ["Vatapá extra", 7, 5]], "Pix", false],
    [24, "12:20", [["Acarajé sem pimenta", 8, 11], ["Água mineral", 5, 4]], "Dinheiro", false],
  ],
};

/**
 * Além do mês corrente, semeia um mês anterior com movimento um pouco menor —
 * é o que dá base para o "comparar com o período anterior" dos Relatórios ter
 * o que comparar.
 */
export function mkVendas(perfil: PerfilKey): Venda[] {
  const base: Venda[] = SEED[perfil].map((v) => ({
    id: proximoId(),
    d: v[0],
    hora: v[1],
    pag: v[3],
    estornada: v[4],
    itens: v[2].map((i) => ({ nome: i[0], qtd: i[1], preco: i[2] })),
  }));

  const anterior: Venda[] = base
    .filter((v) => v.d > 0 && !v.estornada && v.d % 4 !== 3)
    .map((v) => ({
      id: proximoId(),
      d: v.d + 30,
      hora: v.hora,
      pag: v.pag,
      estornada: false,
      itens: v.itens.map((i) => ({ ...i })),
    }));

  return base.concat(anterior);
}
