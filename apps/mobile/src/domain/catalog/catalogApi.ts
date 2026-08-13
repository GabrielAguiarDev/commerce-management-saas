import { supabase } from '@services/supabase';
import { centsToReal, realToCents } from '@utils/money';

import type { ProductAPI, ProductCreateAPI, ProductUpdateAPI } from './catalogApiTypes';

/**
 * FRONTEIRA DE REDE do catálogo.
 *
 * ⚠️ ÚNICO ARQUIVO DESTE DOMÍNIO QUE FALA COM O SUPABASE.
 *
 * Traduz a tabela `products` para o contrato que o adapter espera. Duas
 * traduções merecem atenção:
 *
 *  - **dinheiro**: `price`/`cost` são `numeric` em REAIS no banco e viram
 *    inteiro em CENTAVOS aqui, na entrada (ver `@utils/money`);
 *
 *  - **`tracks_stock` → `stock_qty` nulo**: no banco, "não controla estoque" é
 *    uma coluna booleana à parte, e `stock_quantity` pode ter um número velho
 *    guardado mesmo com o controle desligado. No app, `stock_qty: null` É o
 *    "não controla" — e `0` é "acabou", que é coisa BEM diferente (badge
 *    vermelho vs. badge nenhum). Colapsar os dois aqui é o que garante que a
 *    distinção chegue inteira ao adapter.
 */

const PRODUCT_COLUMNS =
  'id, tenant_id, name, barcode, price, cost, is_service, is_favorite, is_active, stock_quantity, stock_min, tracks_stock, category, created_at';

interface ProductRow {
  id: string;
  tenant_id: string;
  name: string;
  barcode: string | null;
  price: number | null;
  cost: number | null;
  is_service: boolean | null;
  is_favorite: boolean | null;
  is_active: boolean | null;
  stock_quantity: number | null;
  stock_min: number | null;
  tracks_stock: boolean | null;
  category: string | null;
  created_at: string;
}

function toProductAPI(row: ProductRow): ProductAPI {
  const tracks = row.tracks_stock === true && row.is_service !== true;

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    sku: row.barcode,
    price_cents: realToCents(row.price),
    // `null` preservado de propósito: produto sem custo cadastrado não tem
    // custo ZERO. Zero faria a margem aparecer como 100% de lucro.
    cost_cents: row.cost == null ? null : realToCents(row.cost),
    is_service: row.is_service,
    is_favorite: row.is_favorite,
    stock_qty: tracks ? Number(row.stock_quantity ?? 0) : null,
    stock_min: tracks ? Number(row.stock_min ?? 0) : null,
    category: row.category,
    created_at: row.created_at,
    // A tabela real não tem `updated_at`. O campo continua no contrato porque o
    // adapter já o descarta — é a prova viva de que ele descarta o que a UI
    // não usa.
    updated_at: null,
  };
}

/**
 * Os produtos do catálogo.
 *
 * Só os ativos: `is_active = false` é o "pausado" do portal — o dono tirou o
 * produto de circulação sem apagar o histórico. Mostrá-lo na tela de vender
 * seria oferecer o que ele decidiu não vender mais.
 */
export async function listProducts(tenantId: string): Promise<ProductAPI[]> {
  void tenantId; // O RLS já isola pelo tenant do usuário logado.

  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return ((data ?? []) as ProductRow[]).map(toProductAPI);
}

/**
 * Cadastro rápido.
 *
 * `tracks_stock` é derivado: quem informou estoque inicial quer controlar
 * estoque. Quem deixou em branco não quer ser avisado sobre saldo — e nasceria
 * com um alerta de "sem estoque" no dia seguinte se gravássemos `true` aqui.
 */
export async function createProduct(payload: ProductCreateAPI): Promise<ProductAPI> {
  const tracksStock = !payload.is_service && payload.stock_qty !== null;

  const { data, error } = await supabase
    .from('products')
    .insert({
      tenant_id: payload.tenant_id,
      name: payload.name,
      barcode: payload.sku,
      price: centsToReal(payload.price_cents),
      cost: payload.cost_cents == null ? null : centsToReal(payload.cost_cents),
      is_service: payload.is_service,
      // Nasce favorito: é o que faz o produto recém-cadastrado aparecer na
      // grade de Vender sem exigir busca. Mesma regra do protótipo.
      is_favorite: true,
      is_active: true,
      tracks_stock: tracksStock,
      stock_quantity: tracksStock ? payload.stock_qty : 0,
      stock_min: tracksStock ? (payload.stock_min ?? 0) : 0,
    })
    .select(PRODUCT_COLUMNS)
    .single();

  if (error) throw error;
  return toProductAPI(data as ProductRow);
}

/**
 * Edição de um produto já cadastrado.
 *
 * `stock_min` só entra no `update` quando veio um número: `null` aqui é "não
 * tenho esse campo no formulário" (plano sem estoque), e não "zera o mínimo".
 * Gravar 0 nesse caso desligaria silenciosamente o aviso de estoque baixo de
 * quem só queria corrigir o preço.
 *
 * `stock_quantity` NÃO é tocado de propósito — ver `ProductUpdate`.
 */
export async function updateProduct(
  productId: string,
  payload: ProductUpdateAPI,
): Promise<ProductAPI | null> {
  const { data, error } = await supabase
    .from('products')
    .update({
      name: payload.name,
      barcode: payload.sku,
      price: centsToReal(payload.price_cents),
      cost: payload.cost_cents == null ? null : centsToReal(payload.cost_cents),
      ...(payload.stock_min === null ? {} : { stock_min: payload.stock_min }),
    })
    .eq('id', productId)
    .select(PRODUCT_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return data ? toProductAPI(data as ProductRow) : null;
}

export async function toggleFavorite(
  tenantId: string,
  productId: string,
): Promise<ProductAPI | null> {
  void tenantId;

  // Lê antes de escrever: o PostgREST não tem `set is_favorite = not
  // is_favorite`. São duas idas, e é aceitável — favoritar é gesto de uma
  // tela só, sem concorrência real (é sempre o mesmo dono, no mesmo balcão).
  const { data: current, error: readError } = await supabase
    .from('products')
    .select('is_favorite')
    .eq('id', productId)
    .maybeSingle();

  if (readError) throw readError;
  if (!current) return null;

  const { data, error } = await supabase
    .from('products')
    .update({ is_favorite: !(current.is_favorite ?? true) })
    .eq('id', productId)
    .select(PRODUCT_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return data ? toProductAPI(data as ProductRow) : null;
}
