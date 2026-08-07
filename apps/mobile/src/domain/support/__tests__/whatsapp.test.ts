import { UPGRADE_MESSAGE, sanitizePhone, whatsappLink } from '../whatsapp';

/**
 * O link do WhatsApp é o tipo de coisa que "parece certa" em revisão de código
 * e leva o cliente para um número que não existe. Estes testes são o único
 * lugar onde isso é conferido.
 */

describe('sanitizePhone', () => {
  it('mantém um número internacional já limpo', () => {
    expect(sanitizePhone('5573999935628')).toBe('5573999935628');
  });

  it('tira +, espaço, parêntese e traço', () => {
    // É assim que o número chega quando alguém o digita no painel admin. O
    // `wa.me` não abre conversa nenhuma com qualquer um desses caracteres.
    expect(sanitizePhone('+55 (73) 99993-5628')).toBe('5573999935628');
  });

  it('recusa o que não pode ser telefone', () => {
    expect(sanitizePhone('')).toBeNull();
    expect(sanitizePhone('   ')).toBeNull();
    expect(sanitizePhone('-')).toBeNull();
    expect(sanitizePhone('sem número')).toBeNull();
    // Curto demais para ter DDI + DDD + número.
    expect(sanitizePhone('99993-5628')).toBeNull();
  });

  it('trata null e undefined sem quebrar', () => {
    // Vem direto do banco, onde a chave pode não existir ou o RLS pode ter
    // filtrado a linha inteira.
    expect(sanitizePhone(null)).toBeNull();
    expect(sanitizePhone(undefined)).toBeNull();
  });

  it('aceita número estrangeiro — não presume Brasil', () => {
    expect(sanitizePhone('+1 (415) 555-0132')).toBe('14155550132');
  });
});

describe('whatsappLink', () => {
  it('monta o link no formato que o WhatsApp entende', () => {
    const url = whatsappLink('5573999935628', 'Olá');
    expect(url).toBe('https://wa.me/5573999935628?text=Ol%C3%A1');
  });

  it('codifica espaços, acentos e pontuação da mensagem padrão', () => {
    const url = whatsappLink('5573999935628');
    // Sem codificar, o link quebra no primeiro espaço e a mensagem chega pela
    // metade — ou o WhatsApp nem abre.
    expect(url).not.toContain(' ');
    expect(url).toContain('https://wa.me/5573999935628?text=');
    expect(decodeURIComponent(url.split('?text=')[1] as string)).toBe(UPGRADE_MESSAGE);
  });

  it('usa https, e não o esquema whatsapp://', () => {
    // `https://wa.me` redireciona para a loja ou para o WhatsApp Web quando o
    // app não está instalado. O esquema nativo simplesmente não abriria nada.
    expect(whatsappLink('5573999935628')).toMatch(/^https:\/\//);
  });

  it('a mensagem padrão diz o que a pessoa quer, em uma linha', () => {
    expect(UPGRADE_MESSAGE).toContain('ativar o aplicativo');
  });
});
