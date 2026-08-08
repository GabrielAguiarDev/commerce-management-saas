import type { AuthErrorCode } from '@domain/session/sessionTypes';
import type { CashErrorCode } from '@domain/cash/cashTypes';
import type { CatalogErrorCode } from '@domain/catalog/catalogTypes';
import type { CostErrorCode } from '@domain/costs/costsTypes';
import type { StockErrorCode } from '@domain/stock/stockTypes';
import type { SupportErrorCode } from '@domain/support/supportTypes';
import type { SaleErrorCode } from '@domain/sales/salesTypes';
import type { TenantErrorCode } from '@domain/tenant/tenantTypes';

/**
 * The EN catalog is the SOURCE OF TRUTH for the message shape.
 *
 * `Messages` is derived from this object, and every other locale is typed as
 * `Messages` — so a key added here fails to compile until every language has
 * it, and a key deleted here stops compiling wherever it was still read. That
 * is the whole reason the catalog is a typed object literal instead of a bag
 * of loose `Record<string, string>` constants.
 *
 * Interpolation is a plain function per message rather than a `{{name}}`
 * placeholder syntax: the argument list is then part of the type, so a caller
 * that forgets an argument does not ship a half-rendered sentence.
 *
 * The `Record<XErrorCode, string>` annotations are load-bearing: a new error
 * code in a domain does not compile until it has copy in every language. An
 * error with no text degrades to "something went wrong" and disappears from
 * the radar, which is exactly what this prevents.
 */
export const en = {
  language: {
    label: 'Language',
    /** Each language is named IN ITSELF — never translated. Someone stuck in
     *  the wrong language has to be able to recognize the way out. */
    names: { 'pt-BR': 'Português (Brasil)', en: 'English' },
  },

  errors: {
    auth: {
      invalid_email: 'Check the e-mail address you typed.',
      short_password: 'The password must be at least 6 characters long.',
      invalid_credentials: 'E-mail or password do not match.',
      // The three below are ACCESS DENIALS, not failures: whoever sees them
      // typed the right password. Telling them to "check the password" would
      // have them retry forever.
      no_tenant: 'This account is not linked to a business yet. Contact support.',
      platform_admin: 'Administrator accounts use the admin panel, not the app.',
      suspended: 'This account is suspended. Talk to the owner of the business.',
      network: 'No connection to the server. Try again in a moment.',
      // The server answered fine — the phone could not STORE the session.
      // Saying "no connection" here sends you to debug the healthy side.
      storage: 'Could not save your session on this device. Contact support.',
      unknown: 'We could not sign you in right now. Contact support.',
    } as Record<AuthErrorCode, string>,

    tenant: {
      not_found: 'We could not find your business data.',
      // Deliberately does NOT say "you lack permission": the owner has every
      // reason to expect to edit their own business. The missing UPDATE policy
      // on `tenants` is our bug, not their mistake.
      forbidden: 'Saving the business details is not available yet. Contact support.',
      network: 'Could not save right now. Try again.',
      unknown: 'Something went wrong with your business data.',
    } as Record<TenantErrorCode, string>,

    catalog: {
      name_required: 'Give the product a name to save it.',
      invalid_price: 'The price cannot be negative.',
      network: 'Could not save right now. Try again.',
      unknown: 'Something went wrong with this product.',
    } as Record<CatalogErrorCode, string>,

    sale: {
      empty_cart: 'Add at least one item to sell.',
      no_payment_method: 'Choose the payment method.',
      network: 'The sale did not upload now, but it is saved on the device.',
      unknown: 'We could not record this sale.',
    } as Record<SaleErrorCode, string>,

    cash: {
      cash_closed: 'The register is not open.',
      cash_already_open: 'There is already an open shift.',
      invalid_amount: 'Enter an amount greater than zero.',
      network: 'Could not reach the server right now.',
      unknown: 'Something went wrong at the register.',
    } as Record<CashErrorCode, string>,

    stock: {
      product_required: 'Say which product is being moved.',
      invalid_quantity: 'Enter a quantity other than zero.',
      network: 'Could not record the movement right now.',
    } as Record<StockErrorCode, string>,

    cost: {
      name_required: 'Give the cost a name.',
      invalid_amount: 'Enter an amount greater than zero.',
      network: 'Could not save the cost right now.',
    } as Record<CostErrorCode, string>,

    support: {
      subject_required: 'Write a subject for the ticket.',
      description_required: 'Tell us what happened so we can help.',
      network: 'Could not send right now. Try again.',
    } as Record<SupportErrorCode, string>,
  },

  toasts: {
    recoverySent: 'We sent a recovery link to your e-mail.',
    cameraUnavailable: 'The barcode camera would open here.',
    editUnavailable: (name: string) =>
      `This would open editing for ${name}. Changing the price applies only to future sales.`,
    productCreated: (name: string) => `"${name}" created and ready to sell.`,
    saleRecorded: (total: string) => `Sale of ${total} recorded!`,
    saleSavedOffline: (total: string) =>
      `Sale of ${total} saved on the device. It will sync on its own.`,
    saleCancelled: 'Sale cancelled.',
    cashOpened: 'Register open. Have a good shift!',
    cashClosed: 'Register closed. Enjoy your rest!',
    withdrawalRecorded: 'Withdrawal recorded at the register.',
    topUpRecorded: 'Top-up recorded at the register.',
    stockUpdated: 'Stock updated.',
    costRecorded: 'Cost recorded.',
    businessSaved: 'Business details saved.',
    pdfExported: 'PDF report generated and saved to the phone.',
    spreadsheetExported: 'Spreadsheet generated and saved to the phone.',
    replySent: 'Message sent to support.',
    ticketOpened: 'Ticket opened. We reply within 1 business day.',
    // Shown when the WhatsApp channel could not be opened — either the number
    // is not readable from the database or the device refused the link. Names
    // the alternative instead of just apologising: whoever sees this is on the
    // blocked screen and has no other way through.
    whatsappUnavailable:
      'Could not open WhatsApp. Write to contato@aguiarone.com.br and we will get back to you.',
    attachmentUnavailable: 'Pick a photo from the gallery or take one now.',
    synced: 'Everything synced. Nothing was lost.',
  },

  confirms: {
    signOut: {
      title: 'Sign out of your account?',
      text: 'Sales already recorded stay saved. You will need to sign in again.',
      button: 'Sign out',
    },
    cancelSale: {
      title: 'Cancel this sale?',
      text: 'The cart items will be removed. Nothing is recorded.',
      button: 'Cancel sale',
    },
    closeCash: {
      title: 'Close the register now?',
      text: 'Once closed, the shift can no longer take sales. You can still review everything in the history.',
      button: 'Close register',
    },
  },

  connection: {
    offline: 'No connection — your sales are saved and will be synced.',
    syncing: 'Connection is back — syncing your sales…',
  },

  // The wait between signing in and the app opening, while the gate checks
  // which modules the plan includes. Deliberately says nothing about
  // "checking your plan": the user did not ask for an audit, they asked to
  // get in. See StartupLoading.
  startup: {
    title: 'Getting everything ready',
    text: 'Just a moment while we set up your business.',
    /** Read by screen readers in place of the dots, which are decorative. */
    a11yLabel: 'Opening the app',
  },

  paymentMethods: {
    cash: 'Cash',
    pix: 'Pix',
    debit_card: 'Debit card',
    credit_card: 'Credit card',
  },

  cart: {
    /** "1 item in the cart" / "3 items in the cart". */
    summary: (count: number) => `${count} ${count === 1 ? 'item' : 'items'} in the cart`,
  },

  stockStatus: {
    ok: 'In stock',
    low: 'Low',
    out: 'Out of stock',
  },

  home: {
    counters: {
      sales: (count: number) => `${count} ${count === 1 ? 'sale' : 'sales'}`,
      items: (count: number) => `${count} ${count === 1 ? 'item' : 'items'}`,
    },
    noSalesYet: 'no sales yet today',
  },

  products: {
    badge: {
      out: 'Out of stock',
      low: (quantity: number) => `${quantity} — running low`,
      inStock: (quantity: number) => `${quantity} in stock`,
    },
  },

  stockAlert: {
    /** Short phrase used in the home screen alert line. */
    out: (name: string) => `${name} is out`,
    low: (name: string) => `${name} is low`,
    /** "2 products needing attention" / "1 product needing attention". */
    heading: (count: number) =>
      `${count} ${count === 1 ? 'product needing' : 'products needing'} attention`,
  },

  units: {
    /** "24 units today" — the top seller detail line. */
    soldToday: (count: number) => `${count} ${count === 1 ? 'unit' : 'units'} today`,
  },
};

/**
 * The shape every locale must implement.
 *
 * Deliberately NOT `as const` on the object above: with literal types, the
 * English sentence itself would become the type, and `pt-BR.ts` could not
 * assign a different string to it.
 */
export type Messages = typeof en;
